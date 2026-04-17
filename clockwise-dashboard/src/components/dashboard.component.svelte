<script lang="ts">
  import Control from "./control.component.svelte";
  import Viewer from "./viewer.component.svelte";
  import CustomTimer from "./custom-timer.component.svelte";
  import ActiveTimer from "./active-timer.component.svelte";
  import DisplaySelector from "./display-selector.component.svelte";
  import { onMount } from "svelte";
  import { getApiBaseUrl, serverStatus } from "../lib/api";

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

  let status = $state<"starting" | "running" | "error">("starting");
  let errorMessage = $state("Server synchronization timeout");
  let controlComponent = $state<any>();

  onMount(() => {
    const unsubscribe = serverStatus.subscribe(v => {
      status = v;
    });

    return () => {
      unsubscribe();
    };
  });
</script>

<div class="h-screen bg-[#020617] text-white flex flex-col overflow-hidden">
  <section class="flex-1 flex flex-col p-3 lg:p-4 overflow-hidden min-h-0">
    {#if status === "error"}
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
    {:else}
      <header
        class="shrink-0 mb-4 flex h-12 items-center justify-between rounded-lg bg-gray-800/40 border border-gray-700/30 px-4 shadow-sm"
      >
        <div class="flex items-center gap-4">
          <span
            class="h-2 w-2 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] animate-pulse {status ===
            'running'
              ? 'bg-green-500'
              : 'bg-yellow-500'}"
          ></span>
          <span
            class="text-[11px] font-bold uppercase tracking-widest {status ===
            'running'
              ? 'text-green-400'
              : 'text-yellow-400'}"
            >{status === "running" ? "Online" : "Connecting"}</span
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
          <DisplaySelector isLoading={status !== "running"} />
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
                isLoading={status !== "running"}
              />
            </div>

            <ActiveTimer {apiBase} isLoading={status !== "running"} />
          </div>

          <div
            class="rounded border border-gray-700/60 bg-gray-800/60 p-3 shadow-lg mt-auto"
          >
            <CustomTimer
              {apiBase}
              onTimerCreated={() => controlComponent?.fetchTimers()}
              isLoading={status !== "running"}
            />
          </div>
        </div>

        <div
          class="w-px bg-gray-700/30 hidden lg:block"
          aria-hidden="true"
        ></div>

        <div class="flex-1 flex flex-col min-h-0">
          <Control
            bind:this={controlComponent}
            {apiBase}
            isLoading={status !== "running"}
          />
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
