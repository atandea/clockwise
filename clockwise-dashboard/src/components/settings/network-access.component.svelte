<script lang="ts">
    import ArrowRightIcon from "../icons/ArrowRightIcon.svelte";
    import CopyIcon from "../icons/CopyIcon.svelte";
    let {
        localIp,
        localAccessUrl,
        copyText,
        enabled,
        toggle,
    } = $props<{
        localIp: string;
        localAccessUrl: string;
        copyText: (value: string, label: string) => void;
        enabled: boolean;
        toggle: () => void;
    }>();

    let displayUrl = $derived(enabled ? localAccessUrl : `http://localhost:4100`);
</script>

<div
    class="group rounded-[1.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-xl p-5 shadow-2xl transition-all hover:border-white/20 flex flex-col"
>
    <div class="flex items-start gap-3 mb-4">
        <div
            class="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform"
        >
            <ArrowRightIcon width="20" height="20" />
        </div>
        <div class="flex-1">
            <h3 class="text-lg font-bold text-white">Network Access</h3>
            <p class="text-sm text-gray-400">
                {enabled
                    ? "Access Clockwise UI on your local network"
                    : "Access restricted to this computer only"}
            </p>
        </div>
    </div>

    <div class="space-y-3">
        <!-- Toggle Row -->
        <div
            class="flex h-[72px] items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
        >
            <div class="min-w-0">
                <span class="text-sm text-gray-300 block"
                    >Allow Network Access</span
                >
            </div>
            <button
                class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {enabled
                    ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                    : 'bg-gray-800'}"
                onclick={toggle}
                aria-label="Toggle Network Access"
            >
                <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {enabled
                        ? 'translate-x-6'
                        : 'translate-x-1'} shadow-sm"
                ></span>
            </button>
        </div>

        <!-- URL Row -->
        <div
            class="flex min-h-[72px] h-auto flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 rounded-2xl bg-black/40 border border-white/5 group/row hover:border-white/10 transition-colors {enabled
                ? 'opacity-100'
                : 'opacity-50'}"
        >
            <div class="min-w-0">
                <span class="text-sm text-gray-300 block mb-1 sm:mb-0"
                    >{enabled ? "Local Network URL" : "Local Access Only"}</span
                >
            </div>
            <div
                class="flex items-center justify-between sm:justify-end gap-2 min-w-0 w-full sm:w-auto"
            >
                {#if !localIp && enabled}
                    <div
                        class="h-5 w-48 rounded bg-white/5 animate-pulse"
                    ></div>
                {:else}
                    <a
                        href={displayUrl}
                        target="_blank"
                        class="text-[13px] sm:text-sm font-mono text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-tight break-words"
                    >
                        {displayUrl}
                    </a>
                    <button
                        onclick={() => copyText(displayUrl, "URL")}
                        class="p-1.5 shrink-0 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-white"
                        aria-label="Copy URL"
                    >
                        <CopyIcon width="16" height="16" />
                    </button>
                {/if}
            </div>
        </div>
    </div>
</div>
