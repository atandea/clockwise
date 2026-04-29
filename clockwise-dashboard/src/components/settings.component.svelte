<script lang="ts">
    import BackIcon from "./icons/BackIcon.svelte";
    import PreferencesIcon from "./icons/PreferencesIcon.svelte";
    import RefreshIcon from "./icons/RefreshIcon.svelte";
    import ChevronDownIcon from "./icons/ChevronDownIcon.svelte";
    import LockIcon from "./icons/LockIcon.svelte";
    import CopyIcon from "./icons/CopyIcon.svelte";
    import ArrowRightIcon from "./icons/ArrowRightIcon.svelte";
    import About from "./about.component.svelte";
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
    let displayUrl = $derived(
        networkAccessEnabled ? localAccessUrl : `http://localhost:4100`,
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
                globalToast.success(
                    `Auto-launch ${newValue ? "enabled" : "disabled"}`,
                );
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
                <div
                    class="group rounded-[1.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-xl p-5 shadow-2xl transition-all hover:border-white/20 flex flex-col"
                >
                    <div class="flex items-start gap-3 mb-4">
                        <div
                            class="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform"
                        >
                            <ArrowRightIcon width="20" height="20" />
                        </div>
                        <div class="flex-1">
                            <h3 class="text-lg font-bold text-white">
                                Network Access
                            </h3>
                            <p class="text-sm text-gray-400">
                                {networkAccessEnabled
                                    ? "Access Clockwise UI on your local network"
                                    : "Access restricted to this computer only"}
                            </p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <!-- Toggle Row -->
                        <div
                            class="flex h-[72px] items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                        >
                            <div class="min-w-0">
                                <span class="text-sm text-gray-300 block"
                                    >Allow Network Access</span
                                >
                            </div>
                            <button
                                class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {networkAccessEnabled
                                    ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                                    : 'bg-gray-800'}"
                                onclick={toggleNetworkAccess}
                                aria-label="Toggle Network Access"
                            >
                                <span
                                    class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {networkAccessEnabled
                                        ? 'translate-x-6'
                                        : 'translate-x-1'} shadow-sm"
                                ></span>
                            </button>
                        </div>

                        <!-- URL Row -->
                        <div
                            class="flex min-h-[72px] h-auto flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 rounded-2xl bg-black/40 border border-white/5 group/row hover:border-white/10 transition-colors {networkAccessEnabled
                                ? 'opacity-100'
                                : 'opacity-50'}"
                        >
                            <div class="min-w-0">
                                <span
                                    class="text-sm text-gray-300 block mb-1 sm:mb-0"
                                    >{networkAccessEnabled
                                        ? "Local Network URL"
                                        : "Local Access Only"}</span
                                >
                            </div>
                            <div
                                class="flex items-center justify-between sm:justify-end gap-2 min-w-0 w-full sm:w-auto"
                            >
                                {#if !localIp && networkAccessEnabled}
                                    <div
                                        class="h-5 w-48 rounded bg-white/5 animate-pulse"
                                    ></div>
                                {:else}
                                    <a
                                        href={displayUrl}
                                        target="_blank"
                                        class="text-[13px] sm:text-sm font-mono text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-tight break-words"
                                    >
                                        {displayUrl}
                                    </a>
                                    <button
                                        onclick={() =>
                                            copyText(displayUrl, "URL")}
                                        class="p-1.5 shrink-0 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-white"
                                        aria-label="Copy URL"
                                    >
                                        <CopyIcon width="16" height="16" />
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    class="group rounded-[1.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-xl p-5 shadow-2xl transition-all hover:border-white/20 flex flex-col"
                >
                    <div class="flex items-start gap-3 mb-4">
                        <div
                            class="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform"
                        >
                            <LockIcon width="20" height="20" />
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-white">
                                Security
                            </h3>
                            <p class="text-sm text-gray-400">
                                Protect access from other devices
                            </p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <div
                            class="flex h-[72px] items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                        >
                            <div class="min-w-0">
                                <span class="text-sm text-gray-300 block"
                                    >PIN Lock</span
                                >
                            </div>
                            <button
                                class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {pinEnabled
                                    ? 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]'
                                    : 'bg-gray-800'}"
                                onclick={togglePin}
                                aria-label="Toggle PIN Lock"
                            >
                                <span
                                    class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {pinEnabled
                                        ? 'translate-x-6'
                                        : 'translate-x-1'} shadow-sm"
                                ></span>
                            </button>
                        </div>

                        <div
                            class="flex h-[72px] items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 transition-all {pinEnabled
                                ? 'opacity-100'
                                : 'opacity-30 pointer-events-none'}"
                        >
                            <div class="min-w-0">
                                <span class="text-sm text-gray-300 block"
                                    >Server PIN</span
                                >
                            </div>
                            <div class="flex items-center gap-3">
                                {#if !serverPin}
                                    <div
                                        class="h-6 w-20 rounded bg-white/5 animate-pulse"
                                    ></div>
                                {:else}
                                    <span
                                        class="text-xl font-black font-mono tracking-[0.2em] text-white underline decoration-indigo-500/50 underline-offset-4"
                                        >{serverPin}</span
                                    >
                                    <button
                                        onclick={() =>
                                            copyText(serverPin, "PIN")}
                                        class="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-white"
                                        disabled={!pinEnabled}
                                        aria-label="Copy PIN"
                                    >
                                        <CopyIcon width="16" height="16" />
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>

                {#if isTauri || isLoading}
                    <div
                        class="group rounded-[1.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-xl p-5 shadow-2xl transition-all hover:border-white/20 flex flex-col"
                    >
                        <div class="flex items-start gap-3 mb-4">
                            <div
                                class="p-2 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform"
                            >
                                <PreferencesIcon width="20" height="20" />
                            </div>
                            <div>
                                <h3 class="text-lg font-bold text-white">
                                    Preferences
                                </h3>
                                <p class="text-sm text-gray-400">
                                    Manage application behavior
                                </p>
                            </div>
                        </div>

                        <div class="flex-1 flex flex-col gap-3">
                            {#if !monitors.length && isTauri}
                                <div
                                    class="flex-1 rounded-2xl bg-white/5 animate-pulse h-[72px]"
                                ></div>
                                <div
                                    class="flex-1 rounded-2xl bg-white/5 animate-pulse h-[72px]"
                                ></div>
                                <div
                                    class="flex-1 rounded-2xl bg-white/5 animate-pulse h-[72px]"
                                ></div>
                            {:else}
                                {#if startAtLogin !== null}
                                    <div
                                        class="flex-1 flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                                    >
                                        <div class="min-w-0">
                                            <span
                                                class="text-sm text-gray-300 block"
                                                >Launch at Startup</span
                                            >
                                        </div>
                                        <button
                                            class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {startAtLogin
                                                ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                                : 'bg-gray-800'}"
                                            onclick={toggleStartAtLogin}
                                            aria-label="Toggle Launch at Startup"
                                        >
                                            <span
                                                class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {startAtLogin
                                                    ? 'translate-x-6'
                                                    : 'translate-x-1'} shadow-sm"
                                            ></span>
                                        </button>
                                    </div>
                                {/if}

                                <div
                                    class="flex-1 flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                                >
                                    <div class="min-w-0">
                                        <span
                                            class="text-sm text-gray-300 block"
                                            >Auto-launch Fullscreen</span
                                        >
                                    </div>
                                    <button
                                        class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {autoLaunch
                                            ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                            : 'bg-gray-800'}"
                                        onclick={toggleAutoLaunch}
                                        aria-label="Toggle Auto-launch"
                                    >
                                        <span
                                            class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {autoLaunch
                                                ? 'translate-x-6'
                                                : 'translate-x-1'} shadow-sm"
                                        ></span>
                                    </button>
                                </div>

                                <div
                                    class="flex-1 flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                                >
                                    <div class="min-w-0">
                                        <span
                                            class="text-sm text-gray-300 block mb-1"
                                            >Display Selection</span
                                        >
                                        <div class="flex items-center gap-2">
                                            <span
                                                class="text-[11px] font-bold {preferredMonitor
                                                    ? isMonitorOnline
                                                        ? 'text-gray-400'
                                                        : 'text-red-400'
                                                    : 'text-gray-500'}"
                                            >
                                                {preferredMonitor ||
                                                    "None Selected"}
                                            </span>
                                            {#if preferredMonitor}
                                                <span
                                                    class="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider {isMonitorOnline
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'}"
                                                >
                                                    {isMonitorOnline
                                                        ? "Connected"
                                                        : "Offline"}
                                                </span>
                                            {/if}
                                        </div>
                                    </div>

                                    <div
                                        class="flex flex-wrap items-center gap-2"
                                    >
                                        <button
                                            class="p-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-gray-400 hover:text-white border border-white/5"
                                            onclick={fetchMonitors}
                                            title="Scan for monitors"
                                        >
                                            <RefreshIcon
                                                width="14"
                                                height="14"
                                                strokeWidth="2.5"
                                            />
                                        </button>
                                        <div class="relative">
                                            <select
                                                class="appearance-none bg-gray-900/60 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer max-w-[200px]"
                                                value={selectedMonitorCandidate}
                                                onchange={(e) =>
                                                    (selectedMonitorCandidate =
                                                        e.currentTarget.value)}
                                            >
                                                <option
                                                    value=""
                                                    disabled
                                                    selected={!selectedMonitorCandidate}
                                                    >Select display...</option
                                                >
                                                {#each monitors as monitor}
                                                    <option
                                                        value={monitor.name}
                                                        class="bg-gray-900 text-white"
                                                    >
                                                        {monitor.name} ({monitor.width}×{monitor.height})
                                                    </option>
                                                {/each}
                                                {#if monitors.length === 0}
                                                    <option
                                                        value=""
                                                        disabled
                                                        class="bg-gray-900 text-gray-500"
                                                        >No active displays</option
                                                    >
                                                {/if}
                                            </select>
                                            <div
                                                class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                                            >
                                                <ChevronDownIcon
                                                    width="14"
                                                    height="14"
                                                    strokeWidth="2.5"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onclick={() =>
                                                updatePreferredMonitor(
                                                    selectedMonitorCandidate,
                                                )}
                                            disabled={!hasDiscardedChanges}
                                            class="px-4 py-1.5 rounded-xl transition-all text-xs font-bold shadow-lg {hasDiscardedChanges
                                                ? 'bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-indigo-600/20'
                                                : 'bg-white/5 text-gray-500 cursor-not-allowed opacity-50'}"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>
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
