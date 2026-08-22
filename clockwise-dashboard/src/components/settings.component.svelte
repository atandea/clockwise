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

    const tabs = [
        { id: "general" as const, label: "General" },
        { id: "appearance" as const, label: "Appearance" },
        { id: "about" as const, label: "About" },
    ];
</script>

<div
    class="h-screen h-[100dvh] bg-[#020617] text-white flex flex-col overflow-hidden font-sans relative"
>
    <section
        class="flex-1 flex flex-col p-3 lg:p-4 overflow-hidden min-h-0 animate-in zoom-in-95 fade-in duration-500 ease-out"
    >
        <!-- Header bar — matches dashboard header style -->
        <header
            class="shrink-0 mb-3 flex h-12 items-center justify-between rounded-lg bg-gray-800/40 border border-gray-700/30 px-4 shadow-sm"
        >
            <h1
                class="text-xs font-bold uppercase tracking-widest text-gray-400"
            >
                Settings
            </h1>
            <a
                href="/"
                class="flex items-center gap-1 rounded pl-1.5 pr-2.5 py-1 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors"
            >
                <BackIcon width="14" height="14" strokeWidth="2.5" />
                Back
            </a>
        </header>

        <!-- Tab navigation — inside a dashboard-style container -->
        <div
            class="shrink-0 mb-3 rounded-lg bg-gray-800/60 border border-gray-700/60 shadow-lg overflow-hidden"
        >
            <div class="flex items-center px-1">
                {#each tabs as tab}
                    <button
                        class="relative px-5 py-3 text-xs font-bold uppercase tracking-widest transition-all group"
                        onclick={() => (activeTab = tab.id)}
                    >
                        <span
                            class="transition-colors {activeTab === tab.id
                                ? 'text-white'
                                : 'text-gray-500 group-hover:text-gray-300'}"
                        >
                            {tab.label}
                        </span>
                        {#if activeTab === tab.id}
                            <div
                                class="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                            ></div>
                        {/if}
                    </button>
                {/each}
            </div>
        </div>

        <!-- Content area — flat styling without double-nested container -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
            {#if activeTab === "general"}
                <SettingsGeneral {settings} />
            {:else if activeTab === "appearance"}
                <SettingsAppearance {settings} />
            {:else if activeTab === "about"}
                <About />
            {/if}
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
