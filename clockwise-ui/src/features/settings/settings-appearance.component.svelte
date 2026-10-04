<script lang="ts">
    import { onMount, onDestroy, untrack } from "svelte";
    import PreviewTimer from "#features/viewer/preview-timer.component.svelte";
    import Clock from "#features/viewer/clock.component.svelte";
    import ChevronDownIcon from "#shared/ui/icons/ChevronDownIcon.svelte";
    import ToggleSwitch from "#shared/ui/toggle-switch.component.svelte";
    import type { SettingsState } from "./settings.state.svelte";

    let { settings }: { settings: SettingsState } = $props();

    let previewMode = $state<"timer" | "clock">("timer");
    let previewTime = $state(10);
    let previewTotalTime = $state(10);
    let previewProgress = $state(0);
    let previewState = $state<"running" | "paused" | "overtime" | "stopped">(
        "paused",
    );
    let previewStatus = $derived(previewState);
    let previewInterval = $state<any>(null);

    function resetPreview(duration: number = 60) {
        if (previewInterval) clearInterval(previewInterval);
        previewMode = "timer";
        previewTime = duration;
        previewTotalTime = duration;
        previewProgress = 0;
        previewState = "running";

        previewInterval = setInterval(() => {
            if (previewState === "overtime") {
                previewTime += 1;
                previewProgress = 100;
            } else if (previewTime > 0) {
                previewTime -= 1;
                previewProgress =
                    ((previewTotalTime - previewTime) / previewTotalTime) * 100;
            } else if (settings.timerAllowOvertime) {
                previewTime = 1;
                previewProgress = 100;
                previewState = "overtime";
            } else {
                previewState = "stopped";
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

    function freezeTimerPreview(duration: number = 75) {
        if (previewInterval) {
            clearInterval(previewInterval);
            previewInterval = null;
        }
        previewMode = "timer";
        previewTime = duration;
        previewTotalTime = duration;
        previewProgress = 25;
        previewState = "paused";
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
        previewState = "running";
    }

    function stopPreview() {
        freezeTimerPreview();
    }

</script>

<div
    class="w-full lg:h-full h-auto @container grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500"
>
    <!-- Left side: Preview — mirrors dashboard viewer layout -->
    <div class="flex flex-col lg:h-full h-auto gap-2 min-h-fit">
        <div
                class="flex flex-col gap-2 rounded border border-gray-700/60 bg-gray-800/60 p-2 shadow-lg lg:flex-1 lg:min-h-0 justify-between"
        >
            <div
                class="relative w-full overflow-hidden rounded shadow-inner bg-black/20 aspect-video lg:flex-1 lg:min-h-0"
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

            <div class="mt-2 pt-2 border-t border-gray-700/30">
                <div class="relative h-[64px] sm:h-[76px] rounded-2xl border border-gray-700/30 bg-gray-900/40 overflow-hidden transition-all duration-300">
                    {#if previewMode === "timer" && (previewState === "running" || previewState === "overtime")}
                        <div class="flex items-center h-full px-3 sm:px-4">
                            <button
                                type="button"
                                class="w-full h-10 sm:h-11 rounded-xl border border-red-500/20 bg-red-500/10 font-mono text-sm sm:text-base font-bold text-red-400 transition-all duration-200 enabled:hover:bg-red-500/25 enabled:active:bg-red-500/30"
                                onclick={stopPreview}
                                title="Stop preview and return to the frozen timer"
                            >Stop</button>
                        </div>
                    {:else}
                        <div class="flex items-center h-full gap-2 px-3 sm:px-4">
                            <button
                                type="button"
                                class="flex-1 h-10 sm:h-11 rounded-xl border border-blue-500/20 bg-blue-500/10 font-mono text-sm sm:text-base font-bold text-blue-400 transition-all duration-200 enabled:hover:bg-blue-500/25 enabled:active:bg-blue-500/30 {previewMode === 'timer' && previewTotalTime === 10 ? 'ring-1 ring-blue-400/50' : ''}"
                                onclick={() => resetPreview(10)}
                                title="Preview a 10 second timer"
                            >10s</button>
                            <button
                                type="button"
                                class="flex-1 h-10 sm:h-11 rounded-xl border border-blue-500/20 bg-blue-500/10 font-mono text-sm sm:text-base font-bold text-blue-400 transition-all duration-200 enabled:hover:bg-blue-500/25 enabled:active:bg-blue-500/30 {previewMode === 'timer' && previewTotalTime === 60 ? 'ring-1 ring-blue-400/50' : ''}"
                                onclick={() => resetPreview(60)}
                                title="Preview a 1 minute timer"
                            >1m</button>
                            <button
                                type="button"
                                class="flex-1 h-10 sm:h-11 rounded-xl border border-blue-500/20 bg-blue-500/10 font-mono text-sm sm:text-base font-bold text-blue-400 transition-all duration-200 enabled:hover:bg-blue-500/25 enabled:active:bg-blue-500/30 {previewMode === 'timer' && previewTotalTime === 300 ? 'ring-1 ring-blue-400/50' : ''}"
                                onclick={() => resetPreview(300)}
                                title="Preview a 5 minute timer"
                            >5m</button>
                            <button
                                type="button"
                                class="flex-1 h-10 sm:h-11 rounded-xl border border-gray-600/40 bg-gray-700/20 font-mono text-sm sm:text-base font-bold text-gray-300 transition-all duration-200 enabled:hover:bg-gray-600/35 enabled:active:bg-gray-600/45 {previewMode === 'clock' ? 'ring-1 ring-gray-300/50' : ''}"
                                onclick={showClockPreview}
                                title="Preview the clock"
                            >Clock</button>
                        </div>
                    {/if}
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
                    <ToggleSwitch
                        checked={settings.timerAllowOvertime}
                        onToggle={() => settings.toggleTimerAllowOvertime()}
                        label="Toggle Allow Overtime"
                    />
                </div>

                <!-- Progress Bar -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span class="text-sm font-bold text-gray-300"
                        >Progress Bar</span
                    >
                    <ToggleSwitch
                        checked={settings.showProgressBar}
                        onToggle={() => settings.toggleProgressBar()}
                        label="Toggle Progress Bar"
                    />
                </div>

                <!-- Current Time -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span class="text-sm font-bold text-gray-300"
                        >Current Time</span
                    >
                    <ToggleSwitch
                        checked={settings.showSecondaryClock}
                        onToggle={() => settings.toggleSecondaryClock()}
                        label="Toggle Current Time"
                    />
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
                    <ToggleSwitch
                        checked={settings.showClockSeconds}
                        onToggle={() => settings.toggleClockSeconds()}
                        label="Toggle Clock Seconds"
                    />
                </div>

                <!-- Show Date -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span class="text-sm font-bold text-gray-300"
                        >Show Date</span
                    >
                    <ToggleSwitch
                        checked={settings.showClockDate}
                        onToggle={() => settings.toggleClockDate()}
                        label="Toggle Clock Date"
                    />
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
