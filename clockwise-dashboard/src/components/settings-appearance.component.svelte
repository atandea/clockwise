<script lang="ts">
    import { onMount, onDestroy, untrack } from "svelte";
    import PreviewTimer from "./preview-timer.component.svelte";
    import Clock from "./clock.component.svelte";
    import ChevronDownIcon from "./icons/ChevronDownIcon.svelte";
    import type { SettingsState } from "../lib/settings.state.svelte";

    let { settings }: { settings: SettingsState } = $props();

    let previewMode = $state<"timer" | "clock">("timer");
    let previewTime = $state(10);
    let previewTotalTime = $state(10);
    let previewProgress = $state(0);
    let previewInterval = $state<any>(null);

    function resetPreview(duration: number = 60) {
        if (previewInterval) clearInterval(previewInterval);
        previewMode = "timer";
        previewTime = duration;
        previewTotalTime = duration;
        previewProgress = 0;

        previewInterval = setInterval(() => {
            if (previewTime > 0) {
                previewTime -= 1;
                previewProgress =
                    ((previewTotalTime - previewTime) / previewTotalTime) * 100;
            } else {
                clearInterval(previewInterval);
                previewInterval = null;
                // Wait 2 seconds at 0 then reset to frozen
                setTimeout(() => {
                    if (!previewInterval) {
                        previewTime = previewTotalTime;
                        previewProgress = 0;
                    }
                }, 2000);
            }
        }, 1000);
    }

    function freezeTimerPreview(duration: number = 10) {
        if (previewInterval) {
            clearInterval(previewInterval);
            previewInterval = null;
        }
        previewMode = "timer";
        previewTime = duration;
        previewTotalTime = duration;
        previewProgress = 0;
    }

    let mounted = false;
    onMount(() => {
        freezeTimerPreview(10);
        // Delay setting mounted=true to allow initial effect cycles to pass
        setTimeout(() => {
            mounted = true;
        }, 50);
    });

    // Auto-switch to Timer preview when timer settings change
    $effect(() => {
        const _trigger = [
            settings.showProgressBar,
            settings.showSecondaryClock,
        ];
        if (!mounted) return;
        untrack(() => {
            freezeTimerPreview(10);
        });
    });

    // Auto-switch to Clock preview when clock settings change
    $effect(() => {
        const _trigger = [
            settings.showClockSeconds,
            settings.showClockDate,
            settings.clockDateFormat,
        ];
        if (!mounted) return;
        untrack(() => {
            showClockPreview();
        });
    });

    onDestroy(() => {
        if (previewInterval) clearInterval(previewInterval);
    });

    function showClockPreview() {
        if (previewInterval) clearInterval(previewInterval);
        previewInterval = null;
        previewMode = "clock";
    }

    const TEST_DURATIONS = [
        { label: "10s", value: 10 },
        { label: "30s", value: 30 },
        { label: "1m", value: 60 },
        { label: "10m", value: 600 },
    ];
</script>

<div
    class="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 items-start animate-in fade-in slide-in-from-bottom-4 duration-500 px-1"
>
    <!-- Left side: Preview -->
    <div class="flex flex-col gap-4">
        <div
            class="flex flex-col gap-2 rounded border border-gray-700/60 bg-gray-800/60 p-2 shadow-lg min-h-0"
        >
            <div
                class="relative w-full overflow-hidden rounded shadow-inner bg-black/20 aspect-video"
            >
                {#if previewMode === "timer"}
                    <PreviewTimer
                        time={previewTime}
                        progress={previewProgress}
                        showProgressBar={settings.showProgressBar}
                        showSecondaryClock={settings.showSecondaryClock}
                    />
                {:else}
                    <Clock
                        showSeconds={settings.showClockSeconds}
                        showDate={settings.showClockDate}
                        dateFormat={settings.clockDateFormat}
                    />
                {/if}
            </div>
        </div>

        <!-- Test Controls -->
        <div class="flex flex-col gap-3">
            <span
                class="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] px-2"
                >Live Preview Controls</span
            >
            <div class="grid grid-cols-5 gap-2">
                {#each TEST_DURATIONS as duration}
                    <button
                        class="px-2 py-3 rounded-2xl text-xs font-bold transition-all {previewMode ===
                            'timer' &&
                        previewTotalTime === duration.value &&
                        previewInterval
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'}"
                        onclick={() => resetPreview(duration.value)}
                    >
                        {duration.label}
                    </button>
                {/each}
                <button
                    class="px-2 py-3 rounded-2xl text-xs font-bold transition-all {previewMode ===
                    'clock'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'}"
                    onclick={() => showClockPreview()}
                >
                    Clock
                </button>
            </div>
        </div>
    </div>

    <!-- Right side: Appearance Settings -->
    <div class="flex flex-col gap-8">
        <!-- Timer Settings Section -->
        <div class="flex flex-col gap-3">
            <span
                class="text-xs lg:text-sm font-black text-gray-500 uppercase tracking-[0.3em] px-2"
                >Timer Appearance</span
            >
            <div class="flex flex-col gap-2">
                <div
                    class="flex items-center justify-between py-4 px-2 border-b border-white/5 last:border-0 transition-colors"
                >
                    <div class="min-w-0">
                        <span class="text-base lg:text-lg font-bold text-gray-300 block"
                            >Progress Bar</span
                        >
                    </div>
                    <button
                        class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {settings.showProgressBar
                            ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : 'bg-gray-800'}"
                        onclick={() => settings.toggleProgressBar()}
                        aria-label="Toggle Progress Bar"
                    >
                        <span
                            class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {settings.showProgressBar
                                ? 'translate-x-6'
                                : 'translate-x-1'} shadow-sm"
                        ></span>
                    </button>
                </div>

                <div
                    class="flex items-center justify-between py-4 px-2 border-b border-white/5 last:border-0 transition-colors"
                >
                    <div class="min-w-0">
                        <span class="text-base lg:text-lg font-bold text-gray-300 block"
                            >Current Time</span
                        >
                    </div>
                    <button
                        class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {settings.showSecondaryClock
                            ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : 'bg-gray-800'}"
                        onclick={() => settings.toggleSecondaryClock()}
                        aria-label="Toggle Current Time"
                    >
                        <span
                            class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {settings.showSecondaryClock
                                ? 'translate-x-6'
                                : 'translate-x-1'} shadow-sm"
                        ></span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Clock Settings Section -->
        <div class="flex flex-col gap-3">
            <span
                class="text-xs lg:text-sm font-black text-gray-500 uppercase tracking-[0.3em] px-2"
                >Clock Appearance</span
            >
            <div class="flex flex-col gap-2">
                <div
                    class="flex items-center justify-between py-4 px-2 border-b border-white/5 last:border-0 transition-colors"
                >
                    <div class="min-w-0">
                        <span class="text-base lg:text-lg font-bold text-gray-300 block"
                            >Show Seconds</span
                        >
                    </div>
                    <button
                        class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {settings.showClockSeconds
                            ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : 'bg-gray-800'}"
                        onclick={() => settings.toggleClockSeconds()}
                        aria-label="Toggle Clock Seconds"
                    >
                        <span
                            class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {settings.showClockSeconds
                                ? 'translate-x-6'
                                : 'translate-x-1'} shadow-sm"
                        ></span>
                    </button>
                </div>

                <div
                    class="flex items-center justify-between py-4 px-2 border-b border-white/5 last:border-0 transition-colors"
                >
                    <div class="min-w-0">
                        <span class="text-base lg:text-lg font-bold text-gray-300 block"
                            >Show Date</span
                        >
                    </div>
                    <button
                        class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {settings.showClockDate
                            ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : 'bg-gray-800'}"
                        onclick={() => settings.toggleClockDate()}
                        aria-label="Toggle Clock Date"
                    >
                        <span
                            class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {settings.showClockDate
                                ? 'translate-x-6'
                                : 'translate-x-1'} shadow-sm"
                        ></span>
                    </button>
                </div>

                <div
                    class="flex flex-col gap-3 py-4 px-2 border-b border-white/5 last:border-0 transition-all duration-300"
                >
                    <label
                        for="date-format"
                        class="text-base lg:text-lg font-bold text-gray-300 block"
                        >Date Format</label
                    >
                    <div class="relative transition-all duration-300 {!settings.showClockDate ? 'opacity-40 grayscale-[0.5]' : ''}">
                        <select
                            id="date-format"
                            class="w-full appearance-none bg-gray-900/60 border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer hover:border-white/20 disabled:cursor-not-allowed"
                            value={settings.clockDateFormat}
                            disabled={!settings.showClockDate}
                            onchange={(e) =>
                                settings.setClockDateFormat(
                                    e.currentTarget.value,
                                )}
                        >
                            <option value="DD/MM/YYYY" class="bg-gray-900"
                                >DD/MM/YYYY</option
                            >
                            <option value="MM/DD/YYYY" class="bg-gray-900"
                                >MM/DD/YYYY</option
                            >
                            <option value="YYYY-MM-DD" class="bg-gray-900"
                                >YYYY-MM-DD</option
                            >
                            <option value="MMM D, YYYY" class="bg-gray-900"
                                >MMM D, YYYY</option
                            >
                        </select>
                        <div
                            class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                        >
                            <ChevronDownIcon
                                width="14"
                                height="14"
                                strokeWidth="2.5"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
