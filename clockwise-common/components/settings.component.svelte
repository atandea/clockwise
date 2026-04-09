<script lang="ts">
    import { onMount } from "svelte";
    import {
        getApiBaseUrl,
        getCleanHostname,
        getPin,
        fetchWithPin,
    } from "../lib/api";
    import { aboutItems } from "../lib/version";

    let apiBase = getApiBaseUrl();
    let localIp = $state("");
    let localAccessUrl = $state("");
    let serverPin = $state("");
    let toast = $state("");
    let pin = $state("");
    let pinEnabled = $state(true);
    let autoLaunch = $state(false);

    async function fetchSettings() {
        try {
            const res = await fetchWithPin(`${apiBase}/settings`);
            if (res.ok) {
                const data = await res.json();
                autoLaunch = !!data.launch_fullscreen_on_startup;
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
                showToast(
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
                showToast(`Auto-launch ${newValue ? "enabled" : "disabled"}`);
            }
        } catch (err) {
            console.error("Failed to toggle auto-launch:", err);
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
        localAccessUrl = `http://${localIp}:1420`;

        try {
            const { invoke } = await import("@tauri-apps/api/core");
            const tauriIp = await invoke<string>("get_local_ip");
            if (tauriIp) {
                localIp = tauriIp;
                localAccessUrl = `http://${localIp}:1420`;
            }
        } catch (err) {
            // Fallback to hostname if Tauri is unavailable or invocation fails.
            console.debug("Tauri local IP lookup unavailable:", err);
        }
    }

    function showToast(message: string) {
        toast = message;
        setTimeout(() => (toast = ""), 2000);
    }

    onMount(() => {
        fetchLocalIp();
        pin = getPin() || "";
        fetchStatus();
        fetchSettings();
        fetchServerPin();
    });

    async function copyText(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            showToast(`${label} copied`);
        } catch (err) {
            showToast(`Copy failed`);
        }
    }
</script>

<div
    class="h-screen bg-[#020617] text-white flex flex-col overflow-hidden font-sans"
>
    <section
        class="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto lg:overflow-hidden z-10 custom-scrollbar justify-center"
    >
        <!-- Header -->
        <div
            class="max-w-6xl mx-auto w-full mb-6 flex items-center justify-between"
        >
            <div>
                <h1
                    class="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
                >
                    Settings
                </h1>
                <p class="text-gray-400 text-sm mt-1">
                    Configure your Clockwise experience
                </p>
            </div>
            <a
                href="/"
                class="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold bg-white/5 hover:bg-white/10 active:scale-95 transition-all ring-1 ring-white/10"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
                >
                Back
            </a>
        </div>

        <div
            class="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-5"
        >
            <!-- Connection Card -->
            <div
                class="group rounded-[1.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-xl p-5 shadow-2xl transition-all hover:border-white/20 flex flex-col"
            >
                <div class="flex items-start gap-3 mb-4">
                    <div
                        class="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><path d="M5 12h14" /><path
                                d="m12 5 7 7-7 7"
                            /></svg
                        >
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white">
                            Network Access
                        </h3>
                        <p class="text-sm text-gray-400">
                            Connect other devices on your local network
                        </p>
                    </div>
                </div>

                <div class="space-y-3">
                    <div
                        class="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 group/row hover:border-white/10 transition-colors"
                    >
                        <div class="min-w-0">
                            <span class="text-sm text-gray-300 block"
                                >Local URL</span
                            >
                            <span
                                class="text-[10px] text-gray-500 uppercase tracking-widest font-bold"
                                >Dashboard Address</span
                            >
                        </div>
                        <div class="flex items-center gap-3">
                            <a
                                href={localAccessUrl}
                                target="_blank"
                                class="text-sm font-mono text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-tight truncate max-w-[200px] sm:max-w-none"
                            >
                                {localAccessUrl}
                            </a>
                            <button
                                onclick={() => copyText(localAccessUrl, "URL")}
                                class="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-white"
                                aria-label="Copy URL"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    ><rect
                                        width="14"
                                        height="14"
                                        x="8"
                                        y="8"
                                        rx="2"
                                        ry="2"
                                    /><path
                                        d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
                                    /></svg
                                >
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Security Card -->
            <div
                class="group rounded-[1.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-xl p-5 shadow-2xl transition-all hover:border-white/20 flex flex-col"
            >
                <div class="flex items-start gap-3 mb-4">
                    <div
                        class="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><rect
                                width="18"
                                height="11"
                                x="3"
                                y="11"
                                rx="2"
                                ry="2"
                            /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg
                        >
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white">Security</h3>
                        <p class="text-sm text-gray-400">
                            Protect access from other devices
                        </p>
                    </div>
                </div>

                <div class="space-y-3">
                    <div
                        class="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                    >
                        <div class="min-w-0">
                            <span class="text-sm text-gray-300 block"
                                >PIN Lock</span
                            >
                            <span
                                class="text-[10px] text-gray-500 uppercase tracking-widest font-bold"
                                >Recommended</span
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
                        class="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 transition-all {pinEnabled
                            ? 'opacity-100'
                            : 'opacity-30 pointer-events-none'}"
                    >
                        <div class="min-w-0">
                            <span class="text-sm text-gray-300 block"
                                >Server PIN</span
                            >
                            <span
                                class="text-[10px] text-gray-500 uppercase tracking-widest font-bold"
                                >Current Code</span
                            >
                        </div>
                        <div class="flex items-center gap-3">
                            <span
                                class="text-xl font-black font-mono tracking-[0.2em] text-white underline decoration-indigo-500/50 underline-offset-4"
                                >{serverPin}</span
                            >
                            <button
                                onclick={() => copyText(serverPin, "PIN")}
                                class="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-500 hover:text-white"
                                disabled={!pinEnabled}
                                aria-label="Copy PIN"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    ><rect
                                        width="14"
                                        height="14"
                                        x="8"
                                        y="8"
                                        rx="2"
                                        ry="2"
                                    /><path
                                        d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
                                    /></svg
                                >
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Preferences Card -->
            <div
                class="group rounded-[1.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-xl p-5 shadow-2xl transition-all hover:border-white/20 flex flex-col"
            >
                <div class="flex items-start gap-3 mb-4">
                    <div
                        class="p-2 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><path
                                d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                            /><polyline
                                points="3.27 6.96 12 12.01 20.73 6.96"
                            /><line x1="12" y1="22.08" x2="12" y2="12" /></svg
                        >
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

                <div class="space-y-3">
                    <div
                        class="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                    >
                        <div class="min-w-0">
                            <span class="text-sm text-gray-300 block"
                                >Auto-launch Fullscreen</span
                            >
                            <span
                                class="text-[10px] text-gray-500 uppercase tracking-widest font-bold"
                                >Launch on Startup</span
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
                </div>
            </div>

            <!-- About Card -->
            <div
                class="group rounded-[1.5rem] border border-white/10 bg-gray-900/40 backdrop-blur-xl p-5 shadow-2xl transition-all hover:border-white/20 flex flex-col"
            >
                <div class="flex items-start gap-3 mb-4">
                    <div
                        class="p-2 rounded-xl bg-gray-500/20 text-gray-400 group-hover:scale-110 transition-transform"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            ><circle cx="12" cy="12" r="10" /><path
                                d="M12 16v-4"
                            /><path d="M12 8h.01" /></svg
                        >
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-white">About</h3>
                        <p class="text-sm text-gray-400">
                            System information and versioning
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto">
                    {#each aboutItems as item}
                        <div
                            class="flex flex-col p-2.5 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors"
                        >
                            <span
                                class="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-0.5"
                                >{item.label}</span
                            >
                            {#if item.href}
                                <a
                                    href={item.href}
                                    target="_blank"
                                    class="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors break-all"
                                >
                                    {item.value}
                                </a>
                            {:else}
                                <span
                                    class="text-sm font-semibold text-gray-200 truncate"
                                    >{item.value}</span
                                >
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </section>

    {#if toast}
        <div
            class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-toast pointer-events-none"
        >
            <div
                class="rounded-2xl bg-white text-gray-900 px-6 py-3 text-sm font-bold shadow-2xl ring-1 ring-white/20 whitespace-nowrap pointer-events-auto"
            >
                {toast}
            </div>
        </div>
    {/if}
</div>

<style>
    @keyframes toast-in {
        from {
            opacity: 0;
            transform: translate(-50%, 1rem);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }

    .animate-toast {
        animation: toast-in 0.3s ease-out forwards;
    }

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
