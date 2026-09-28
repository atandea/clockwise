<script lang="ts">
    import LockIcon from "./icons/LockIcon.svelte";
    import QrCodeIcon from "./icons/QrCodeIcon.svelte";
    import ToggleSwitch from "./toggle-switch.component.svelte";
    import MonitorSelector from "./monitor-selector.component.svelte";
    import QRCode from "qrcode";
    import type { SettingsState } from "../lib/settings.state.svelte";

    let { settings }: { settings: SettingsState } = $props();

    async function copyText(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            // Clipboard API may not be available
        }
    }

    let qrCodeUrl = $state("");

    $effect(() => {
        if (settings.displayUrl && settings.networkAccessEnabled) {
            let qrTarget = settings.displayUrl;
            if (settings.pinEnabled && settings.hasValidPin) {
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
    class="w-full h-full @container grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500"
>
    <!-- Left Side: All Toggles & Preferences -->
    <div class="flex flex-col h-full gap-3 @lg:gap-4">
        <!-- Network & Security section -->
        <div class="rounded border border-gray-700/60 bg-gray-800/80 shadow-lg overflow-hidden">
            <div class="p-3 border-b border-gray-700/50 bg-gray-900/30">
                <h3 class="text-xs font-bold uppercase tracking-widest text-gray-400">Network & Security</h3>
            </div>
            <div class="divide-y divide-gray-700/30">
                <!-- Network Access Toggle -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span class="text-sm font-bold text-gray-300"
                        >Allow Network Access</span
                    >
                    <ToggleSwitch
                        checked={settings.networkAccessEnabled}
                        onToggle={() => settings.toggleNetworkAccess()}
                        label="Toggle Network Access"
                    />
                </div>

                <!-- PIN Lock Toggle -->
                <div
                    class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                >
                    <span class="text-sm font-bold text-gray-300"
                        >PIN Security</span
                    >
                    <ToggleSwitch
                        checked={settings.pinEnabled}
                        onToggle={() => settings.togglePin()}
                        label="Toggle PIN Lock"
                    />
                </div>
            </div>
        </div>

        {#if settings.isTauri || settings.isLoading}
            <!-- Application section -->
            <div class="rounded border border-gray-700/60 bg-gray-800/80 shadow-lg overflow-hidden">
                <div class="p-3 border-b border-gray-700/50 bg-gray-900/30">
                    <h3 class="text-xs font-bold uppercase tracking-widest text-gray-400">Application</h3>
                </div>
                <div class="divide-y divide-gray-700/30">
                    {#if settings.startAtLogin !== null}
                        <!-- Launch at Startup -->
                        <div
                            class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                        >
                            <span class="text-sm font-bold text-gray-300"
                                >Launch at Startup</span
                            >
                            <ToggleSwitch
                                checked={settings.startAtLogin}
                                onToggle={() => settings.toggleStartAtLogin()}
                                label="Toggle Launch at Startup"
                            />
                        </div>
                    {/if}

                    <!-- Auto-launch Fullscreen -->
                    <div
                        class="flex items-center justify-between py-3 px-4 transition-colors hover:bg-white/[0.02]"
                    >
                        <span class="text-sm font-bold text-gray-300"
                            >Auto-launch Fullscreen</span
                        >
                        <ToggleSwitch
                            checked={settings.autoLaunch}
                            onToggle={() => settings.toggleAutoLaunch()}
                            label="Toggle Auto-launch"
                        />
                    </div>

                    <!-- Display Selection -->
                    <MonitorSelector
                        label="Target Display"
                        currentMonitor={settings.preferredMonitor}
                        isOnline={settings.isMonitorOnline}
                        candidate={settings.selectedMonitorCandidate}
                        monitors={settings.monitors}
                        hasChanges={settings.hasDiscardedChanges}
                        onRefresh={() => settings.fetchMonitors()}
                        onConfirm={(name) => settings.setPreferredMonitor(name)}
                        onCandidateChange={(name) => (settings.selectedMonitorCandidate = name)}
                    />

                    <!-- Main Window Display Selection -->
                    <MonitorSelector
                        label="Main Window Display"
                        currentMonitor={settings.preferredMainMonitor}
                        isOnline={settings.isMainMonitorOnline}
                        candidate={settings.selectedMainMonitorCandidate}
                        monitors={settings.monitors}
                        hasChanges={settings.hasDiscardedMainChanges}
                        onRefresh={() => settings.fetchMonitors()}
                        onConfirm={(name) => settings.setPreferredMainMonitor(name)}
                        onCandidateChange={(name) => (settings.selectedMainMonitorCandidate = name)}
                    />
                </div>
            </div>
        {/if}
    </div>

    <!-- Right Side: Connection Block -->
    <div class="flex flex-col h-full gap-3 @lg:gap-4 min-h-0">
        <div class="rounded border border-gray-700/60 bg-gray-800/80 shadow-lg overflow-hidden flex-1 flex flex-col">
            <div class="p-3 border-b border-gray-700/50 bg-gray-900/30">
                <h3 class="text-xs font-bold uppercase tracking-widest text-gray-400">Connection</h3>
            </div>
            <div
                class="flex flex-col items-center justify-center p-4 @lg:p-6 overflow-hidden relative group/qr flex-1 gap-4 @lg:gap-6"
            >
                <p
                    class="text-[clamp(0.625rem,2cqi,0.75rem)] @2xl:text-[clamp(0.75rem,2.5cqi,0.875rem)] text-gray-500 uppercase tracking-[0.3em] font-black opacity-50 text-center"
                >
                    {settings.networkAccessEnabled
                        ? "Scan to Connect"
                        : "Enable access to view"}
                </p>

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
                </div>
            </div>
        </div>
    </div>
</div>
