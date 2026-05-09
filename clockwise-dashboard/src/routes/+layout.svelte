<script lang="ts">
    import "../app.css";
    import { onMount } from "svelte";
    import { checkAuth, setPin, type AuthStatus, getApiBaseUrl, serverStatus, appSettings, fetchWithPin } from "../lib/api";
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

                // If authorized or no pin required, fetch initial settings before rendering
                if (!status.requiresPin) {
                    try {
                        const res = await fetchWithPin(`${getApiBaseUrl()}/settings`);
                        if (res.ok) {
                            const data = await res.json();
                            appSettings.set(data);
                        }
                    } catch (e) {
                        console.error("Failed to fetch initial settings:", e);
                    }
                }

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
        // Auto-read PIN from URL query param (e.g. from QR code scan)
        const urlParams = new URLSearchParams(window.location.search);
        const urlPin = urlParams.get("pin");
        
        if (urlPin) {
            setPin(urlPin);
            // Strip the pin param from the URL for cleanliness
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("pin");
            window.history.replaceState({}, "", cleanUrl.toString());
        }

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
    {:else if initializing}
        <div class="flex-1 flex items-center justify-center p-4">
            <Loading />
        </div>
    {:else if authStatus?.requiresPin}
        <PinScreen apiBase={getApiBaseUrl()} onSuccess={handlePinSuccess} />
    {:else}
        {@render children?.()}
    {/if}
    
    <ToastContainer />
</div>
