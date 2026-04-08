<script lang="ts">
    import { onMount } from "svelte";
    import { getApiBaseUrl, getCleanHostname, getPin } from "$lib/api";
    import { aboutItems } from "$lib/version";

    let apiBase = getApiBaseUrl();
    let localIp = "";
    let localAccessUrl = "";
    let serverPin = "";
    let toast = "";
    let pin = "";
    let pinEnabled = true;

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
                toast = `PIN security ${pinEnabled ? "enabled" : "disabled"}`;
                setTimeout(() => (toast = ""), 1800);
            }
        } catch (err) {
            console.error("Failed to toggle PIN security:", err);
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

    onMount(() => {
        fetchLocalIp();
        pin = getPin() || "";
        fetchStatus();
        fetchServerPin();
    });

    async function copyText(value: string, label: string) {
        try {
            await navigator.clipboard.writeText(value);
            toast = `${label} copied to clipboard`;
            setTimeout(() => (toast = ""), 1800);
        } catch (err) {
            toast = `Copy failed for ${label}`;
            setTimeout(() => (toast = ""), 1800);
        }
    }
</script>

<div class="h-screen bg-[#020617] text-white flex flex-col overflow-hidden">
    <section class="flex-1 flex flex-col p-3 lg:p-4 overflow-y-auto min-h-0">
        <header
            class="shrink-0 mb-4 flex h-12 items-center justify-between rounded-lg bg-gray-800/40 border border-gray-700/30 px-4 shadow-sm"
        >
            <div class="flex items-center gap-4">
                <h1
                    class="text-[11px] font-bold text-gray-200 uppercase tracking-widest"
                >
                    Settings
                </h1>
            </div>
            <span class="flex items-center gap-2">
                <a
                    href="/"
                    class="ml-2 rounded px-2 py-1 text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white"
                >
                    Back
                </a>
            </span>
        </header>
        <div class="w-full grid gap-6 lg:grid-cols-[1.6fr_0.95fr]">
            <section
                class="rounded-[2rem] border border-gray-700 bg-[#0b0f1a]/95 p-6 shadow-2xl shadow-black/20"
            >
                <div class="space-y-4">
                    <div>
                        <h3 class="mt-2 text-xl font-semibold text-white">
                            Local network access
                        </h3>
                    </div>
                    <p class="text-sm leading-6 text-gray-400">
                        Open the dashboard from another computer or phone on the
                        same network using the link below.
                    </p>

                    <div
                        class="space-y-3 rounded-[1.5rem] border border-gray-700/80 bg-gray-900/80 p-4"
                    >
                        <!-- PIN security toggle -->
                        <div
                            class="flex items-center justify-between gap-4 rounded-2xl bg-slate-950/90 px-4 py-3"
                        >
                            <div class="min-w-0">
                                <p class="text-sm text-gray-300">
                                    PIN security
                                </p>
                                <p class="text-xs text-gray-500 mt-0.5">
                                    Require a PIN for network access
                                </p>
                            </div>
                            <button
                                class="relative flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 {pinEnabled
                                    ? 'bg-indigo-600'
                                    : 'bg-gray-700'}"
                                on:click={togglePin}
                                aria-label="Toggle PIN security"
                            >
                                <span
                                    class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {pinEnabled
                                        ? 'translate-x-6'
                                        : 'translate-x-1'} shadow-sm"
                                ></span>
                            </button>
                        </div>

                        <!-- Local dashboard URL -->
                        <div
                            class="flex items-center justify-between gap-4 rounded-2xl bg-slate-950/90 px-4 py-3"
                        >
                            <p class="text-sm text-gray-300">Local URL</p>
                            <div class="flex items-center gap-2">
                                {#if localAccessUrl}
                                    <a
                                        href={localAccessUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        class="text-sm font-semibold text-indigo-100 hover:text-indigo-400 border-b border-indigo-500/30 hover:border-indigo-400 transition-all"
                                    >
                                        {localAccessUrl}
                                    </a>
                                {:else}
                                    <p
                                        class="text-sm font-semibold text-slate-100"
                                    >
                                        (not available)
                                    </p>
                                {/if}
                                <button
                                    class="inline-flex items-center justify-center rounded-lg bg-indigo-600/80 p-1.5 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-700/50"
                                    on:click={() =>
                                        copyText(
                                            localAccessUrl,
                                            "Local dashboard URL",
                                        )}
                                    disabled={!localAccessUrl}
                                    aria-label="Copy local dashboard URL"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 32 32"
                                        ><path
                                            fill="currentColor"
                                            d="M7 7h3v3h12V7h3v11h2V7a2.006 2.006 0 0 0-2-2h-3V4a2.006 2.006 0 0 0-2-2h-8a2.006 2.006 0 0 0-2 2v1H7a2.006 2.006 0 0 0-2 2v21a2.006 2.006 0 0 0 2 2h9v-2H7zm5-3h8v4h-8zm18 20h-8.172l2.586-2.586L23 20l-5 5l5 5l1.414-1.414L21.828 26H30zM12 13h-2v2h2zm10 0h-8v2h8zm-10 5h-2v2h2zm-2 7h2v-2h-2zm4-5h4v-2h-4z"
                                        /></svg
                                    >
                                </button>
                            </div>
                        </div>

                        <!-- Server PIN -->
                        <div
                            class="flex items-center justify-between gap-4 rounded-2xl bg-slate-950/90 px-4 py-3 transition-opacity duration-300 {pinEnabled
                                ? 'opacity-100'
                                : 'opacity-30 pointer-events-none'}"
                        >
                            <p class="text-sm text-gray-300">Server PIN</p>
                            <div class="flex items-center gap-2">
                                <p class="text-sm font-semibold">
                                    {serverPin}
                                </p>
                                <button
                                    class="inline-flex items-center justify-center rounded-lg bg-indigo-600/80 p-1.5 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-700/50"
                                    on:click={() =>
                                        copyText(serverPin, "Server PIN")}
                                    disabled={!pinEnabled ||
                                        !serverPin ||
                                        serverPin.startsWith("(")}
                                    aria-label="Copy Server PIN"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 32 32"
                                        ><path
                                            fill="currentColor"
                                            d="M7 7h3v3h12V7h3v11h2V7a2.006 2.006 0 0 0-2-2h-3V4a2.006 2.006 0 0 0-2-2h-8a2.006 2.006 0 0 0-2 2v1H7a2.006 2.006 0 0 0-2 2v21a2.006 2.006 0 0 0 2 2h9v-2H7zm5-3h8v4h-8zm18 20h-8.172l2.586-2.586L23 20l-5 5l5 5l1.414-1.414L21.828 26H30zM12 13h-2v2h2zm10 0h-8v2h8zm-10 5h-2v2h2zm-2 7h2v-2h-2zm4-5h4v-2h-4z"
                                        /></svg
                                    >
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <aside
                class="rounded-[2rem] border border-gray-700 bg-[#0b0f1a]/95 p-6 shadow-2xl shadow-black/20"
            >
                <div class="space-y-4">
                    <div>
                        <h3 class="mt-2 text-xl font-semibold text-white">
                            About
                        </h3>
                    </div>
                    <p class="text-sm leading-6 text-gray-400">
                        See the current dashboard build and framework versions
                        for this installation.
                    </p>

                    <div
                        class="space-y-3 rounded-[1.5rem] border border-gray-700/80 bg-gray-900/80 p-4"
                    >
                        {#each aboutItems as item}
                            <div
                                class="flex items-center justify-between gap-4 rounded-2xl bg-slate-950/90 px-4 py-3"
                            >
                                <p class="text-sm text-gray-300">
                                    {item.label}
                                </p>
                                {#if item.href}
                                    <a
                                        href={item.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        class="text-sm font-semibold text-indigo-100 hover:text-indigo-400 border-b border-indigo-500/30 hover:border-indigo-400 transition-all"
                                    >
                                        {item.value}
                                    </a>
                                {:else}
                                    <p
                                        class="text-sm font-semibold text-slate-100"
                                    >
                                        {item.value}
                                    </p>
                                {/if}
                            </div>
                        {/each}
                    </div>
                </div>
            </aside>
        </div>
    </section>

    {#if toast}
        <div class="fixed bottom-10 left-1/2 z-50 animate-toast">
            <div
                class="rounded-2xl bg-emerald-500/95 text-white px-6 py-3 text-sm font-semibold shadow-2xl backdrop-blur-md ring-1 ring-white/20 whitespace-nowrap"
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
</style>
