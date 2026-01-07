<script lang="ts">
  import Control from "./control.component.svelte";
  import Viewer from "./viewer.component.svelte";
  import CustomTimer from "./custom-timer.component.svelte";
  import ActiveTimer from "./active-timer.component.svelte";
  import DisplaySelector from "./display-selector.component.svelte";
  import PinScreen from "./pin-screen.component.svelte";
  import { onMount } from "svelte";
  import { getApiBaseUrl, fetchWithPin, getPin, setPin } from "../lib/api";

  let {
    apiBase = getApiBaseUrl(),
    isTauri = false,
  }: {
    apiBase?: string;
    isTauri?: boolean;
  } = $props();

  let localIp = $state<string>("...");
  let needsPin = $state(false);
  let serverStatus = $state<"starting" | "running" | "error">("starting");
  let errorMessage = $state("");
  let statusMessage = $state("");
  let controlComponent = $state<any>();

  async function checkSecurityStatus() {
    try {
      const res = await fetch(`${apiBase}/security/status`);
      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      const pin = getPin();

      needsPin = data.requiresPin && !pin;

      // local devices can fetch the pin from the server; used by settings context
      if (data.local) {
        await fetchPin();
      }

      return !needsPin;
    } catch (err) {
      console.error("Security check failed:", err);
      return false;
    }
  }

  async function fetchPin(): Promise<string | null> {
    try {
      const res = await fetch(`${apiBase}/security/pin`);
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

      serverStatus = "error";
      statusMessage = `Server responding with ${res.status}`;
      return false;
    } catch (err) {
      console.warn("Health check failed:", err);
      serverStatus = "error";
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

  onMount(() => {
    fetchLocalIp();

    const pollInterval = setInterval(async () => {
      const securityReady = await checkSecurityStatus();
      if (!securityReady) {
        return;
      }

      const ready = await checkServerHealth();
      if (ready) {
        clearInterval(pollInterval);
      }
    }, 1500);

    (async () => {
      const securityReady = await checkSecurityStatus();
      if (securityReady) {
        await checkServerHealth();
      }
    })();

    setTimeout(() => {
      if (serverStatus === "starting") {
        serverStatus = "error";
        errorMessage = "Server timeout (30s)";
        clearInterval(pollInterval);
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  });
</script>

{#if needsPin}
  <PinScreen
    {apiBase}
    onSuccess={(p) => {
      setPin(p);
      needsPin = false;
      checkServerHealth();
    }}
  />
{/if}

<div class="h-screen bg-[#020617] text-white flex flex-col overflow-hidden">
  <section class="flex-1 flex flex-col p-3 lg:p-4 overflow-hidden min-h-0">
    {#if serverStatus === "starting"}
      <div class="flex-1 flex flex-col items-center justify-center">
        <div
          class="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-green-500"
        ></div>
        <p class="text-gray-400 font-medium">Starting server...</p>
        {#if statusMessage}
          <p class="text-xs text-gray-500 mt-2">{statusMessage}</p>
        {/if}
      </div>
    {:else if serverStatus === "error"}
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
            class="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse"
          ></span>
          <span
            class="text-[11px] font-bold text-green-400 uppercase tracking-widest"
            >Online</span
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

      <div class="shrink-0 mb-3">
        <DisplaySelector />
      </div>

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
              />
            </div>

            <ActiveTimer {apiBase} />
          </div>

          <div
            class="rounded border border-gray-700/60 bg-gray-800/60 p-3 shadow-lg mt-auto"
          >
            <CustomTimer
              {apiBase}
              onTimerCreated={() => controlComponent?.fetchTimers()}
            />
          </div>
        </div>

        <div
          class="w-px bg-gray-700/30 hidden lg:block"
          aria-hidden="true"
        ></div>

        <div class="flex-1 flex flex-col min-h-0">
          <Control bind:this={controlComponent} {apiBase} />
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
