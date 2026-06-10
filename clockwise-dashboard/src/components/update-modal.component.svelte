<script lang="ts">
    import { fly, scale } from "svelte/transition";
    import {
        updateChecker,
        groupChangelog,
        TYPE_LABELS,
        type ChangelogEntry,
    } from "../lib/update-checker.svelte.ts";
    import { versionInfo } from "../lib/version";

    let { open = $bindable(false) }: { open: boolean } = $props();

    function close() {
        open = false;
    }

    function dismiss() {
        updateChecker.dismissUpdate();
        close();
    }

    async function openDownload() {
        const url = updateChecker.downloadUrl || updateChecker.releaseUrl;
        if (!url) return;

        try {
            const { openUrl } = await import("@tauri-apps/plugin-opener");
            await openUrl(url);
        } catch {
            // Fallback for non-Tauri (e.g. dev browser)
            window.open(url, "_blank");
        }
    }

    async function openReleasePage() {
        if (!updateChecker.releaseUrl) return;
        try {
            const { openUrl } = await import("@tauri-apps/plugin-opener");
            await openUrl(updateChecker.releaseUrl);
        } catch {
            window.open(updateChecker.releaseUrl, "_blank");
        }
    }

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) close();
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Escape") close();
    }

    // Group changelog entries for display
    let groupedChangelog = $derived.by(() => {
        if (!updateChecker.changelog) return null;
        return groupChangelog(updateChecker.changelog);
    });

    // Check if we have any content to show
    let hasChangelog = $derived(
        (groupedChangelog && groupedChangelog.size > 0) ||
            !!updateChecker.releaseBody,
    );
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        class="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        transition:fly={{ duration: 200 }}
        onclick={handleBackdropClick}
    >
        <!-- Modal -->
        <div
            class="relative w-full max-w-lg max-h-[80vh] rounded-2xl border border-gray-700/50 bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
            in:scale={{ duration: 300, start: 0.95 }}
            out:scale={{ duration: 200, start: 0.95 }}
        >
            <!-- Header -->
            <div
                class="shrink-0 px-6 py-5 border-b border-gray-700/40 bg-gradient-to-r from-emerald-950/40 to-transparent"
            >
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-lg font-bold text-white">
                            Update Available
                        </h2>
                        <p class="text-sm text-gray-400 mt-0.5">
                            <span class="text-gray-500"
                                >v{versionInfo.appVersion}</span
                            >
                            <span class="text-gray-600 mx-1.5">→</span>
                            <span
                                class="text-emerald-400 font-semibold"
                                >v{updateChecker.latestVersion}</span
                            >
                        </p>
                    </div>
                    <button
                        onclick={close}
                        class="rounded-lg p-2 text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Close modal"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Changelog body -->
            <div class="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
                {#if groupedChangelog && groupedChangelog.size > 0}
                    <h3
                        class="text-xs font-black uppercase tracking-widest text-gray-500 mb-4"
                    >
                        What's Changed
                    </h3>
                    {#each [...groupedChangelog.entries()] as [type, entries]}
                        {@const label = TYPE_LABELS[type] || TYPE_LABELS.other}
                        <div class="mb-4">
                            <p
                                class="text-sm font-bold text-gray-300 mb-2 flex items-center gap-2"
                            >
                                <span>{label.emoji}</span>
                                {label.heading}
                                <span
                                    class="text-[10px] font-bold text-gray-600 bg-gray-800 rounded-full px-2 py-0.5"
                                    >{entries.length}</span
                                >
                            </p>
                            <ul class="space-y-1.5 ml-1">
                                {#each entries as entry}
                                    <li
                                        class="flex items-start gap-2 text-sm"
                                    >
                                        <span
                                            class="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-600"
                                        ></span>
                                        <span class="text-gray-300">
                                            {#if entry.scope}
                                                <span
                                                    class="font-semibold text-gray-400"
                                                    >{entry.scope}:</span
                                                >
                                            {/if}
                                            {entry.message}
                                            <span
                                                class="text-gray-600 text-xs font-mono ml-1"
                                                >{entry.hash}</span
                                            >
                                        </span>
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/each}
                {:else if updateChecker.releaseBody}
                    <!-- Fallback: show raw release body -->
                    <h3
                        class="text-xs font-black uppercase tracking-widest text-gray-500 mb-4"
                    >
                        Release Notes
                    </h3>
                    <div
                        class="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap"
                    >
                        {updateChecker.releaseBody}
                    </div>
                {:else}
                    <div class="text-center py-8">
                        <p class="text-gray-500 text-sm">
                            A new version is available. Check the release
                            page for details.
                        </p>
                    </div>
                {/if}
            </div>

            <!-- Footer actions -->
            <div
                class="shrink-0 px-6 py-4 border-t border-gray-700/40 bg-gray-950/50 flex items-center gap-3"
            >
                <button
                    onclick={openDownload}
                    class="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2"
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
                    >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
                        ></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Update
                </button>
                <button
                    onclick={openReleasePage}
                    class="py-2.5 px-4 rounded-xl text-sm font-bold bg-white/5 hover:bg-white/10 text-gray-300 transition-all ring-1 ring-white/10"
                >
                    GitHub
                </button>
                <button
                    onclick={dismiss}
                    class="py-2.5 px-4 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
                >
                    Dismiss
                </button>
            </div>
        </div>
    </div>
{/if}

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
