<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import { fetchWithPin, timerEvents, type TimerEventData } from "$lib/api";
    import { toast } from "$lib/toast.svelte.ts";
    import PlayIcon from "./icons/PlayIcon.svelte";
    import PauseIcon from "./icons/PauseIcon.svelte";
    import StopIcon from "./icons/StopIcon.svelte";
    import PlusIcon from "./icons/PlusIcon.svelte";

    let {
        apiBase = "",
        isLoading = false,
        onTimerCreated,
    }: {
        apiBase?: string;
        isLoading?: boolean;
        onTimerCreated?: () => void;
    } = $props();

    let storeData = $state<TimerEventData | null>(null);
    let unsubscribe: (() => void) | null = null;

    let status = $derived(storeData?.status ?? "stopped");
    let timerName = $derived(storeData?.name ?? null);
    let remainingSeconds = $derived(storeData?.remainingSeconds ?? 0);
    let totalSeconds = $derived(storeData?.totalSeconds ?? 0);
    let progressPercent = $derived(storeData?.progressPercent ?? 0);

    let isTimerActive = $derived(
        status === "running" || status === "paused" || status === "overtime",
    );

    let isOvertime = $derived(status === "overtime");
    let isPaused = $derived(status === "paused");

    // Color scheme based on timer state
    let accentColor = $derived(
        isOvertime ? "red" : isPaused ? "yellow" : "green",
    );

    let cardBorderClass = $derived(
        accentColor === "red"
            ? "border-red-500/30"
            : accentColor === "yellow"
              ? "border-yellow-500/30"
              : "border-green-500/30",
    );

    let labelColorClass = $derived(
        accentColor === "red"
            ? "text-red-400/70"
            : accentColor === "yellow"
              ? "text-yellow-400/70"
              : "text-green-400/70",
    );

    let countdownColorClass = $derived(
        accentColor === "red"
            ? "text-red-400"
            : accentColor === "yellow"
              ? "text-yellow-400"
              : "text-green-400",
    );

    // Background fill acts as progress bar
    let bgFillPercent = $derived(
        isOvertime ? 100 : Math.min(Math.max(progressPercent, 0), 100),
    );

    let bgFillColor = $derived(
        accentColor === "red"
            ? "rgba(239,68,68,0.10)"
            : accentColor === "yellow"
              ? "rgba(234,179,8,0.08)"
              : "rgba(34,197,94,0.08)",
    );

    function formatTime(seconds: number): string {
        const abs = Math.abs(seconds);
        const h = Math.floor(abs / 3600);
        const m = Math.floor((abs % 3600) / 60);
        const s = abs % 60;
        const sign = seconds < 0 ? "-" : "";

        if (h > 0) {
            return `${sign}${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
        return `${sign}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    // End time tracking for active timer
    let stableEndTime = $state<Date | null>(null);
    let lastTimerId = $state<string | null>(null);
    let lastStatus = $state<string>("stopped");

    $effect(() => {
        const currentTimerId = storeData?.timerId ?? null;

        if (!isTimerActive) {
            stableEndTime = null;
            lastTimerId = null;
            lastStatus = status;
            return;
        }

        if (status === "overtime") {
            if (!stableEndTime) {
                stableEndTime = new Date(Date.now() - remainingSeconds * 1000);
            }
        } else if (status === "paused") {
            stableEndTime = new Date(Date.now() + remainingSeconds * 1000);
        } else if (status === "running") {
            const projected = Date.now() + remainingSeconds * 1000;
            if (
                !stableEndTime ||
                currentTimerId !== lastTimerId ||
                lastStatus === "paused" ||
                Math.abs(stableEndTime.getTime() - projected) > 2500
            ) {
                stableEndTime = new Date(projected);
            }
        }

        lastTimerId = currentTimerId;
        lastStatus = status;
    });

    function formatEndTime(date: Date | null): string {
        if (!date) return "";
        const hours = date.getHours().toString().padStart(2, "0");
        const minutes = date.getMinutes().toString().padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    let formattedEndTime = $derived(formatEndTime(stableEndTime));

    async function sendCommand(action: "stop" | "pause" | "resume") {
        try {
            await fetchWithPin(`${apiBase}/timers/${action}`, {
                method: "POST",
            });
            if (action === "stop") {
                inputValue = "";
            }
        } catch (err: any) {
            console.error(err);
        }
    }

    // Custom timer logic for idle state
    let inputValue = $state("");
    let creating = $state(false);

    let previousActive = false;
    $effect(() => {
        if (previousActive && !isTimerActive) {
            inputValue = "";
        }
        previousActive = isTimerActive;
    });

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
            inputValue = "";
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

    onMount(() => {
        unsubscribe = timerEvents.subscribe((data) => {
            storeData = data;
        });
    });

    onDestroy(() => {
        if (unsubscribe) unsubscribe();
    });
</script>

<div class="w-full py-1">
    <div class="w-full max-w-full">
        {#if isLoading}
            <!-- Skeleton loader matching container style -->
            <div
                class="h-[64px] sm:h-[76px] rounded-2xl bg-white/5 animate-pulse"
            ></div>
        {:else}
            <!-- Unified container for both active running timer and custom timer entry -->
            <div
                class="relative h-[64px] sm:h-[76px] rounded-2xl border overflow-hidden transition-all duration-500 {isTimerActive
                    ? cardBorderClass
                    : 'bg-gray-900/40 border-gray-700/30 focus-within:border-blue-500/40 focus-within:bg-gray-900/60'}"
            >
                {#if isTimerActive}
                    <!-- Active timer content -->
                    <div
                        class="absolute inset-0 w-full h-full"
                        in:fade={{ duration: 300 }}
                        out:fade={{ duration: 300 }}
                    >
                        <!-- Background progress fill -->
                        <div
                            class="absolute inset-0 w-full h-full transition-all duration-700 ease-out"
                            style="width: {bgFillPercent}%; background-color: {bgFillColor};"
                        ></div>

                        <!-- Content row (above the fill) -->
                        <div
                            class="absolute inset-0 z-10 flex items-center h-full gap-3 px-4 sm:px-5"
                        >
                            <!-- Timer info with end time placed after the timer name -->
                            <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                                <span
                                    class="text-[10px] font-bold uppercase tracking-widest transition-colors duration-500 {labelColorClass}"
                                >
                                    {isOvertime
                                        ? "Overtime"
                                        : isPaused
                                          ? "Paused"
                                          : "Running"}
                                </span>
                                <div class="flex items-baseline gap-2 min-w-0">
                                    <span
                                        class="text-sm sm:text-base font-semibold text-gray-200 truncate"
                                    >
                                        {timerName ?? "Timer"}
                                    </span>
                                    {#if formattedEndTime}
                                        <span
                                            class="text-xs sm:text-base font-medium text-gray-400 shrink-0"
                                        >
                                            ({isOvertime
                                                ? `Ended at ${formattedEndTime}`
                                                : isPaused
                                                  ? `Ends ~${formattedEndTime}`
                                                  : `Ends at ${formattedEndTime}`})
                                        </span>
                                    {/if}
                                </div>
                            </div>

                            <!-- Countdown display and controls -->
                            <div class="shrink-0 flex items-center gap-3">
                                <div
                                    class="shrink-0 font-mono text-2xl sm:text-3xl font-bold tabular-nums tracking-tight transition-colors duration-500 {countdownColorClass}"
                                >
                                    {#if isOvertime}
                                        <span
                                            class="inline-flex items-center gap-1 sm:gap-1.5 leading-none overtime-blink"
                                        >
                                            <span>+</span>
                                            <span
                                                >{formatTime(
                                                    remainingSeconds,
                                                )}</span
                                            >
                                        </span>
                                    {:else}
                                        {formatTime(remainingSeconds)}
                                    {/if}
                                </div>

                                <!-- Control buttons -->
                                <div
                                    class="flex items-center gap-1.5 shrink-0 ml-1"
                                >
                                    {#if isPaused}
                                        <button
                                            type="button"
                                            class="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/25 active:bg-green-500/30 transition-all duration-200"
                                            onclick={() =>
                                                sendCommand("resume")}
                                            title="Resume"
                                        >
                                            <PlayIcon
                                                size="20"
                                                class="h-4 w-4 sm:h-5 sm:w-5"
                                            />
                                        </button>
                                    {:else}
                                        <button
                                            type="button"
                                            class="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/25 active:bg-yellow-500/30 transition-all duration-200 disabled:opacity-30"
                                            onclick={() => sendCommand("pause")}
                                            disabled={isOvertime}
                                            title="Pause"
                                        >
                                            <PauseIcon
                                                size="20"
                                                class="h-4 w-4 sm:h-5 sm:w-5"
                                            />
                                        </button>
                                    {/if}
                                    <button
                                        type="button"
                                        class="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/25 active:bg-red-500/30 transition-all duration-200"
                                        onclick={() => sendCommand("stop")}
                                        title="Stop"
                                    >
                                        <StopIcon
                                            size="18"
                                            class="h-3.5 w-3.5 sm:h-4 sm:w-4"
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                {:else}
                    <!-- Custom timer content (idle state) -->
                    <div
                        class="absolute inset-0 w-full h-full flex items-center gap-3 px-4 sm:px-5"
                        in:fade={{ duration: 300 }}
                        out:fade={{ duration: 300 }}
                    >
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
                            <div
                                class="hidden sm:flex shrink-0 items-center font-mono text-xs font-semibold text-blue-400/80 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg"
                            >
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
                                    <span
                                        class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
                                    ></span>
                                {:else}
                                    <PlayIcon
                                        size="20"
                                        class="h-4 w-4 sm:h-5 sm:w-5"
                                    />
                                {/if}
                            </button>
                            <button
                                type="button"
                                class="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/25 active:bg-blue-500/30 transition-all duration-200 disabled:opacity-40"
                                onclick={saveCustomTimer}
                                disabled={creating}
                                title="Save Template"
                            >
                                <PlusIcon
                                    size="18"
                                    class="h-3.5 w-3.5 sm:h-4 sm:w-4"
                                />
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    @keyframes overtime-blink {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.5;
        }
    }
    .overtime-blink {
        animation: overtime-blink 2s ease-in-out infinite;
    }
</style>
