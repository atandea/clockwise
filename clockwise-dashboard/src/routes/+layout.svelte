<script lang="ts">
    import "../app.css";
    import { onMount } from "svelte";
    import { checkAuth, setPin, type AuthStatus, getApiBaseUrl, serverStatus } from "../lib/api";
    import PinScreen from "../components/pin-screen.component.svelte";
    import Loading from "../components/loading.component.svelte";
    import ToastContainer from "../components/toast-container.component.svelte";

    let { children } = $props();
    let authStatus = $state<AuthStatus | null>(null);
    let initializing = $state(true);
    let apiError = $state(false);

    async function verifyAuth(retries = 15) {
        serverStatus.set("starting");
        for (let i = 0; i < retries; i++) {
            const status = await checkAuth();
            if (status) {
                authStatus = status;
                apiError = false;
                initializing = false;
                serverStatus.set("running");
                return;
            }
            // Faster polling at start
            await new Promise(resolve => setTimeout(resolve, i < 5 ? 500 : 1000));
        }
        apiError = true;
        initializing = false;
        serverStatus.set("error");
    }

    onMount(() => {
        verifyAuth();
    });

    function handlePinSuccess(pin: string) {
        setPin(pin);
        initializing = true;
        verifyAuth(1);
    }
</script>

<div class="h-screen bg-[#020617] text-white flex flex-col overflow-hidden">
    {#if apiError}
        <div class="flex-1 flex items-center justify-center p-4">
            <div class="rounded-xl border border-red-900/50 bg-red-900/20 p-8 text-center max-w-sm">
                <h2 class="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
                <p class="text-gray-400 text-sm mb-6">Unable to connect to Clockwise server.</p>
                <button 
                    onclick={() => { initializing = true; verifyAuth(); }}
                    class="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition-all"
                >
                    Retry
                </button>
            </div>
        </div>
    {:else if authStatus?.requiresPin}
        <PinScreen apiBase={getApiBaseUrl()} onSuccess={handlePinSuccess} />
    {:else}
        <!-- Render children immediately, passing the connection status via context or props if needed -->
        <!-- For now, we render children and they handle the 'connecting' state via authStatus being null -->
        {@render children?.()}
        
        {#if initializing}
            <div class="fixed bottom-4 right-4 flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full shadow-2xl z-50">
                <div class="h-2 w-2 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
                <span class="text-[10px] font-bold uppercase tracking-widest text-yellow-500/80">Connecting to Server</span>
            </div>
        {/if}
    {/if}
    
    <ToastContainer />
</div>
