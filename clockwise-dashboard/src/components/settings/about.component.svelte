<script lang="ts">
    import InfoIcon from "../icons/InfoIcon.svelte";
    import { aboutItems } from "../../lib/version";
</script>

<div
    class="group rounded-[1.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-xl p-5 shadow-2xl transition-all hover:border-white/20 flex flex-col"
>
    <div class="flex items-start gap-3 mb-4">
        <div
            class="p-2 rounded-xl bg-gray-500/20 text-gray-400 group-hover:scale-110 transition-transform"
        >
            <InfoIcon width="20" height="20" />
        </div>
        <div>
            <h3 class="text-lg font-bold text-white">About</h3>
            <p class="text-sm text-gray-400">
                System information and versioning
            </p>
        </div>
    </div>

    <div class="grid grid-cols-2 gap-2 flex-1 auto-rows-fr">
        {#each aboutItems as item, i}
            <div
                class="flex flex-col justify-center p-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors {i >=
                4
                    ? 'col-span-2'
                    : ''}"
            >
                <span
                    class="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-1"
                    >{item.label}</span
                >
                {#if item.href}
                    <a
                        href={item.href}
                        target="_blank"
                        class="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors break-all"
                    >
                        {item.value}
                    </a>
                {:else}
                    <span
                        class="text-sm font-semibold text-gray-200 truncate"
                        >{item.value}</span
                    >
                {/if}
            </div>
        {/each}
    </div>
</div>
