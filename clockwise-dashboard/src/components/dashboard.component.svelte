<script lang="ts">
  import Control from "./control.component.svelte";
  import Viewer from "./viewer.component.svelte";
  import CustomTimer from "./custom-timer.component.svelte";
  import ActiveTimer from "./active-timer.component.svelte";
  import DisplaySelector from "./display-selector.component.svelte";
  import PinScreen from "./pin-screen.component.svelte";
  import Loading from "./loading.component.svelte";
  import { onMount } from "svelte";
  import { getApiBaseUrl, fetchWithPin, getPin, setPin } from "../lib/api";

  let {
    apiBase = getApiBaseUrl(),
    isTauri: isTauriInitial = false,
  }: {
    apiBase?: string;
    isTauri?: boolean;
  } = $props();

  let isTauri = $derived(
    isTauriInitial &&
      typeof window !== "undefined" &&
      "__TAURI_INTERNALS__" in window,
  );

  let localIp = $state<string>("...");
  let needsPin = $state(false);
  let serverStatus = $state<"starting" | "running" | "error">("starting");
  let errorMessage = $state("");
  let statusMessage = $state("");
  let controlComponent = $state<any>();

  async function checkSecurityStatus() {
    try {
      const res = await fetch(`${apiBase}/security/status`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      const pin = getPin();

      needsPin = data.requiresPin && !pin;

      // local devices can fetch the pin from the server; used by settings context
      if (data.local && needsPin) {
        const fetchedPin = await fetchPin();
        if (fetchedPin) {
          setPin(fetchedPin);
          needsPin = false;
        }
      }

      return !needsPin;
    } catch (err) {
      console.error("Security check failed:", err);
      return false;
    }
  }

  async function fetchPin(): Promise<string | null> {
    try {
      const res = await fetch(`${apiBase}/security/pin`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.pin;
      }
    } catch (err) {
      console.error("Failed to get PIN:", err);
    }
    return null;
  }

  async function checkServerHealth() {
    try {
      const res = await fetchWithPin(`${apiBase}/timers`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        serverStatus = "running";
        statusMessage = "";
        return true;
      }

      if (res.status === 403) {
        // Security guard triggered, PIN required for this client.
        serverStatus = "starting";
        statusMessage = "PIN required to access Clockwise dashboard.";
        return false;
      }

      serverStatus = "starting"; // Keep in starting mode while polling
      statusMessage = `Server responding with ${res.status}`;
      return false;
    } catch (err) {
      console.warn("Health check failed:", err);
      serverStatus = "starting"; // Keep in starting mode while polling
      statusMessage = "Waiting for server to respond...";
      return false;
    }
  }

  async function fetchLocalIp() {
    if (!isTauri) {
      localIp = window.location.hostname;
      return;
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      localIp = await invoke("get_local_ip");
    } catch (err) {
      console.error("Failed to get local IP:", err);
      localIp = window.location.hostname;
    }
  }

  let pollInterval = $state<any>(null);

  const startPolling = () => {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      // If we already know we need a PIN, stop polling here (PinScreen handles it)
      if (needsPin) {
        clearInterval(pollInterval);
        pollInterval = null;
        return;
      }

      // Check server health/reachability
      const ready = await checkServerHealth();
      if (ready) {
        // Server is up! Now check security status.
        const securityReady = await checkSecurityStatus();
        if (securityReady) {
          // All good!
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    }, 1500);
  };

  onMount(() => {
    fetchLocalIp();

    // Start reaching out to the server
    (async () => {
      startPolling();
    })();

    setTimeout(() => {
      if (serverStatus === "starting") {
        serverStatus = "error";
        errorMessage = "Server timeout (30s)";
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    }, 30000);

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  });
</script>

{#if needsPin}
  <PinScreen
    {apiBase}
    onSuccess={(p) => {
      setPin(p);
      needsPin = false;
      checkServerHealth().then((ready) => {
        if (!ready) startPolling();
      });
    }}
  />
{/if}

<div class="h-screen bg-[#020617] text-white flex flex-col overflow-hidden">
  <section class="flex-1 flex flex-col p-3 lg:p-4 overflow-hidden min-h-0">
    {#if serverStatus === "error"}
      <div class="flex-1 flex flex-col items-center justify-center p-4">
        <div
          class="rounded bg-red-900/50 p-6 text-red-200 border border-red-700/50 max-w-sm w-full shadow-2xl"
        >
          <p class="font-bold text-lg mb-2">Connection Error</p>
          <p
            class="text-xs opacity-80 leading-relaxed font-mono bg-black/40 p-3 rounded mb-6"
          >
            {errorMessage}
          </p>
          <button
            class="w-full py-2.5 bg-red-600 hover:bg-red-500 rounded transition-colors font-bold text-sm"
            onclick={() => window.location.reload()}
          >
            RETRY
          </button>
        </div>
      </div>
    {:else if !needsPin}
      <header
        class="shrink-0 mb-4 flex h-12 items-center justify-between rounded-lg bg-gray-800/40 border border-gray-700/30 px-4 shadow-sm"
      >
        <div class="flex items-center gap-4">
          <span
            class="h-2 w-2 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse {serverStatus === 'running' ? 'bg-green-500' : 'bg-yellow-500'}"
          ></span>
          <span
            class="text-[11px] font-bold uppercase tracking-widest {serverStatus === 'running' ? 'text-green-400' : 'text-yellow-400'}"
            >{serverStatus === 'running' ? 'Online' : 'Connecting'}</span
          >
        </div>
        <span class="flex items-center gap-2">
          <a
            href="/settings"
            class="ml-2 rounded px-2 py-1 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white"
          >
            Settings
          </a>
        </span>
      </header>

      {#if isTauri}
        <div class="shrink-0 mb-3">
          <DisplaySelector isLoading={serverStatus !== "running"} />
        </div>
      {/if}

      <div
        class="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden min-h-0"
      >
        <div
          class="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 flex-shrink-0 custom-scrollbar"
        >
          <div
            class="rounded border border-gray-700/60 bg-gray-800/60 p-3 shadow-lg"
          >
            <div
              class="relative w-full overflow-hidden rounded shadow-inner bg-black/20"
              style="aspect-ratio: 16/9;"
            >
              <Viewer
                apiBaseUrl={apiBase}
                allowFullscreen={false}
                preview={true}
                isLoading={serverStatus !== "running"}
              />
            </div>

            <ActiveTimer {apiBase} isLoading={serverStatus !== "running"} />
          </div>

          <div
            class="rounded border border-gray-700/60 bg-gray-800/60 p-3 shadow-lg mt-auto"
          >
            <CustomTimer
              {apiBase}
              onTimerCreated={() => controlComponent?.fetchTimers()}
              isLoading={serverStatus !== "running"}
            />
          </div>
        </div>

        <div
          class="w-px bg-gray-700/30 hidden lg:block"
          aria-hidden="true"
        ></div>

        <div class="flex-1 flex flex-col min-h-0">
          <Control bind:this={controlComponent} {apiBase} isLoading={serverStatus !== "running"} />
        </div>
      </div>
    {/if}
  </section>
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #374151; /* gray-700 */
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #4b5563; /* gray-600 */
  }
</style>
