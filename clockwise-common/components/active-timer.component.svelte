<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fetchWithPin, timerEvents, type TimerEventData } from "$lib/api";

    let { apiBase = "" }: { apiBase?: string } = $props();

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

<div class="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-700/30 sm:flex-row sm:items-center">
    <label
        for="active-timer-input"
        class="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-500"
        >Running:</label
    >
    <div class="flex flex-1 min-w-0 items-center gap-2">
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
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="w-5 h-5"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </button>
            {:else}
                <button
                    class="p-1.5 rounded text-yellow-500 hover:bg-white/10 transition-colors disabled:opacity-30"
                    onclick={() => sendCommand("pause")}
                    disabled={!isTimerActive || status === "overtime"}
                    title="Pause"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        class="w-5 h-5"
                    >
                        <path
                            fill-rule="evenodd"
                            d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                            clip-rule="evenodd"
                        />
                    </svg>
                </button>
            {/if}
            <div class="w-px h-5 bg-gray-700/50"></div>
            <button
                class="p-1.5 rounded text-red-500 hover:bg-white/10 transition-colors disabled:opacity-30"
                onclick={() => sendCommand("stop")}
                disabled={!isTimerActive}
                title="Stop"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="w-5 h-5"
                >
                    <path
                        fill-rule="evenodd"
                        d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>
        </div>
    </div>
</div>
