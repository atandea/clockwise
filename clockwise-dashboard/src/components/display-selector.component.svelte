<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { invoke } from "@tauri-apps/api/core";
    import {
        fetchWithPin,
        getApiBaseUrl,
        timerWindowOpen,
        autoLaunchAttempted,
    } from "../lib/api";
    import { get } from "svelte/store";
    import { toast } from "../lib/toast.svelte";
 
	let { isLoading = false }: { isLoading?: boolean } = $props();

    interface MonitorInfo {
        name: string;
        width: number;
        height: number;
        x: number;
        y: number;
        scale_factor: number;
    }

    let monitors = $state<MonitorInfo[]>([]);
    let selectedMonitor = $state<string>("");
    let isWindowOpen = $state(false);
    const unsubscribeOpen = timerWindowOpen.subscribe(v => isWindowOpen = v);
    let loading = $state(true);
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let monitorsLoaded = $state(false);
    let preferenceLoaded = false;

    $effect(() => {
        if (!isLoading && monitorsLoaded && !preferenceLoaded) {
            preferenceLoaded = true;
            loadPreference();
        }
    });

    async function loadMonitors() {
        try {
            monitors = await invoke<MonitorInfo[]>("get_monitors");
        } catch (err) {
            console.error("Failed to get monitors:", err);
        } finally {
            monitorsLoaded = true;
        }
    }

    async function loadPreference() {
        try {
            const response = await fetchWithPin(`${getApiBaseUrl()}/settings`);
            if (response.ok) {
                const settings = await response.json();
                const pref = settings.preferred_monitor;
                const isPrefOnline = pref ? monitors.some((m) => m.name === pref) : false;

                if (pref && isPrefOnline) {
                    selectedMonitor = pref;
                } else if (monitors.length > 0) {
                    selectedMonitor = monitors[0].name;
                }
                
                // Automatically launch if required and not already open
                const launchOnStartup = !!settings.launch_fullscreen_on_startup;
                if (
                    launchOnStartup &&
                    !isWindowOpen &&
                    !get(autoLaunchAttempted)
                ) {
                    autoLaunchAttempted.set(true);
                    if (pref && !isPrefOnline) {
                        toast.info(`Preferred display '${pref}' is not available`);
                    } else if (monitors.length > 0) {
                        await toggleFullscreenWindow();
                    }
                }
            } else if (monitors.length > 0) {
                selectedMonitor = monitors[0].name;
            }
        } catch (err) {
            console.error("Failed to load preference:", err);
            if (monitors.length > 0) selectedMonitor = monitors[0].name;
        }
    }


    async function handleMonitorChange(e: Event) {
        const target = e.target as HTMLSelectElement;
        selectedMonitor = target.value;
        try {
            await fetchWithPin(`${getApiBaseUrl()}/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ preferred_monitor: selectedMonitor }),
            });
        } catch (err) {
            console.error("Failed to save preference:", err);
        }
    }

    async function checkWindowState() {
        try {
            const isOpen = await invoke<boolean>("is_timer_window_open");
            timerWindowOpen.set(isOpen);
        } catch {
            // ignore
        }
    }

    async function toggleFullscreenWindow() {
        if (isWindowOpen) {
            try {
                await invoke("close_timer_window");
                timerWindowOpen.set(false);
            } catch (err) {
                console.error("Failed to close timer window:", err);
            }
        } else {
            try {
                const payload = { request: { monitor_name: selectedMonitor || null } };
                console.log("Invoking open_timer_window with:", payload, "selectedMonitor:", selectedMonitor);
                await invoke("open_timer_window", payload);
                timerWindowOpen.set(true);
            } catch (err) {
                console.error("Failed to open timer window:", err);
                toast.info(String(err));
            }
        }
    }

    async function refreshMonitors() {
        await loadMonitors();
        // Revalidate current selection
        if (monitors.length > 0 && !monitors.some((m) => m.name === selectedMonitor)) {
            selectedMonitor = monitors[0].name;
        }
    }

    onMount(async () => {
        await loadMonitors();
        await checkWindowState();
        loading = false;

        // Poll timer window state every 2s to catch external closes
        pollInterval = setInterval(checkWindowState, 2000);
    });

    onDestroy(() => {
        unsubscribeOpen();
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    });
</script>

{#if !loading && !isLoading}
    <div
        class="flex items-center gap-3 rounded bg-gray-800/60 border border-gray-700/50 p-2 px-3"
    >
        <!-- Monitor icon -->
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="w-4 h-4 text-gray-400 shrink-0"
        >
            <path
                d="M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6 14h6v1a1 1 0 01-1 1h-4a1 1 0 01-1-1v-1z"
            />
        </svg>
 
        <!-- Monitor selector -->
        <select
            class="flex-1 min-w-0 h-8 rounded bg-gray-900 border border-gray-600 px-2 text-sm text-gray-200 outline-none focus:border-blue-500 transition-colors cursor-pointer appearance-none"
            value={selectedMonitor}
            onchange={handleMonitorChange}
        >
            {#each monitors as monitor}
                <option value={monitor.name}>
                    {monitor.name} ({monitor.width}×{monitor.height})
                </option>
            {/each}
            {#if monitors.length === 0}
                <option value="" disabled>No displays detected</option>
            {/if}
        </select>
 
        <!-- Refresh monitors button -->
        <button
            class="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-white/10 transition-colors"
            onclick={refreshMonitors}
            title="Refresh displays"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="w-4 h-4"
            >
                <path
                    fill-rule="evenodd"
                    d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H4.598a.75.75 0 00-.75.75v3.634a.75.75 0 001.5 0v-2.127l.208.208a7 7 0 0011.675-3.12.75.75 0 00-1.42-.48zM4.688 8.576a5.5 5.5 0 019.201-2.466l.312.311H11.77a.75.75 0 000 1.5h3.634a.75.75 0 00.75-.75V3.537a.75.75 0 00-1.5 0v2.128l-.208-.208A7 7 0 002.77 8.576a.75.75 0 001.42.48z"
                    clip-rule="evenodd"
                />
            </svg>
        </button>
 
        <!-- Divider -->
        <div class="w-px h-6 bg-gray-700/50 mx-1"></div>
 
        <!-- Launch / Close fullscreen button -->
        <button
            class="flex items-center gap-2 h-8 rounded px-3 text-sm font-medium transition-colors whitespace-nowrap"
            class:bg-green-600={!isWindowOpen}
            class:hover:bg-green-500={!isWindowOpen}
            class:text-white={!isWindowOpen}
            class:bg-red-600={isWindowOpen}
            class:hover:bg-red-500={isWindowOpen}
            onclick={toggleFullscreenWindow}
            disabled={monitors.length === 0}
        >
            {#if isWindowOpen}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="w-4 h-4"
                >
                    <path
                        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                    />
                </svg>
                Close Fullscreen
            {:else}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    class="w-4 h-4"
                >
                    <path
                        d="M13.28 7.78l3.22-3.22v2.69a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.69l-3.22 3.22a.75.75 0 001.06 1.06zM2 17.25v-4.5a.75.75 0 011.5 0v2.69l3.22-3.22a.75.75 0 011.06 1.06L4.56 16.5h2.69a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z"
                    />
                </svg>
                Launch Fullscreen
            {/if}
        </button>
    </div>
{:else}
    <div class="h-[50px] w-full rounded bg-gray-800/60 border border-gray-700/50 animate-pulse relative overflow-hidden flex items-center px-4">
        <div class="h-4 w-4 rounded bg-white/10 shrink-0"></div>
        <div class="ml-3 h-4 flex-1 rounded bg-white/10 max-w-[200px]"></div>
        <div class="ml-auto flex gap-2">
            <div class="h-8 w-24 rounded bg-white/10"></div>
        </div>
    </div>
{/if}

<!-- Animations moved to global `src/app.css` to avoid Tailwind parsing issues -->
