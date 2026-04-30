<script lang="ts">
    import BackIcon from "./icons/BackIcon.svelte";
    import SettingsGeneral from "./settings-general.component.svelte";
    import SettingsAppearance from "./settings-appearance.component.svelte";
    import About from "./about.component.svelte";
    import { onMount } from "svelte";
    import {
        getApiBaseUrl,
        getCleanHostname,
        fetchWithPin,
        appLocalIp,
        appAuthStatus,
        appServerPin,
        appSettings,
    } from "../lib/api";
    import { SettingsState } from "../lib/settings.state.svelte";

    let apiBase = getApiBaseUrl();

    const settings = new SettingsState();

    async function fetchSettings() {
        try {
            const res = await fetchWithPin(`${apiBase}/settings`);
            if (res.ok) {
                const data = await res.json();
                settings.loadFromBackend(data);
                appSettings.set(data);
            }
        } catch (err) {
            console.error("Failed to fetch settings:", err);
        }
    }

    async function fetchStatus() {
        try {
            const res = await fetch(`${apiBase}/security/status`);
            if (res.ok) {
                const data = await res.json();
                settings.pinEnabled = data.pinEnabled;
                appAuthStatus.set(data);
            }
        } catch (err) {
            console.error("Failed to fetch security status:", err);
        }
    }

    async function fetchServerPin() {
        try {
            const headers: Record<string, string> = {};
            if (settings.pin) {
                headers.Authorization = `PIN ${settings.pin}`;
            }

            const res = await fetch(`${apiBase}/security/pin`, {
                headers,
            });
            if (!res.ok) {
                settings.serverPin = "(not available)";
                return;
            }
            const data = await res.json();
            settings.serverPin = data.pin || "(not set)";
            appServerPin.set(settings.serverPin);
        } catch (err) {
            console.error("Failed to fetch server PIN:", err);
            settings.serverPin = "(error)";
        }
    }

    async function fetchLocalIp() {
        if (typeof window === "undefined") {
            return;
        }

        settings.localIp = getCleanHostname();

        try {
            const { invoke } = await import("@tauri-apps/api/core");
            const tauriIp = await invoke<string>("get_local_ip");
            if (tauriIp) {
                settings.localIp = tauriIp;
                appLocalIp.set(settings.localIp);
            }
        } catch (err) {
            // Fallback to hostname if Tauri is unavailable or invocation fails.
            console.debug("Tauri local IP lookup unavailable:", err);
        }
    }

    async function fetchMonitors() {
        if (
            typeof window === "undefined" ||
            !("__TAURI_INTERNALS__" in window)
        ) {
            return;
        }

        try {
            const { invoke } = await import("@tauri-apps/api/core");
            const res = await invoke<any[]>("get_monitors");
            settings.monitors = res;
        } catch (err) {
            console.error("Failed to fetch monitors:", err);
        }
    }

    async function checkAutostart() {
        try {
            const { isEnabled } = await import("@tauri-apps/plugin-autostart");
            const enabled = await isEnabled();
            settings.startAtLogin = enabled;
        } catch (err) {
            // Plugin not available or call failed (non-Windows) — keep toggle hidden
            console.debug("Autostart plugin not available:", err);
            settings.startAtLogin = null;
        }
    }

    onMount(() => {
        settings.isTauri =
            typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

        // Fetch data independently so UI can update progressively
        fetchLocalIp();
        fetchStatus();
        fetchSettings();
        fetchServerPin();
        if (settings.isTauri) {
            fetchMonitors();
            checkAutostart();
        }

        // Disable global loading shield, rely on component-level skeletons
        settings.isLoading = false;
    });

    let activeTab: "general" | "appearance" | "about" = $state("general");
</script>

<div
    class="h-screen h-[100dvh] bg-[#020617] text-white flex flex-col overflow-hidden font-sans relative"
>
    <!-- Fixed Header -->
    <div
        class="absolute top-0 left-0 right-0 p-4 lg:p-6 flex justify-between items-start z-50 pointer-events-none"
    >
        <h1
            class="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white/90"
        >
            Settings
        </h1>
        <a
            href="/"
            class="flex items-center gap-2 rounded-xl px-4 py-2 text-sm lg:text-base font-bold bg-white/5 hover:bg-white/10 active:scale-95 transition-all ring-1 ring-white/10 pointer-events-auto backdrop-blur-md"
        >
            <BackIcon width="16" height="16" strokeWidth="2.5" />
            Back
        </a>
    </div>

    <section
        class="flex-1 flex flex-col p-4 lg:p-6 py-8 lg:py-12 z-10 animate-in zoom-in-95 fade-in duration-500 ease-out pt-20 overflow-hidden"
    >
        <div class="w-full flex-1 flex flex-col overflow-hidden">
            <div
                class="flex items-center justify-center gap-12 mb-10 pointer-events-auto shrink-0 border-b border-white/5"
            >
                {#each ["general", "appearance", "about"] as tab}
                    <button
                        class="pb-4 px-2 text-sm lg:text-base font-bold transition-all relative group"
                        onclick={() => (activeTab = tab as any)}
                    >
                        <span class="transition-colors {activeTab === tab ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}">
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </span>
                        {#if activeTab === tab}
                            <div
                                class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)] animate-in slide-in-from-left-full duration-300"
                            ></div>
                        {/if}
                    </button>
                {/each}
            </div>

            <div class="flex-1 w-full relative">
                <div
                    class="absolute inset-0 overflow-y-auto custom-scrollbar pr-2 pb-8"
                >
                    {#if activeTab === "general"}
                        <SettingsGeneral {settings} />
                    {:else if activeTab === "appearance"}
                        <SettingsAppearance {settings} />
                    {:else if activeTab === "about"}
                        <div class="w-full h-full">
                            <About />
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </section>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
    }
</style>
