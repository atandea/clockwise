<script lang="ts">
    import ArrowRightIcon from "./icons/ArrowRightIcon.svelte";
    import LockIcon from "./icons/LockIcon.svelte";
    import CopyIcon from "./icons/CopyIcon.svelte";
    import PreferencesIcon from "./icons/PreferencesIcon.svelte";
    import RefreshIcon from "./icons/RefreshIcon.svelte";
    import ChevronDownIcon from "./icons/ChevronDownIcon.svelte";
    import QrCodeIcon from "./icons/QrCodeIcon.svelte";
    import { getApiBaseUrl, fetchWithPin } from "../lib/api";
    import QRCode from "qrcode";
    import { toast as globalToast } from "../lib/toast.svelte";
    import type { SettingsState } from "../lib/settings.state.svelte";

    let { settings }: { settings: SettingsState } = $props();

    let apiBase = getApiBaseUrl();

    async function toggleNetworkAccess() {
        const newValue = !settings.networkAccessEnabled;
        settings.networkAccessEnabled = newValue;
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

    async function togglePin() {
        try {
            const res = await fetch(`${apiBase}/security/toggle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: !settings.pinEnabled }),
            });
            if (res.ok) {
                const data = await res.json();
                settings.pinEnabled = data.pinEnabled;
                globalToast.success(
                    `PIN security ${settings.pinEnabled ? "enabled" : "disabled"}`,
                );
            }
        } catch (err) {
            console.error("Failed to toggle PIN security:", err);
        }
    }

    async function toggleAutoLaunch() {
        const newValue = !settings.autoLaunch;
        settings.autoLaunch = newValue;
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

    async function toggleStartAtLogin() {
        try {
            const { enable, disable, isEnabled } = await import(
                "@tauri-apps/plugin-autostart"
            );
            if (settings.startAtLogin) {
                await disable();
            } else {
                await enable();
            }
            settings.startAtLogin = await isEnabled();
            globalToast.success(
                `Launch at startup ${settings.startAtLogin ? "enabled" : "disabled"}`,
            );
        } catch (err) {
            console.error("Failed to toggle autostart:", err);
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

    async function updatePreferredMonitor(monitorName: string) {
        settings.preferredMonitor = monitorName;
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

    async function copyText(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            globalToast.success(`${label} copied`);
        } catch (err) {
            globalToast.error(`Copy failed`);
        }
    }

    let qrCodeUrl = $state("");

    $effect(() => {
        if (settings.displayUrl && settings.networkAccessEnabled) {
            let qrTarget = settings.displayUrl;
            if (
                settings.pinEnabled &&
                settings.serverPin &&
                settings.serverPin !== "(not set)" &&
                settings.serverPin !== "(not available)" &&
                settings.serverPin !== "(error)"
            ) {
                qrTarget += `?pin=${settings.serverPin}`;
            }
            QRCode.toDataURL(qrTarget, {
                margin: 2,
                width: 256,
                color: {
                    dark: "#000000",
                    light: "#ffffff",
                },
            }).then((url) => {
                qrCodeUrl = url;
            });
        }
    });
</script>

<div
    class="w-full h-full @container grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500"
>
    <!-- Left Side: All Toggles & Preferences -->
    <div class="flex flex-col h-full gap-2 @lg:gap-4">
        <!-- Network Access Toggle -->
        <div
            class="flex flex-1 items-center justify-between py-2 @lg:py-4 px-2 border-b border-white/5 last:border-0 transition-colors min-h-0"
        >
            <div class="min-w-0 flex items-center">
                <span class="text-[clamp(0.875rem,2cqi,1.125rem)] @2xl:text-[clamp(1rem,3cqi,1.25rem)] font-bold text-gray-300 block"
                    >Allow Network Access</span
                >
            </div>
            <button
                class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {settings.networkAccessEnabled
                    ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                    : 'bg-gray-800'}"
                onclick={toggleNetworkAccess}
                aria-label="Toggle Network Access"
            >
                <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {settings.networkAccessEnabled
                        ? 'translate-x-6'
                        : 'translate-x-1'} shadow-sm"
                ></span>
            </button>
        </div>

        <!-- PIN Lock Toggle -->
        <div
            class="flex flex-1 items-center justify-between py-2 @lg:py-4 px-2 border-b border-white/5 last:border-0 transition-colors min-h-0"
        >
            <div class="min-w-0 flex items-center">
                <span class="text-[clamp(0.875rem,2cqi,1.125rem)] @2xl:text-[clamp(1rem,3cqi,1.25rem)] font-bold text-gray-300 block"
                    >PIN Security</span
                >
            </div>
            <button
                class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {settings.pinEnabled
                    ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                    : 'bg-gray-800'}"
                onclick={togglePin}
                aria-label="Toggle PIN Lock"
            >
                <span
                    class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {settings.pinEnabled
                        ? 'translate-x-6'
                        : 'translate-x-1'} shadow-sm"
                ></span>
            </button>
        </div>

        {#if settings.isTauri || settings.isLoading}
            {#if settings.startAtLogin !== null}
                <!-- Launch at Startup -->
                <div
                    class="flex flex-1 items-center justify-between py-2 @lg:py-4 px-2 border-b border-white/5 last:border-0 transition-colors min-h-0"
                >
                    <div class="min-w-0 flex items-center">
                        <span class="text-[clamp(0.875rem,2cqi,1.125rem)] @2xl:text-[clamp(1rem,3cqi,1.25rem)] font-bold text-gray-300 block"
                            >Launch at Startup</span
                        >
                    </div>
                    <button
                        class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {settings.startAtLogin
                            ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                            : 'bg-gray-800'}"
                        onclick={toggleStartAtLogin}
                        aria-label="Toggle Launch at Startup"
                    >
                        <span
                            class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {settings.startAtLogin
                                ? 'translate-x-6'
                                : 'translate-x-1'} shadow-sm"
                        ></span>
                    </button>
                </div>
            {/if}

            <!-- Auto-launch Fullscreen -->
            <div
                class="flex flex-1 items-center justify-between py-2 @lg:py-4 px-2 border-b border-white/5 last:border-0 transition-colors min-h-0"
            >
                <div class="min-w-0 flex items-center">
                    <span class="text-[clamp(0.875rem,2cqi,1.125rem)] @2xl:text-[clamp(1rem,3cqi,1.25rem)] font-bold text-gray-300 block"
                        >Auto-launch Fullscreen</span
                    >
                </div>
                <button
                    class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {settings.autoLaunch
                        ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                        : 'bg-gray-800'}"
                    onclick={toggleAutoLaunch}
                    aria-label="Toggle Auto-launch"
                >
                    <span
                        class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {settings.autoLaunch
                            ? 'translate-x-6'
                            : 'translate-x-1'} shadow-sm"
                    ></span>
                </button>
            </div>

            <!-- Display Selection -->
            <div
                class="flex flex-col flex-1 justify-center gap-2 @lg:gap-4 py-2 @lg:py-4 px-2 border-b border-white/5 last:border-0 transition-colors min-h-0"
            >
                <div
                    class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                    <div class="min-w-0 flex flex-col justify-center">
                        <span
                            class="text-[clamp(0.875rem,2.5cqi,1rem)] @2xl:text-[clamp(1rem,3cqi,1.25rem)] font-semibold text-gray-300 block mb-1"
                            >Target Display</span
                        >
                        <div class="flex items-center gap-2">
                            <span
                                class="text-[11px] font-bold {settings.preferredMonitor
                                    ? settings.isMonitorOnline
                                        ? 'text-indigo-400'
                                        : 'text-red-400'
                                    : 'text-gray-500'}"
                            >
                                {settings.preferredMonitor || "Not selected"}
                            </span>
                            {#if settings.preferredMonitor}
                                <span
                                    class="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider {settings.isMonitorOnline
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-400 border border-red-500/20'}"
                                >
                                    {settings.isMonitorOnline
                                        ? "Connected"
                                        : "Offline"}
                                </span>
                            {/if}
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
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
                                class="appearance-none bg-gray-900/60 border border-white/10 rounded-xl pl-3 pr-8 py-1.5 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer min-w-[160px]"
                                value={settings.selectedMonitorCandidate}
                                onchange={(e) =>
                                    (settings.selectedMonitorCandidate =
                                        e.currentTarget.value)}
                            >
                                <option
                                    value=""
                                    disabled
                                    selected={!settings.selectedMonitorCandidate}
                                    >Select display...</option
                                >
                                {#each settings.monitors as monitor}
                                    <option
                                        value={monitor.name}
                                        class="bg-gray-900 text-white"
                                    >
                                        {monitor.name} ({monitor.width}×{monitor.height})
                                    </option>
                                {/each}
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
                                    settings.selectedMonitorCandidate,
                                )}
                            disabled={!settings.hasDiscardedChanges}
                            class="px-4 py-1.5 rounded-xl transition-all text-xs font-bold {settings.hasDiscardedChanges
                                ? 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-600/20'
                                : 'bg-white/5 text-gray-500 cursor-not-allowed opacity-50'}"
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Right Side: Connection Block -->
    <div class="flex flex-col h-full gap-2 @lg:gap-3 min-h-0">
        <div
            class="flex flex-col items-center justify-center p-4 @lg:p-6 overflow-hidden relative group/qr flex-1 gap-4 @lg:gap-6"
        >
            <div class="relative w-full max-w-[min(100%,35vh,260px)] aspect-square shrink">
                <div
                    class="p-2 @lg:p-4 bg-white rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-[filter,opacity] duration-500 {!settings.networkAccessEnabled
                        ? 'blur-md grayscale opacity-50'
                        : ''} w-full h-full flex items-center justify-center"
                >
                    {#if qrCodeUrl}
                        <img src={qrCodeUrl} alt="QR Code" class="w-full h-full object-contain" />
                    {:else}
                        <div
                            class="w-full h-full bg-gray-200 animate-pulse rounded-2xl"
                        ></div>
                    {/if}
                </div>

                {#if !settings.networkAccessEnabled}
                    <div
                        class="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                        <LockIcon
                            width="30%"
                            height="30%"
                            class="text-black/40"
                        />
                    </div>
                {/if}
            </div>

            <div class="w-full text-center space-y-1 @lg:space-y-2 shrink-0">
                {#if !settings.localIp && settings.networkAccessEnabled}
                    <div
                        class="h-3 w-32 mx-auto rounded bg-white/5 animate-pulse"
                    ></div>
                {:else}
                    <a
                        href={settings.displayUrl}
                        target="_blank"
                        class="text-[clamp(0.75rem,2.5cqi,0.875rem)] @2xl:text-[clamp(0.875rem,3cqi,1.125rem)] font-mono text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-[0.2em] break-all"
                    >
                        {settings.networkAccessEnabled
                            ? settings.displayUrl
                            : "Network Access Disabled"}
                    </a>
                {/if}

                {#if settings.pinEnabled}
                    <div class="pt-1">
                        {#if !settings.serverPin}
                            <div
                                class="h-3 w-20 mx-auto rounded bg-white/5 animate-pulse"
                            ></div>
                        {:else}
                            <span
                                class="text-[clamp(0.875rem,2.5cqi,1rem)] @2xl:text-[clamp(1rem,3cqi,1.25rem)] font-mono text-gray-400 uppercase tracking-[0.3em]"
                            >
                                PIN: <span class="text-white font-black"
                                    >{settings.serverPin}</span
                                >
                            </span>
                        {/if}
                    </div>
                {/if}

                <p
                    class="text-[clamp(0.625rem,2cqi,0.75rem)] @2xl:text-[clamp(0.75rem,2.5cqi,0.875rem)] text-gray-500 uppercase tracking-[0.3em] pt-4 @lg:pt-6 font-black opacity-50"
                >
                    {settings.networkAccessEnabled
                        ? "Scan to Connect"
                        : "Enable access to view"}
                </p>
            </div>
        </div>
    </div>
</div>
