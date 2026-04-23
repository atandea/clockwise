<script lang="ts">
    import BackIcon from "./icons/BackIcon.svelte";
    import { onMount } from "svelte";
    import {
        getApiBaseUrl,
        getCleanHostname,
        getPin,
        fetchWithPin,
        appLocalIp,
        appAuthStatus,
        appServerPin,
        appSettings,
    } from "../lib/api";
    import NetworkAccess from "./settings/network-access.component.svelte";
    import Security from "./settings/security.component.svelte";
    import Preferences from "./settings/preferences.component.svelte";
    import About from "./settings/about.component.svelte";
    import { get } from "svelte/store";
    import { toast as globalToast } from "../lib/toast.svelte";

    let apiBase = getApiBaseUrl();
    let localIp = $state(get(appLocalIp) || "");
    let localAccessUrl = $derived(`http://${localIp || "localhost"}:4100`);
    let serverPin = $state(get(appServerPin) || "");
    let pin = $state(getPin() || "");
    let pinEnabled = $state(get(appAuthStatus)?.pinEnabled ?? true);
    let autoLaunch = $state(
        get(appSettings)?.launch_fullscreen_on_startup ?? false,
    );
    let startAtLogin: boolean | null = $state(null);
    let networkAccessEnabled = $state(
        get(appSettings)?.network_access_enabled !== false,
    );
    let isTauri = $state(false);
    let monitors = $state<any[]>([]);
    let preferredMonitor = $state(get(appSettings)?.preferred_monitor || "");
    let selectedMonitorCandidate = $state(
        get(appSettings)?.preferred_monitor || "",
    );
    let isMonitorOnline = $derived(
        preferredMonitor
            ? monitors.some((m) => m.name === preferredMonitor)
            : false,
    );
    let hasDiscardedChanges = $derived(
        selectedMonitorCandidate !== preferredMonitor,
    );
    let isLoading = $state(!get(appAuthStatus));

    async function fetchSettings() {
        try {
            const res = await fetchWithPin(`${apiBase}/settings`);
            if (res.ok) {
                const data = await res.json();
                autoLaunch = !!data.launch_fullscreen_on_startup;
                networkAccessEnabled = data.network_access_enabled !== false;
                preferredMonitor = data.preferred_monitor || "";
                selectedMonitorCandidate = preferredMonitor;
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
                pinEnabled = data.pinEnabled;
                appAuthStatus.set(data);
            }
        } catch (err) {
            console.error("Failed to fetch security status:", err);
        }
    }

    async function togglePin() {
        try {
            const res = await fetch(`${apiBase}/security/toggle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: !pinEnabled }),
            });
            if (res.ok) {
                const data = await res.json();
                pinEnabled = data.pinEnabled;
                globalToast.success(
                    `PIN security ${pinEnabled ? "enabled" : "disabled"}`,
                );
            }
        } catch (err) {
            console.error("Failed to toggle PIN security:", err);
        }
    }

    async function toggleAutoLaunch() {
        const newValue = !autoLaunch;
        autoLaunch = newValue;
        try {
            const res = await fetchWithPin(`${apiBase}/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    launch_fullscreen_on_startup: newValue,
                }),
            });
            if (res.ok) {
                globalToast.success(`Auto-launch ${newValue ? "enabled" : "disabled"}`);
            }
        } catch (err) {
            console.error("Failed to toggle auto-launch:", err);
        }
    }

    async function toggleNetworkAccess() {
        const newValue = !networkAccessEnabled;
        networkAccessEnabled = newValue;
        try {
            const res = await fetchWithPin(`${apiBase}/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    network_access_enabled: newValue,
                }),
            });
            if (res.ok) {
                globalToast.success(
                    `Network access ${newValue ? "enabled" : "disabled"}`,
                );
            }
        } catch (err) {
            console.error("Failed to toggle network access:", err);
            globalToast.error(`Failed to update network access`);
        }
    }

    async function toggleStartAtLogin() {
        try {
            const { enable, disable, isEnabled } = await import(
                "@tauri-apps/plugin-autostart"
            );
            if (startAtLogin) {
                await disable();
            } else {
                await enable();
            }
            startAtLogin = await isEnabled();
            globalToast.success(
                `Launch at startup ${startAtLogin ? "enabled" : "disabled"}`,
            );
        } catch (err) {
            console.error("Failed to toggle autostart:", err);
        }
    }

    async function checkAutostart() {
        try {
            const { isEnabled } = await import("@tauri-apps/plugin-autostart");
            const enabled = await isEnabled();
            startAtLogin = enabled;
        } catch (err) {
            // Plugin not available or call failed (non-Windows) — keep toggle hidden
            console.debug("Autostart plugin not available:", err);
            startAtLogin = null;
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
            monitors = res;
        } catch (err) {
            console.error("Failed to fetch monitors:", err);
        }
    }

    async function updatePreferredMonitor(monitorName: string) {
        preferredMonitor = monitorName;
        try {
            const res = await fetchWithPin(`${apiBase}/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    preferred_monitor: monitorName,
                }),
            });
            if (res.ok) {
                globalToast.success(`Auto-fullscreen display updated`);
            } else {
                globalToast.error(`Failed to update display`);
            }
        } catch (err) {
            console.error("Failed to update preferred monitor:", err);
            globalToast.error(`Error: ${err}`);
        }
    }

    async function fetchServerPin() {
        try {
            const headers: Record<string, string> = {};
            if (pin) {
                headers.Authorization = `PIN ${pin}`;
            }

            const res = await fetch(`${apiBase}/security/pin`, {
                headers,
            });
            if (!res.ok) {
                serverPin = "(not available)";
                return;
            }
            const data = await res.json();
            serverPin = data.pin || "(not set)";
            appServerPin.set(serverPin);
        } catch (err) {
            console.error("Failed to fetch server PIN:", err);
            serverPin = "(error)";
        }
    }

    async function fetchLocalIp() {
        if (typeof window === "undefined") {
            return;
        }

        localIp = getCleanHostname();
        localAccessUrl = `http://${localIp}:4100`;

        try {
            const { invoke } = await import("@tauri-apps/api/core");
            const tauriIp = await invoke<string>("get_local_ip");
            if (tauriIp) {
                localIp = tauriIp;
                appLocalIp.set(localIp);
            }
        } catch (err) {
            // Fallback to hostname if Tauri is unavailable or invocation fails.
            console.debug("Tauri local IP lookup unavailable:", err);
        }
    }

    onMount(() => {
        isTauri =
            typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

        // Fetch data independently so UI can update progressively
        fetchLocalIp();
        fetchStatus();
        fetchSettings();
        fetchServerPin();
        if (isTauri) {
            fetchMonitors();
            checkAutostart();
        }

        // Disable global loading shield, rely on component-level skeletons
        isLoading = false;
    });

    async function copyText(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            globalToast.success(`${label} copied`);
        } catch (err) {
            globalToast.error(`Copy failed`);
        }
    }
</script>

<div
    class="h-screen h-[100dvh] bg-[#020617] text-white flex flex-col overflow-hidden font-sans relative"
>
    <!-- Fixed Header -->
    <div
        class="absolute top-0 left-0 right-0 p-4 lg:p-6 flex justify-between items-start z-50 pointer-events-none"
    >
        <h1
            class="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent pointer-events-auto"
        >
            Settings
        </h1>
        <a
            href="/"
            class="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold bg-white/5 hover:bg-white/10 active:scale-95 transition-all ring-1 ring-white/10 pointer-events-auto backdrop-blur-md"
        >
            <BackIcon width="16" height="16" strokeWidth="2.5" />
            Back
        </a>
    </div>

    <section
        class="flex-1 flex flex-col p-4 lg:p-6 py-8 lg:py-12 overflow-y-auto z-10 custom-scrollbar animate-in zoom-in-95 fade-in duration-500 ease-out pt-20"
    >
        <div class="w-full max-w-10xl mx-auto my-auto flex flex-col">
            <div
                class="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch"
            >
                <NetworkAccess
                    {localIp}
                    {localAccessUrl}
                    {copyText}
                    enabled={networkAccessEnabled}
                    toggle={toggleNetworkAccess}
                />
                <Security {pinEnabled} {serverPin} {togglePin} {copyText} />
                {#if isTauri || isLoading}
                    <Preferences
                        {isTauri}
                        {startAtLogin}
                        {autoLaunch}
                        {monitors}
                        {preferredMonitor}
                        bind:selectedMonitorCandidate
                        {isMonitorOnline}
                        {hasDiscardedChanges}
                        {toggleStartAtLogin}
                        {toggleAutoLaunch}
                        {fetchMonitors}
                        {updatePreferredMonitor}
                    />
                {/if}
                <About />
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
