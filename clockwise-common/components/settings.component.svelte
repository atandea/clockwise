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

<div
    class="h-screen bg-[#020617] text-white flex flex-col overflow-hidden"
>
    <section
        class="flex-1 flex flex-col p-3 lg:p-4 overflow-y-auto min-h-0"
    >
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
        <section class="rounded-[2rem] border border-gray-700 bg-[#0b0f1a]/95 p-6 shadow-2xl shadow-black/20">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div class="space-y-2">
                    <p class="text-xs uppercase tracking-[0.3em] text-indigo-300/80">Settings</p>
                    <h2 class="text-3xl font-semibold text-white">Local network access</h2>
                </div>
                <p class="max-w-xl text-sm leading-6 text-gray-400">
                    Open the dashboard from another computer or phone on the same network using the link below.
                </p>
            </div>

            <div class="mt-6 space-y-5">
                <div class="rounded-[1.5rem] border border-gray-700/80 bg-gray-900/80 p-5 shadow-inner">
                    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div class="min-w-0 space-y-2">
                            <p class="text-sm text-gray-400">Server PIN</p>
                            <code class="inline-flex rounded-2xl bg-slate-950/90 px-3 py-2 text-xs font-medium text-yellow-300">
                                {serverPin}
                            </code>
                        </div>
                        <button
                            class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-700"
                            on:click={() => copyText(serverPin, "Server PIN")}
                            disabled={!serverPin || serverPin.startsWith("(")}
                            aria-label="Copy Server PIN"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                                <path d="M8 4a2 2 0 00-2 2v9h8V6a2 2 0 00-2-2H8z" />
                                <path d="M5 6a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H6a1 1 0 01-1-1V6z" />
                            </svg>
                            Copy PIN
                        </button>
                    </div>
                </div>

                <div class="rounded-[1.5rem] border border-gray-700/80 bg-gray-900/80 p-5 shadow-inner">
                    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div class="min-w-0 space-y-2">
                            <p class="text-sm text-gray-400">Local dashboard URL</p>
                            {#if localAccessUrl}
                                <a
                                    href={localAccessUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    class="block max-w-full rounded-2xl bg-slate-950/90 px-3 py-2 text-xs font-medium text-yellow-300 transition hover:text-yellow-200 break-all"
                                >
                                    {localAccessUrl}
                                </a>
                            {:else}
                                <code class="inline-flex rounded-2xl bg-slate-950/90 px-3 py-2 text-xs font-medium text-yellow-300">
                                    (not available)
                                </code>
                            {/if}
                        </div>
                        <button
                            class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-700"
                            on:click={() => copyText(localAccessUrl, "Local dashboard URL")}
                            disabled={!localAccessUrl}
                            aria-label="Copy local dashboard URL"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                                <path d="M8 4a2 2 0 00-2 2v9h8V6a2 2 0 00-2-2H8z" />
                                <path d="M5 6a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H6a1 1 0 01-1-1V6z" />
                            </svg>
                            Copy URL
                        </button>
                    </div>
                </div>

                {#if toast}
                    <div class="rounded-2xl bg-emerald-700/20 p-4 text-sm text-emerald-100 ring-1 ring-emerald-500/30">
                        {toast}
                    </div>
                {/if}
            </div>
        </section>

        <aside class="rounded-[2rem] border border-gray-700 bg-[#0b0f1a]/95 p-6 shadow-2xl shadow-black/20">
            <div class="space-y-4">
                <div>
                    <p class="text-xs uppercase tracking-[0.3em] text-indigo-300/80">About</p>
                    <h3 class="mt-2 text-xl font-semibold text-white">Version information</h3>
                </div>
                <p class="text-sm leading-6 text-gray-400">
                    See the current dashboard build and framework versions for this installation.
                </p>

                <div class="space-y-3 rounded-[1.5rem] border border-gray-700/80 bg-gray-900/80 p-4">
                    {#each aboutItems as item}
                        <div class="flex items-center justify-between gap-4 rounded-2xl bg-slate-950/90 px-4 py-3">
                            <p class="text-sm text-gray-300">{item.label}</p>
                            <p class="text-sm font-semibold text-slate-100">{item.value}</p>
                        </div>
                    {/each}
                </div>
            </div>
        </aside>
    </div>
    </section>
</div>
