<script lang="ts">
    import { fly, scale } from 'svelte/transition';
    import { toast } from '../lib/toast.svelte.ts';

    function getIcon(type: string) {
        switch (type) {
            case 'success':
                return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
            case 'error':
                return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-400"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            case 'warning':
                return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-400"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
            case 'info':
            default:
                return '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        }
    }

    function getStyles(type: string) {
        switch (type) {
            case 'success':
                return 'border-emerald-500/20 bg-emerald-950/80 text-emerald-100';
            case 'error':
                return 'border-red-500/20 bg-red-950/80 text-red-100';
            case 'warning':
                return 'border-yellow-500/20 bg-yellow-950/80 text-yellow-100';
            case 'info':
            default:
                return 'border-blue-500/20 bg-blue-950/80 text-blue-100';
        }
    }
</script>

<div class="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none items-end">
    {#each toast.toasts as t (t.id)}
        <div
            in:fly={{ y: 20, duration: 300 }}
            out:scale={{ duration: 200, start: 0.9 }}
            class="pointer-events-auto flex items-center gap-3 rounded-lg border p-4 shadow-xl backdrop-blur-xl transition-all {getStyles(t.type)}"
        >
            {@html getIcon(t.type)}
            <p class="text-sm font-medium">{t.message}</p>
            <button 
                onclick={() => toast.remove(t.id)}
                class="ml-2 rounded-md p-1 opacity-50 hover:opacity-100 hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close notification"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    {/each}
</div>
