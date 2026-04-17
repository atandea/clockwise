<script lang="ts">
    import "../app.css";
    import { onMount } from "svelte";
    import { checkAuth, setPin, type AuthStatus, getApiBaseUrl } from "../lib/api";
    import PinScreen from "../components/pin-screen.component.svelte";
    import Loading from "../components/loading.component.svelte";

    let { children } = $props();
    let authStatus = $state<AuthStatus | null>(null);
    let initializing = $state(true);
    let apiError = $state(false);

    async function verifyAuth() {
        const status = await checkAuth();
        if (status) {
            authStatus = status;
            apiError = false;
        } else {
            apiError = true;
        }
        initializing = false;
    }

    onMount(() => {
        verifyAuth();
    });

    function handlePinSuccess(pin: string) {
        setPin(pin);
        initializing = true;
        verifyAuth();
    }
</script>

{#if initializing}
    <div class="h-screen bg-[#020617] flex items-center justify-center">
        <Loading />
    </div>
{:else if apiError}
    <div class="h-screen bg-[#020617] flex items-center justify-center p-4">
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
    {@render children?.()}
{/if}
