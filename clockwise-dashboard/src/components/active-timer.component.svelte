<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fetchWithPin, timerEvents, type TimerEventData } from "$lib/api";
    import PlayIcon from "./icons/PlayIcon.svelte";
    import PauseIcon from "./icons/PauseIcon.svelte";
    import StopIcon from "./icons/StopIcon.svelte";

    let { apiBase = "", isLoading = false }: { apiBase?: string; isLoading?: boolean } = $props();

    let storeData = $state<TimerEventData | null>(null);
    let unsubscribe: (() => void) | null = null;

    let status = $derived(storeData?.status ?? "stopped");
    let timerName = $derived(storeData?.name ?? null);

    async function sendCommand(action: "stop" | "pause" | "resume") {
        try {
            await fetchWithPin(`${apiBase}/timers/${action}`, { method: "POST" });
        } catch (err: any) {
            console.error(err);
        }
    }

    onMount(() => {
        unsubscribe = timerEvents.subscribe((data) => {
            storeData = data;
        });
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });

    let isTimerActive = $derived(
        status === "running" || status === "paused" || status === "overtime",
    );

    let displayValue = $derived.by(() => {
        if (status === "overtime") return "Overtime";
        if (isTimerActive && timerName) return timerName;
        return "Clock";
    });
</script>

<div class="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-700/30 sm:flex-row sm:items-center">
    <label
        for="active-timer-input"
        class="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-500"
        >Running:</label
    >
    <div class="flex flex-1 min-w-0 items-center gap-2">
        {#if isLoading}
            <div class="min-w-0 flex-1 h-9 rounded bg-white/5 animate-pulse"></div>
            <div class="h-9 w-24 rounded-lg bg-white/5 animate-pulse"></div>
        {:else}
            <input
                id="active-timer-input"
                type="text"
                readonly
                value={displayValue}
                class="min-w-0 flex-1 h-9 rounded bg-gray-900/50 border border-gray-700/50 px-3 text-sm text-gray-300 outline-none font-mono focus:border-gray-600 transition-colors"
                class:text-gray-500={!isTimerActive}
            />
            <div
                class="flex h-9 items-center bg-gray-800/80 rounded-lg p-0.5 border border-gray-700/50 shadow-sm gap-0.5"
            >
                {#if status === "paused"}
                    <button
                        class="p-1.5 rounded text-green-500 hover:bg-white/10 transition-colors disabled:opacity-30"
                        onclick={() => sendCommand("resume")}
                        disabled={!isTimerActive}
                        title="Resume"
                    >
                        <PlayIcon size="24" />
                    </button>
                {:else}
                    <button
                        class="p-1.5 rounded text-yellow-500 hover:bg-white/10 transition-colors disabled:opacity-30"
                        onclick={() => sendCommand("pause")}
                        disabled={!isTimerActive || status === "overtime"}
                        title="Pause"
                    >
                        <PauseIcon size="24" />
                    </button>
                {/if}
                <div class="w-px h-5 bg-gray-700/50"></div>
                <button
                    class="p-1.5 rounded text-red-500 hover:bg-white/10 transition-colors disabled:opacity-30"
                    onclick={() => sendCommand("stop")}
                    disabled={!isTimerActive}
                    title="Stop"
                >
                    <StopIcon size="24" />
                </button>
            </div>
        {/if}
    </div>
</div>
