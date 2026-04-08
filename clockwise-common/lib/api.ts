import { writable, type Readable } from "svelte/store";

export const timerWindowOpen = writable<boolean>(false);

export interface TimerEventData {
  status: "running" | "paused" | "stopped" | "overtime" | "idle" | "error" | "connecting";
  remainingSeconds: number;
  totalSeconds: number;
  name: string;
  progressPercent: number;
  timerId: string | null;
}

export function getApiBaseUrl(): string {
    if (typeof window === "undefined") {
        return "http://localhost:4100";
    }
    const host = window.location.hostname;
    if (host === "tauri.localhost") {
        return "http://localhost:4100";
    }
    return `http://${host}:4100`;
}

export function getCleanHostname(): string {
    if (typeof window === "undefined") {
        return "localhost";
    }
    const host = window.location.hostname;
    return host === "tauri.localhost" ? "localhost" : host;
}

export function getPin(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("clockwise_pin");
}

export function setPin(pin: string) {
    if (typeof window !== "undefined") {
        sessionStorage.setItem("clockwise_pin", pin);
    }
}

export async function fetchWithPin(url: string, options: RequestInit = {}): Promise<Response> {
    const pin = getPin();
    const headers = new Headers(options.headers || {});
    if (pin) {
        headers.set("Authorization", `PIN ${pin}`);
    }
    return fetch(url, { ...options, headers });
}

// SHARED SSE STORE
const INITIAL_DATA: TimerEventData = {
  status: "idle",
  remainingSeconds: 0,
  totalSeconds: 0,
  name: "Clockwise",
  progressPercent: 0,
  timerId: null
};

const _timerEvents = writable<TimerEventData>(INITIAL_DATA);
let _eventSource: EventSource | null = null;
let _useCount = 0;

export const timerEvents: Readable<TimerEventData> = {
  subscribe: (run: (value: TimerEventData) => void) => {
    if (typeof window === "undefined") {
        return _timerEvents.subscribe(run);
    }

    if (_useCount === 0) {
      const apiBase = getApiBaseUrl();
      const pin = getPin();
      const url = new URL(`${apiBase}/timers/subscribe`, window.location.origin);
      if (pin) url.searchParams.set("pin", pin);
      
      _eventSource = new EventSource(url.toString());
      _eventSource.addEventListener("timer-tick", (e) => {
        try {
          const data = JSON.parse((e as MessageEvent).data);
          _timerEvents.set(data);
        } catch (err) {
          console.error("Failed to parse timer event", err);
        }
      });

      _eventSource.onerror = () => {
        _timerEvents.update((s: TimerEventData) => ({ ...s, status: "error" }));
      };
    }
    
    _useCount++;
    const unsubscribe = _timerEvents.subscribe(run);
    
    return () => {
      unsubscribe();
      _useCount--;
      if (_useCount === 0 && _eventSource) {
        _eventSource.close();
        _eventSource = null;
      }
    };
  }
};
