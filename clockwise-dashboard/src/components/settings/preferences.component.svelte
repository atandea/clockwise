<script lang="ts">
    import PreferencesIcon from "../icons/PreferencesIcon.svelte";
import RefreshIcon from "../icons/RefreshIcon.svelte";
import ChevronDownIcon from "../icons/ChevronDownIcon.svelte";
    let {
        isTauri,
        startAtLogin,
        autoLaunch,
        monitors,
        preferredMonitor,
        selectedMonitorCandidate = $bindable(),
        isMonitorOnline,
        hasDiscardedChanges,
        toggleStartAtLogin,
        toggleAutoLaunch,
        fetchMonitors,
        updatePreferredMonitor,
    } = $props<{
        isTauri: boolean;
        startAtLogin: boolean | null;
        autoLaunch: boolean;
        monitors: any[];
        preferredMonitor: string;
        selectedMonitorCandidate: string;
        isMonitorOnline: boolean;
        hasDiscardedChanges: boolean;
        toggleStartAtLogin: () => void;
        toggleAutoLaunch: () => void;
        fetchMonitors: () => void;
        updatePreferredMonitor: (name: string) => void;
    }>();
</script>

<div
    class="group rounded-[1.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-xl p-5 shadow-2xl transition-all hover:border-white/20 flex flex-col"
>
    <div class="flex items-start gap-3 mb-4">
        <div
            class="p-2 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform"
        >
            <PreferencesIcon width="20" height="20" />
        </div>
        <div>
            <h3 class="text-lg font-bold text-white">
                Preferences
            </h3>
            <p class="text-sm text-gray-400">
                Manage application behavior
            </p>
        </div>
    </div>

    <div class="flex-1 flex flex-col gap-3">
        {#if !monitors.length && isTauri}
            <div
                class="flex-1 rounded-2xl bg-white/5 animate-pulse h-[72px]"
            ></div>
            <div
                class="flex-1 rounded-2xl bg-white/5 animate-pulse h-[72px]"
            ></div>
            <div
                class="flex-1 rounded-2xl bg-white/5 animate-pulse h-[72px]"
            ></div>
        {:else}
            {#if startAtLogin !== null}
                <div
                    class="flex-1 flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                >
                    <div class="min-w-0">
                        <span
                            class="text-sm text-gray-300 block"
                            >Launch at Startup</span
                        >
                    </div>
                    <button
                        class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {startAtLogin
                            ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : 'bg-gray-800'}"
                        onclick={toggleStartAtLogin}
                        aria-label="Toggle Launch at Startup"
                    >
                        <span
                            class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {startAtLogin
                                ? 'translate-x-6'
                                : 'translate-x-1'} shadow-sm"
                        ></span>
                    </button>
                </div>
            {/if}

            <div
                class="flex-1 flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
            >
                <div class="min-w-0">
                    <span class="text-sm text-gray-300 block"
                        >Auto-launch Fullscreen</span
                    >
                </div>
                <button
                    class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {autoLaunch
                        ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                        : 'bg-gray-800'}"
                    onclick={toggleAutoLaunch}
                    aria-label="Toggle Auto-launch"
                >
                    <span
                        class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {autoLaunch
                            ? 'translate-x-6'
                            : 'translate-x-1'} shadow-sm"
                    ></span>
                </button>
            </div>

            <div
                class="flex-1 flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
            >
                <div class="min-w-0">
                    <span
                        class="text-sm text-gray-300 block mb-1"
                        >Display Selection</span
                    >
                    <div class="flex items-center gap-2">
                        <span
                            class="text-[11px] font-bold {preferredMonitor
                                ? isMonitorOnline
                                    ? 'text-gray-400'
                                    : 'text-red-400'
                                : 'text-gray-500'}"
                        >
                            {preferredMonitor ||
                                "None Selected"}
                        </span>
                        {#if preferredMonitor}
                            <span
                                class="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider {isMonitorOnline
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'}"
                            >
                                {isMonitorOnline
                                    ? "Connected"
                                    : "Offline"}
                            </span>
                        {/if}
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <button
                        class="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-gray-400 hover:text-white border border-white/5"
                        onclick={fetchMonitors}
                        title="Scan for monitors"
                    >
                        <RefreshIcon width="14" height="14" strokeWidth="2.5" />
                    </button>
                    <div class="relative">
                        <select
                            class="appearance-none bg-gray-900/60 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer max-w-[200px]"
                            value={selectedMonitorCandidate}
                            onchange={(e) =>
                                (selectedMonitorCandidate =
                                    e.currentTarget.value)}
                        >
                            <option
                                value=""
                                disabled
                                selected={!selectedMonitorCandidate}
                                >Select display...</option
                            >
                            {#each monitors as monitor}
                                <option
                                    value={monitor.name}
                                    class="bg-gray-900 text-white"
                                >
                                    {monitor.name} ({monitor.width}×{monitor.height})
                                </option>
                            {/each}
                            {#if monitors.length === 0}
                                <option
                                    value=""
                                    disabled
                                    class="bg-gray-900 text-gray-500"
                                    >No active displays</option
                                >
                            {/if}
                        </select>
                        <div
                            class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                        >
                            <ChevronDownIcon width="14" height="14" strokeWidth="2.5" />
                        </div>
                    </div>

                    <button
                        onclick={() =>
                            updatePreferredMonitor(
                                selectedMonitorCandidate,
                            )}
                        disabled={!hasDiscardedChanges}
                        class="px-4 py-1.5 rounded-xl transition-all text-xs font-bold shadow-lg {hasDiscardedChanges
                            ? 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-indigo-600/20'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed opacity-50'}"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>
