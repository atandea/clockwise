<script lang="ts">
    import { aboutItems } from "../lib/version";
</script>

<div
    class="grid grid-cols-1 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500"
>
    {#each aboutItems as item}
        <div
            class="flex items-center justify-between py-4 px-2 border-b border-white/5 transition-colors"
        >
            <span
                class="text-[11px] lg:text-xs text-gray-500 uppercase tracking-widest font-black"
            >
                {item.label}
            </span>
            {#if "href" in item && item.href}
                <a
                    href={item.href}
                    target="_blank"
                    class="text-sm lg:text-base font-bold text-blue-400 hover:text-blue-300 transition-colors break-all ml-8"
                >
                    {item.value}
                </a>
            {:else}
                <span
                    class="text-sm lg:text-base font-bold text-gray-200 truncate ml-8"
                >
                    {item.value}
                </span>
            {/if}
        </div>
    {/each}
</div>
