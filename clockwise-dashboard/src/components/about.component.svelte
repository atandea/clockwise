<script lang="ts">
    import { aboutItems } from "../lib/version";
</script>

<div
    class="@container animate-in fade-in slide-in-from-bottom-4 duration-500"
>
    <div class="rounded border border-gray-700/60 bg-gray-800/80 shadow-lg overflow-hidden">
        <div class="p-3 border-b border-gray-700/50 bg-gray-900/30">
            <h3 class="text-xs font-bold uppercase tracking-widest text-gray-400">About Clockwise</h3>
        </div>
        <div class="divide-y divide-gray-700/30">
            {#each aboutItems as item}
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span
                        class="text-xs text-gray-500 uppercase tracking-widest font-black flex items-center shrink-0"
                    >
                        {item.label}
                    </span>
                    {#if "href" in item && item.href}
                        <a
                            href={item.href}
                            target="_blank"
                            class="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors break-all ml-8 flex items-center min-w-0"
                        >
                            {item.value}
                        </a>
                    {:else}
                        <span
                            class="text-sm font-bold text-gray-200 truncate ml-8 flex items-center min-w-0"
                        >
                            {item.value}
                        </span>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>
