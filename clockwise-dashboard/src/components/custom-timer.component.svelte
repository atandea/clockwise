<script lang="ts">
    import { onDestroy } from "svelte";
    import { fetchWithPin } from "$lib/api";
    import { toast } from "$lib/toast.svelte.ts";
    import PlayIcon from "./icons/PlayIcon.svelte";
    import PlusIcon from "./icons/PlusIcon.svelte";

    let {
        apiBase = "",
        onTimerCreated,
        isLoading = false,
    }: {
        apiBase?: string;
        onTimerCreated?: () => void;
        isLoading?: boolean;
    } = $props();

    let inputValue = $state("5");
    let creating = $state(false);
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

        if (/^\d+$/.test(input)) {
            const val = parseInt(input, 10);
            return {
                duration: val,
                unit: "minutes",
                name: formatDurationName(val, "minutes"),
            };
        }

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
            toast.error("Invalid format. Try '5' (min), '30s', or '1:30'.");
            return;
        }

        creating = true;
        try {
            const createRes = await fetchWithPin(`${apiBase}/timers`, {
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

            const startRes = await fetchWithPin(
                `${apiBase}/timers/${encodeURIComponent(newTimer.id)}/start`,
                {
                    method: "POST",
                },
            );
            if (!startRes.ok)
                throw new Error(`Start failed: ${startRes.status}`);
        } catch (err: any) {
            toast.error(err?.message ?? String(err));
        } finally {
            creating = false;
        }
    }

    async function saveCustomTimer() {
        if (!inputValue) return;
        const parsed = parseInput(inputValue);
        if (!parsed || parsed.duration <= 0) {
            toast.error("Invalid format. Try '5' (min), '30s', or '1:30'.");
            return;
        }
        creating = true;
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
                toast.error(data.message || "Failed to save timer");
            }
        } catch (err: any) {
            toast.error("Connection failed");
        } finally {
            creating = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            startCustomTimer();
        }
    }

    onDestroy(() => {
        if (evtSource) {
            evtSource.close();
            evtSource = null;
        }
    });
</script>

<div class="w-full py-3">
    <div class="w-full max-w-full">

        {#if isLoading}
            <div class="flex flex-row items-center gap-2">
                <div class="min-w-0 flex-1 h-12 sm:h-14 rounded-2xl bg-white/5 animate-pulse"></div>
                <div class="flex items-center gap-2 shrink-0">
                    <div class="h-12 sm:h-14 w-12 sm:w-14 rounded-2xl bg-white/5 animate-pulse"></div>
                    <div class="h-12 sm:h-14 w-12 sm:w-14 rounded-2xl bg-white/5 animate-pulse"></div>
                </div>
            </div>
        {:else}
            <div class="flex flex-row items-center gap-2">
                <input
                    id="custom-timer-input"
                    type="text"
                    bind:value={inputValue}
                    onkeydown={handleKeydown}
                    placeholder="e.g. 5m"
                    class="min-w-0 flex-1 h-12 sm:h-14 rounded-2xl bg-gray-900/60 border border-gray-700/60 px-4 sm:px-5 text-lg sm:text-xl font-bold text-white text-center outline-none focus:border-green-500/70 transition-colors font-mono placeholder:text-gray-500 placeholder:font-normal"
                />
                <div class="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        class="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-40"
                        onclick={startCustomTimer}
                        disabled={creating}
                        title="Start"
                    >
                        <PlayIcon size="24" class="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                    <button
                        type="button"
                        class="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors disabled:opacity-40"
                        onclick={saveCustomTimer}
                        disabled={creating}
                        title="Save Template"
                    >
                        <PlusIcon size="24" class="h-5 w-5 sm:h-6 sm:w-6" />
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>
