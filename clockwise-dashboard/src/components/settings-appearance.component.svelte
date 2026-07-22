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
    let previewStatus = $state("running");
    let previewInterval = $state<any>(null);

    function resetPreview(duration: number = 60) {
        if (previewInterval) clearInterval(previewInterval);
        previewMode = "timer";
        previewTime = duration;
        previewTotalTime = duration;
        previewProgress = 0;
        previewStatus = "running";

        previewInterval = setInterval(() => {
            if (previewTime > 0) {
                previewTime -= 1;
                previewProgress =
                    ((previewTotalTime - previewTime) / previewTotalTime) * 100;
            } else {
                previewStatus = "stopped";
                clearInterval(previewInterval);
                previewInterval = null;
                // Wait 2 seconds at 0 then reset to frozen
                setTimeout(() => {
                    if (!previewInterval) {
                        freezeTimerPreview();
                    }
                }, 2000);
            }
        }, 1000);
    }

    function freezeTimerPreview(duration: number = 60) {
        if (previewInterval) {
            clearInterval(previewInterval);
            previewInterval = null;
        }
        previewMode = "timer";
        previewTime = duration;
        previewTotalTime = duration;
        previewProgress = 25;
        previewStatus = "running";
    }

    let mounted = false;
    onMount(() => {
        freezeTimerPreview();
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
            freezeTimerPreview();
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
        previewStatus = "running";
    }

    function showOvertimePreview() {
        if (previewInterval) clearInterval(previewInterval);
        previewMode = "timer";
        previewTime = 5;
        previewTotalTime = 60;
        previewProgress = 100;
        previewStatus = "overtime";

        previewInterval = setInterval(() => {
            previewTime += 1;
        }, 1000);
    }

    const TEST_DURATIONS = [
        { label: "10s", value: 10 },
        { label: "1m", value: 60 },
    ];
</script>

<div
    class="w-full lg:h-full h-auto @container grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500"
>
    <!-- Left side: Preview — mirrors dashboard viewer layout -->
    <div class="flex flex-col lg:h-full h-auto gap-2 min-h-fit">
        <div
            class="flex-1 flex flex-col gap-2 rounded border border-gray-700/60 bg-gray-800/60 p-2 shadow-lg min-h-0"
        >
            <div
                class="relative w-full overflow-hidden rounded shadow-inner bg-black/20 aspect-video"
            >
                {#if previewMode === "timer"}
                    <PreviewTimer
                        time={previewTime}
                        progress={previewProgress}
                        status={previewStatus}
                        showProgressBar={settings.showProgressBar}
                        showSecondaryClock={settings.showSecondaryClock}
                        normalColor={settings.timerNormalColor}
                        warningColor={settings.timerWarningColor}
                        overtimeColor={settings.timerOvertimeColor}
                        warningThreshold={settings.timerWarningThreshold}
                        allowOvertime={settings.timerAllowOvertime}
                    />
                {:else}
                    <Clock
                        showSeconds={settings.showClockSeconds}
                        showDate={settings.showClockDate}
                        dateFormat={settings.clockDateFormat}
                    />
                {/if}
            </div>

            <!-- Preview controls row — mirrors ActiveTimer position -->
            <div class="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-700/30">
                <span class="shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-500">Preview:</span>
                <div class="grid grid-cols-4 gap-2">
                    {#each TEST_DURATIONS as duration}
                        <button
                            class="px-1 py-2 @lg:py-3 rounded-lg text-[clamp(0.625rem,2cqi,0.75rem)] font-bold transition-all {previewMode ===
                                'timer' &&
                            previewStatus === 'running' &&
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
                        class="px-1 py-2 @lg:py-3 rounded-lg text-[clamp(0.625rem,2cqi,0.75rem)] font-bold transition-all {previewMode ===
                        'clock'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'}"
                        onclick={() => showClockPreview()}
                    >
                        Clock
                    </button>
                    <button
                        class="px-1 py-2 @lg:py-3 rounded-lg text-[clamp(0.625rem,2cqi,0.75rem)] font-bold transition-all {previewMode ===
                            'timer' && previewStatus === 'overtime'
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                            : 'bg-black/40 text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'}"
                        onclick={() => showOvertimePreview()}
                    >
                        Overtime
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Right side: Appearance Settings -->
    <div class="flex flex-col lg:h-full h-auto min-h-fit gap-3">
        <!-- Timer Appearance section -->
        <div class="rounded border border-gray-700/60 bg-gray-800/80 shadow-lg overflow-hidden">
            <div class="p-3 border-b border-gray-700/50 bg-gray-900/30">
                <h3 class="text-xs font-bold uppercase tracking-widest text-gray-400">Timer Appearance</h3>
            </div>
            <div class="divide-y divide-gray-700/30">
                <!-- Timer Colors -->
                <div
                    class="flex flex-col gap-2 py-3 px-4 transition-colors"
                >
                    <span
                        class="text-sm font-bold text-gray-300 block"
                        >Timer Colors</span
                    >

                    <div class="grid grid-cols-3 gap-2 mt-1">
                        <div class="flex flex-col items-center gap-1">
                            <label
                                for="timer-normal-color"
                                class="text-xs text-gray-400 font-medium">Normal</label
                            >
                            <input
                                id="timer-normal-color"
                                type="color"
                                class="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                value={settings.timerNormalColor}
                                onchange={(e) =>
                                    settings.setTimerNormalColor(e.currentTarget.value)}
                            />
                        </div>
                        <div class="flex flex-col items-center gap-1">
                            <label
                                for="timer-warning-color"
                                class="text-xs text-gray-400 font-medium">Warning</label
                            >
                            <input
                                id="timer-warning-color"
                                type="color"
                                class="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                value={settings.timerWarningColor}
                                onchange={(e) =>
                                    settings.setTimerWarningColor(
                                        e.currentTarget.value,
                                    )}
                            />
                        </div>
                        <div class="flex flex-col items-center gap-1">
                            <label
                                for="timer-overtime-color"
                                class="text-xs text-gray-400 font-medium"
                                >Overtime</label
                            >
                            <input
                                id="timer-overtime-color"
                                type="color"
                                class="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                                value={settings.timerOvertimeColor}
                                onchange={(e) =>
                                    settings.setTimerOvertimeColor(
                                        e.currentTarget.value,
                                    )}
                            />
                        </div>
                    </div>
                </div>

                <!-- Warning Threshold -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span class="text-sm font-bold text-gray-300"
                        >Warning Threshold (%)</span
                    >
                    <div class="relative shrink-0 w-20">
                        <input
                            type="number"
                            min="1"
                            max="99"
                            class="w-full bg-gray-900/60 border border-white/10 rounded-xl px-3 py-1 text-center text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all hover:border-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={settings.timerWarningThreshold}
                            onchange={(e) =>
                                settings.setTimerWarningThreshold(
                                    parseInt(e.currentTarget.value) || 80,
                                )}
                        />
                    </div>
                </div>

                <!-- Allow Overtime -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span class="text-sm font-bold text-gray-300"
                        >Allow Overtime</span
                    >
                    <button
                        class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {settings.timerAllowOvertime
                            ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : 'bg-gray-800'}"
                        onclick={() => settings.toggleTimerAllowOvertime()}
                        aria-label="Toggle Allow Overtime"
                    >
                        <span
                            class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {settings.timerAllowOvertime
                                ? 'translate-x-6'
                                : 'translate-x-1'} shadow-sm"
                        ></span>
                    </button>
                </div>

                <!-- Progress Bar -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span class="text-sm font-bold text-gray-300"
                        >Progress Bar</span
                    >
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

                <!-- Current Time -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span class="text-sm font-bold text-gray-300"
                        >Current Time</span
                    >
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

        <!-- Clock Appearance section -->
        <div class="rounded border border-gray-700/60 bg-gray-800/80 shadow-lg overflow-hidden">
            <div class="p-3 border-b border-gray-700/50 bg-gray-900/30">
                <h3 class="text-xs font-bold uppercase tracking-widest text-gray-400">Clock Appearance</h3>
            </div>
            <div class="divide-y divide-gray-700/30">
                <!-- Show Seconds -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span class="text-sm font-bold text-gray-300"
                        >Show Seconds</span
                    >
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

                <!-- Show Date -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span class="text-sm font-bold text-gray-300"
                        >Show Date</span
                    >
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

                <!-- Date Format -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-all duration-300 gap-4 hover:bg-white/[0.02]"
                >
                    <label
                        for="date-format"
                        class="text-sm font-bold text-gray-300"
                        >Date Format</label
                    >
                    <div
                        class="relative shrink-0 w-36 @lg:w-48 transition-all duration-300 {!settings.showClockDate
                            ? 'opacity-40 grayscale-[0.5]'
                            : ''}"
                    >
                        <select
                            id="date-format"
                            class="w-full appearance-none bg-gray-900/60 border border-white/10 rounded-xl pl-3 pr-8 py-2 text-[clamp(0.75rem,2cqi,0.875rem)] font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer hover:border-white/20 disabled:cursor-not-allowed"
                            value={settings.clockDateFormat}
                            disabled={!settings.showClockDate}
                            onchange={(e) =>
                                settings.setClockDateFormat(e.currentTarget.value)}
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
                            <ChevronDownIcon width="14" height="14" strokeWidth="2.5" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
