<script lang="ts">
    import LockIcon from "../icons/LockIcon.svelte";
import CopyIcon from "../icons/CopyIcon.svelte";
    let {
        pinEnabled,
        serverPin,
        togglePin,
        copyText,
    } = $props<{
        pinEnabled: boolean;
        serverPin: string;
        togglePin: () => void;
        copyText: (value: string, label: string) => void;
    }>();
</script>

<div
    class="group rounded-[1.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-xl p-5 shadow-2xl transition-all hover:border-white/20 flex flex-col"
>
    <div class="flex items-start gap-3 mb-4">
        <div
            class="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform"
        >
            <LockIcon width="20" height="20" />
        </div>
        <div>
            <h3 class="text-lg font-bold text-white">Security</h3>
            <p class="text-sm text-gray-400">
                Protect access from other devices
            </p>
        </div>
    </div>

    <div class="space-y-3">
        <div
            class="flex h-[72px] items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
        >
            <div class="min-w-0">
                <span class="text-sm text-gray-300 block"
                    >PIN Lock</span
                >
            </div>
            <button
                class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {pinEnabled
                    ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                    : 'bg-gray-800'}"
                onclick={togglePin}
                aria-label="Toggle PIN Lock"
            >
                <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {pinEnabled
                        ? 'translate-x-6'
                        : 'translate-x-1'} shadow-sm"
                ></span>
            </button>
        </div>

        <div
            class="flex h-[72px] items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 transition-all {pinEnabled
                ? 'opacity-100'
                : 'opacity-30 pointer-events-none'}"
        >
            <div class="min-w-0">
                <span class="text-sm text-gray-300 block"
                    >Server PIN</span
                >
            </div>
            <div class="flex items-center gap-3">
                {#if !serverPin}
                    <div
                        class="h-6 w-20 rounded bg-white/5 animate-pulse"
                    ></div>
                {:else}
                    <span
                        class="text-xl font-black font-mono tracking-[0.2em] text-white underline decoration-indigo-500/50 underline-offset-4"
                        >{serverPin}</span
                    >
                    <button
                        onclick={() => copyText(serverPin, "PIN")}
                        class="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-white"
                        disabled={!pinEnabled}
                        aria-label="Copy PIN"
                    >
                        <CopyIcon width="16" height="16" />
                    </button>
                {/if}
            </div>
        </div>
    </div>
</div>
