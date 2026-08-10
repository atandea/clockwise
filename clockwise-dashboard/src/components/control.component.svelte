<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import ConfirmModal from "./confirm-modal.svelte";
	import { get, writable } from "svelte/store";
	import { fetchWithPin, timerEvents, type TimerEventData } from "$lib/api";

	interface Timer {
		id: string;
		name: string;
		duration: number;
		unit: "seconds" | "minutes" | "hours";
		createdAt: string | Date;
		status: string;
		progressPercent: number;
		remainingSeconds?: number;
	}

	let { apiBase = "", isLoading = false }: { apiBase?: string; isLoading?: boolean } = $props();

	const timers = writable<Timer[]>([]);
	const loading = writable(true);
	const error = writable<string | null>(null);
	const activeTimerId = writable<string | null>(null);
	const actionPending = writable<Record<string, boolean>>({});
	const globalPending = writable(false);

	let unsubscribe: (() => void) | null = null;
	let pendingEvent: TimerEventData | null = null;
	let rafId: number | null = null;

	// Confirmation modal state
	let confirmVisible = $state(false);
	let confirmTimerId = $state<string | null>(null);
	let confirmTimerName = $state<string | null>(null);

	function setActionPending(timerId: string | null, value: boolean) {
		actionPending.update((prev) => {
			if (!timerId) return prev;
			return { ...prev, [timerId]: value };
		});
	}

	function updateTimerProgress(timerId: string, progressPercent: number) {
		timers.update((ts) => {
			let changed = false;
			const updated = ts.map((t) => {
				if (t.id !== timerId || t.progressPercent === progressPercent) return t;
				changed = true;
				return { ...t, progressPercent };
			});
			return changed ? updated : ts;
		});
	}

	export async function fetchTimers() {
		loading.set(true);
		error.set(null);
		try {
			const res = await fetchWithPin(`${apiBase}/timers`);
			if (!res.ok) throw new Error(`Failed to fetch timers: ${res.status}`);
			const data = await res.json();
			timers.set(data);
		} catch (err: any) {
			error.set(err?.message ?? String(err));
		} finally {
			loading.set(false);
		}
	}

	async function startTimer(id: string) {
		if (get(actionPending)[id]) return;
		setActionPending(id, true);
		error.set(null);
		try {
			const res = await fetchWithPin(`${apiBase}/timers/${encodeURIComponent(id)}/start`, {
				method: "POST",
			});
			if (!res.ok) throw new Error(`Start failed: ${res.status}`);
			activeTimerId.set(id);
		} catch (err: any) {
			error.set(err?.message ?? String(err));
		} finally {
			setActionPending(id, false);
		}
	}

	async function stopActiveTimer() {
		const activeId = get(activeTimerId);
		if (!activeId || get(globalPending)) return;
		globalPending.set(true);
		setActionPending(activeId, true);
		error.set(null);
		try {
			const res = await fetchWithPin(`${apiBase}/timers/stop`, { method: "POST" });
			if (!res.ok) throw new Error(`Stop failed: ${res.status}`);
			activeTimerId.set(null);
			updateTimerProgress(activeId, 0);
		} catch (err: any) {
			error.set(err?.message ?? String(err));
		} finally {
			globalPending.set(false);
			setActionPending(activeId, false);
		}
	}

	async function deleteTimer(id: string) {
		if (get(actionPending)[id]) return;
		setActionPending(id, true);
		error.set(null);
		try {
			const res = await fetchWithPin(`${apiBase}/timers/${encodeURIComponent(id)}`, { method: "DELETE" });
			if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
			timers.update((ts) => ts.filter((timer) => timer.id !== id));
			if (get(activeTimerId) === id) activeTimerId.set(null);
		} catch (err: any) {
			error.set(err?.message ?? String(err));
		} finally {
			setActionPending(id, false);
		}
	}

	function applyPendingTimerEvent() {
		if (!pendingEvent) return;
		const data = pendingEvent;
		pendingEvent = null;
		rafId = null;

		if (data.status === "stopped" || data.status === "idle") {
			activeTimerId.set(null);
		} else if (data.timerId) {
			activeTimerId.set(data.timerId);
			updateTimerProgress(data.timerId, data.progressPercent);
		}
	}

	$effect(() => {
		if (!isLoading) {
			fetchTimers();
		}
	});

	onMount(() => {
		unsubscribe = timerEvents.subscribe((data: TimerEventData) => {
			pendingEvent = data;
			if (rafId === null) rafId = requestAnimationFrame(applyPendingTimerEvent);
		});
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
		if (rafId !== null) cancelAnimationFrame(rafId);
	});
</script>

<div class="h-full flex flex-col min-h-0 bg-gray-800/80 rounded border border-gray-700 shadow-lg overflow-hidden">
	{#if $error}
		<div class="p-4 text-red-400 bg-red-900/20 border-b border-red-900/50 text-sm font-medium">{$error}</div>
	{/if}

	<div class="p-4 border-b border-gray-700/50 bg-gray-900/30 flex items-center justify-between">
		<h3 class="text-xs font-bold uppercase tracking-widest text-gray-400">Saved Timers</h3>
		{#if !isLoading && !$loading}
			<span class="px-2 py-0.5 rounded-full bg-gray-700/50 text-[10px] font-mono text-gray-300">{$timers.length}</span>
		{:else}
			<div class="h-4 w-6 rounded bg-white/5 animate-pulse"></div>
		{/if}
	</div>

	<div class="flex-1 overflow-y-auto custom-scrollbar">
		{#if isLoading || $loading}
			<ul class="divide-y divide-gray-700/50">
				{#each Array(5) as _}
					<li class="flex items-center justify-between px-4 py-3">
						<div class="h-2 w-2 rounded-full bg-gray-700 animate-pulse"></div>
						<div class="flex-1 px-4 space-y-2">
							<div class="h-4 w-1/2 rounded bg-white/5 animate-pulse"></div>
							<div class="h-3 w-1/4 rounded bg-white/5 animate-pulse"></div>
						</div>
						<div class="h-9 w-20 rounded-lg bg-white/5 animate-pulse"></div>
					</li>
				{/each}
			</ul>
		{:else}
			<ul class="divide-y divide-gray-700/50">
				{#each $timers as timer (timer.id)}
					<li class="flex items-center justify-between px-2.5 sm:px-4 py-2 sm:py-3 hover:bg-white/[0.02] transition-colors">
						<div class="h-2 w-2 rounded-full shadow-[0_0_8px_rgba(var(--dot-color),0.5)] shrink-0" style="--dot-color: {timer.id === $activeTimerId ? '34, 197, 94' : '107, 114, 128'}" class:bg-green-500={timer.id === $activeTimerId} class:bg-gray-500={timer.id !== $activeTimerId} aria-hidden="true"></div>
						<div class="flex-1 px-2.5 sm:px-4 min-w-0">
							<div class="text-sm sm:text-lg font-semibold text-gray-200 truncate">{timer.name}</div>
						</div>
						<div class="flex items-center bg-gray-900/60 rounded-lg p-0.5 sm:p-1 border border-gray-700/50 shadow-sm gap-0.5 sm:gap-1 shrink-0">
							<button class="p-1 sm:p-1.5 rounded hover:bg-white/10 transition-colors" class:text-red-500={timer.id === $activeTimerId} class:text-green-500={timer.id !== $activeTimerId} disabled={$globalPending || ($actionPending[timer.id] ?? false)} onclick={() => timer.id === $activeTimerId ? stopActiveTimer() : startTimer(timer.id)} title={timer.id === $activeTimerId ? "Stop" : "Start"}>
								{#if $globalPending || ($actionPending[timer.id] ?? false)}
									<span class="inline-block w-4 h-4 sm:w-5 sm:h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
								{:else}
									{#if timer.id === $activeTimerId}
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 sm:w-5 sm:h-5"><path fill-rule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clip-rule="evenodd"/></svg>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 sm:w-5 sm:h-5"><path fill-rule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clip-rule="evenodd"/></svg>
									{/if}
								{/if}
							</button>
							<div class="w-px h-3 bg-gray-700/50"></div>
							<button class="p-1 sm:p-1.5 rounded text-gray-500 hover:text-red-500 hover:bg-white/10 transition-colors" disabled={$globalPending || ($actionPending[timer.id] ?? false)} onclick={() => { confirmTimerId = timer.id; confirmTimerName = timer.name; confirmVisible = true; }} title="Delete">
								    {#if $globalPending || ($actionPending[timer.id] ?? false)}
									    <span class="inline-block w-4 h-4 sm:w-5 sm:h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
								{:else}
									    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 sm:w-5 sm:h-5"><path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5 0l.5 8.5a.75.75 0 101.5 0l-.5-8.5zm4.33.75a.75.75 0 00.75-.75l-.5-8.5a.75.75 0 00-1.5 0l.5 8.5z" clip-rule="evenodd"/></svg>
								{/if}
							</button>
						</div>
					</li>
				{/each}
				{#if $timers.length === 0}
					<li class="px-4 py-12 text-center text-gray-500 italic text-sm">No saved timers.</li>
				{/if}
			</ul>
		{/if}
	</div>

	<ConfirmModal
		visible={confirmVisible}
		title="Delete Timer"
		message={confirmTimerName ? `Delete "${confirmTimerName}"? This cannot be undone.` : "Delete this timer?"}
		confirmText="Delete"
		cancelText="Cancel"
		onConfirm={() => {
			if (confirmTimerId) deleteTimer(confirmTimerId);
			confirmVisible = false;
			confirmTimerId = null;
			confirmTimerName = null;
		}}
		onCancel={() => {
			confirmVisible = false;
			confirmTimerId = null;
			confirmTimerName = null;
		}}
	/>
</div>

<style>
	.custom-scrollbar::-webkit-scrollbar { width: 6px; }
	.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
	.custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
	.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4b5563; }
</style>
