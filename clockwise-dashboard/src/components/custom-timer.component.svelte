<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fetchWithPin } from "$lib/api";

    let {
        apiBase = "",
        onTimerCreated,
    }: {
        apiBase?: string;
        onTimerCreated?: () => void;
    } = $props();

    let inputValue = $state("5");
    let creating = $state(false);
    let error = $state<string | null>(null);
    let status = $state<"running" | "paused" | "stopped" | "overtime" | "idle">(
        "stopped",
    );
    let timerName = $state<string | null>(null);
    let evtSource: EventSource | null = $state(null);

    function formatDurationName(
        n: number,
        unit: "seconds" | "minutes" | "hours",
    ): string {
        const word =
            unit === "seconds"
                ? n === 1
                    ? "second"
                    : "seconds"
                : unit === "minutes"
                  ? n === 1
                      ? "minute"
                      : "minutes"
                  : n === 1
                    ? "hour"
                    : "hours";
        return `${n} ${word}`;
    }

    function parseInput(input: string): {
        duration: number;
        unit: "seconds" | "minutes" | "hours";
        name: string;
    } | null {
        input = input.trim();
        if (!input) return null;

        // Plain number -> minutes
        if (/^\d+$/.test(input)) {
            const val = parseInt(input, 10);
            return {
                duration: val,
                unit: "minutes",
                name: formatDurationName(val, "minutes"),
            };
        }

        // Suffixes
        const suffixMatch = input.match(/^(\d+)([smh])$/i);
        if (suffixMatch) {
            const val = parseInt(suffixMatch[1], 10);
            const unitChar = suffixMatch[2].toLowerCase();
            const unit =
                unitChar === "s"
                    ? "seconds"
                    : unitChar === "m"
                      ? "minutes"
                      : "hours";
            return {
                duration: val,
                unit: unit,
                name: formatDurationName(val, unit),
            };
        }

        // Colon notation MM:SS
        const colonMatch = input.match(/^(\d+):(\d+)$/);
        if (colonMatch) {
            const m = parseInt(colonMatch[1], 10);
            const s = parseInt(colonMatch[2], 10);
            const total = m * 60 + s;
            const parts: string[] = [];
            if (m > 0) parts.push(formatDurationName(m, "minutes"));
            if (s > 0) parts.push(formatDurationName(s, "seconds"));
            const name =
                parts.length > 0
                    ? parts.join(" ")
                    : formatDurationName(0, "seconds");
            return {
                duration: total,
                unit: "seconds",
                name,
            };
        }

        return null;
    }

    async function startCustomTimer() {
        const parsed = parseInput(inputValue);
        if (!parsed || parsed.duration <= 0) {
            error = "Invalid format. Try '5' (min), '30s', or '1:30'.";
            // Clear error after a bit if desired
            return;
        }

        creating = true;
        error = null;
        try {
            // 1. Create timer (temporary)
            const createRes = await fetch(`${apiBase}/timers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: parsed.name,
                    duration: parsed.duration,
                    unit: parsed.unit,
                    temporary: true,
                }),
            });

            if (!createRes.ok)
                throw new Error(`Create failed: ${createRes.status}`);
            const newTimer = await createRes.json();

            // 2. Start it
            const startRes = await fetch(
                `${apiBase}/timers/${encodeURIComponent(newTimer.id)}/start`,
                {
                    method: "POST",
                },
            );
            if (!startRes.ok)
                throw new Error(`Start failed: ${startRes.status}`);

            status = "running"; // Optimistic update
            timerName = parsed.name; // Optimistic update
        } catch (err: any) {
            error = err?.message ?? String(err);
        } finally {
            creating = false;
        }
    }

    async function saveCustomTimer() {
        if (!inputValue) return;
        const parsed = parseInput(inputValue);
        if (!parsed || parsed.duration <= 0) {
            error = "Invalid format. Try '5' (min), '30s', or '1:30'.";
            return;
        }
        creating = true;
        error = null;
        try {
            const res = await fetchWithPin(`${apiBase}/timers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: parsed.name,
                    duration: parsed.duration,
                    unit: parsed.unit,
                }),
            });
            if (res.ok) {
                inputValue = "";
                onTimerCreated?.();
            } else {
                const data = await res.json();
                error = data.message || "Failed to save timer";
            }
        } catch (err: any) {
            error = "Connection failed";
        } finally {
            creating = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            startCustomTimer();
        }
    }

    onMount(() => {
        // No longer tracking status in CustomTimer for "currently running"
    });

    onDestroy(() => {
        if (evtSource) {
            evtSource.close();
            evtSource = null;
        }
    });

    let isTimerActive = $derived(
        status === "running" || status === "paused" || status === "overtime",
    );
</script>

<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <label
        for="custom-timer-input"
        class="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-500"
        >New:</label
    >
    <div class="flex flex-1 min-w-0 items-center gap-2">
        <input
            id="custom-timer-input"
            type="text"
            bind:value={inputValue}
            onkeydown={handleKeydown}
            placeholder="e.g. 5m"
            class="min-w-0 flex-1 h-9 rounded bg-gray-900/50 border border-gray-700/50 px-3 text-sm text-gray-300 outline-none focus:border-green-500/50 transition-colors font-mono placeholder-gray-600"
        />
        <div
            class="flex h-9 items-center gap-0.5 bg-gray-800/80 rounded-lg p-0.5 border border-gray-700/50 shadow-sm"
        >
            <button
                class="p-1.5 rounded text-green-500 hover:bg-white/10 transition-colors disabled:opacity-30"
                onclick={startCustomTimer}
                disabled={creating}
                title="Start"
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
            <div class="w-px h-5 bg-gray-700/50"></div>
            <button
                class="p-1.5 rounded text-blue-400 hover:bg-white/10 transition-colors disabled:opacity-30"
                onclick={saveCustomTimer}
                disabled={creating}
                title="Save Template"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="w-5 h-5"
                >
                    <path
                        fill-rule="evenodd"
                        d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>
        </div>
    </div>
</div>
