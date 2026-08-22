<script lang="ts">
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

    let inputValue = $state("");
    let creating = $state(false);

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

    let parsed = $derived(parseInput(inputValue));

    async function startCustomTimer() {
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
</script>

<div class="w-full py-1">
    <div class="w-full max-w-full">
        {#if isLoading}
            <div class="h-[64px] sm:h-[76px] rounded-2xl bg-white/5 animate-pulse"></div>
        {:else}
            <!-- Unified container for input and buttons mimicking the active timer design -->
            <div
                class="relative h-[64px] sm:h-[76px] rounded-2xl border border-gray-700/30 bg-gray-900/40 overflow-hidden transition-all duration-300 focus-within:border-blue-500/40 focus-within:bg-gray-900/60"
            >
                <div class="flex items-center h-full gap-3 px-4 sm:px-5">
                    <!-- Timer input -->
                    <div class="flex-1 min-w-0 flex items-center">
                        <input
                            id="custom-timer-input"
                            type="text"
                            bind:value={inputValue}
                            onkeydown={handleKeydown}
                            placeholder="e.g. 5m, 30s, 1:30"
                            aria-label="Custom timer duration"
                            class="w-full bg-transparent border-0 p-0 text-xl sm:text-2xl font-bold text-gray-100 placeholder:text-gray-500 placeholder:text-base sm:placeholder:text-lg placeholder:font-normal outline-none font-mono focus:ring-0"
                        />
                    </div>

                    <!-- Parsed preview pill -->
                    {#if parsed}
                        <div class="hidden sm:flex shrink-0 items-center font-mono text-xs font-semibold text-blue-400/80 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                            {parsed.name}
                        </div>
                    {/if}

                    <!-- Action buttons -->
                    <div class="flex items-center gap-1.5 shrink-0 ml-1">
                        <button
                            type="button"
                            class="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/25 active:bg-green-500/30 transition-all duration-200 disabled:opacity-40"
                            onclick={startCustomTimer}
                            disabled={creating}
                            title="Start"
                        >
                            {#if creating}
                                <span class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                            {:else}
                                <PlayIcon size="20" class="h-4 w-4 sm:h-5 sm:w-5" />
                            {/if}
                        </button>
                        <button
                            type="button"
                            class="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 active:bg-blue-500/30 transition-all duration-200 disabled:opacity-40"
                            onclick={saveCustomTimer}
                            disabled={creating}
                            title="Save Template"
                        >
                            <PlusIcon size="18" class="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>
