<script lang="ts">
    import { aboutItems } from "../lib/version";
</script>

<div
    class="flex flex-col h-full w-full @container animate-in fade-in slide-in-from-bottom-4 duration-500"
>
    {#each aboutItems as item}
        <div
            class="flex flex-1 items-center justify-between py-2 @lg:py-4 px-2 border-b border-white/5 transition-colors min-h-0"
        >
            <span
                class="text-[clamp(0.625rem,2cqi,0.75rem)] @2xl:text-[clamp(0.75rem,2.5cqi,0.875rem)] text-gray-500 uppercase tracking-widest font-black flex items-center shrink-0"
            >
                {item.label}
            </span>
            {#if "href" in item && item.href}
                <a
                    href={item.href}
                    target="_blank"
                    class="text-[clamp(0.875rem,2cqi,1.125rem)] @2xl:text-[clamp(1rem,3cqi,1.25rem)] font-bold text-blue-400 hover:text-blue-300 transition-colors break-all ml-8 flex items-center min-w-0"
                >
                    {item.value}
                </a>
            {:else}
                <span
                    class="text-[clamp(0.875rem,2cqi,1.125rem)] @2xl:text-[clamp(1rem,3cqi,1.25rem)] font-bold text-gray-200 truncate ml-8 flex items-center min-w-0"
                >
                    {item.value}
                </span>
            {/if}
        </div>
    {/each}
</div>
