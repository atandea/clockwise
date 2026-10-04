<script lang="ts">
    import RefreshIcon from "#shared/ui/icons/RefreshIcon.svelte";
    import ChevronDownIcon from "#shared/ui/icons/ChevronDownIcon.svelte";

    let {
        label,
        currentMonitor,
        isOnline,
        candidate,
        monitors,
        hasChanges,
        onRefresh,
        onConfirm,
        onCandidateChange,
    }: {
        label: string;
        currentMonitor: string;
        isOnline: boolean;
        candidate: string;
        monitors: any[];
        hasChanges: boolean;
        onRefresh: () => void;
        onConfirm: (monitorName: string) => void;
        onCandidateChange: (monitorName: string) => void;
    } = $props();
</script>

<div class="flex flex-col gap-3 py-3 px-4 transition-colors">
    <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
        <div class="min-w-0 flex flex-col justify-center">
            <span class="text-sm font-semibold text-gray-300 block mb-1"
                >{label}</span
            >
            <div class="flex items-center gap-2">
                <span
                    class="text-[11px] font-bold {currentMonitor
                        ? isOnline
                            ? 'text-indigo-400'
                            : 'text-red-400'
                        : 'text-gray-500'}"
                >
                    {currentMonitor || "Not selected"}
                </span>
                {#if currentMonitor}
                    <span
                        class="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider {isOnline
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'}"
                    >
                        {isOnline ? "Connected" : "Offline"}
                    </span>
                {/if}
            </div>
        </div>

        <div class="flex items-center gap-2">
            <button
                class="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-gray-400 hover:text-white border border-white/5"
                onclick={onRefresh}
                title="Scan for monitors"
            >
                <RefreshIcon width="14" height="14" strokeWidth="2.5" />
            </button>
            <div class="relative">
                <select
                    class="appearance-none bg-gray-900/60 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer min-w-[160px]"
                    value={candidate}
                    onchange={(e) => onCandidateChange(e.currentTarget.value)}
                >
                    <option value="" disabled selected={!candidate}
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
                </select>
                <div
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                >
                    <ChevronDownIcon
                        width="14"
                        height="14"
                        strokeWidth="2.5"
                    />
                </div>
            </div>
            <button
                onclick={() => onConfirm(candidate)}
                disabled={!hasChanges}
                class="px-4 py-1.5 rounded-xl transition-all text-xs font-bold {hasChanges
                    ? 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-600/20'
                    : 'bg-white/5 text-gray-500 cursor-not-allowed opacity-50'}"
            >
                Confirm
            </button>
        </div>
    </div>
</div>
