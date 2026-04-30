<script lang="ts">
	import TimerSubscriber from "./timer.component.svelte";
	import Clock from "./clock.component.svelte";
	import { fade } from "svelte/transition";
	import { onMount, onDestroy } from "svelte";

	let {
		allowFullscreen = true,
		onClose = undefined,
		isLoading = false,
		showProgressBar = true,
		showSecondaryClock = false,
		showClockSeconds = false,
		showClockDate = false,
		clockDateFormat = "DD/MM/YYYY",
	}: {
		allowFullscreen?: boolean;
		onClose?: () => void;
		isLoading?: boolean;
		showProgressBar?: boolean;
		showSecondaryClock?: boolean;
		showClockSeconds?: boolean;
		showClockDate?: boolean;
		clockDateFormat?: string;
	} = $props();

	let showClock = $state(true);
	let hasHours = $state(false);
	let idleTimeout: any = null;
	let isFullscreen = $state(false);
	let rootEl: HTMLDivElement | null = null;

	let userActive = $state(true);
	let activityTimeout: any = null;

	function handleMouseMove() {
		userActive = true;
		if (activityTimeout) clearTimeout(activityTimeout);
		activityTimeout = setTimeout(() => {
			userActive = false;
		}, 3000);
	}

	function handleTimerStatus(status: string) {
		if (
			status === "running" ||
			status === "overtime" ||
			status === "connecting"
		) {
			showClock = false;
			if (idleTimeout) {
				clearTimeout(idleTimeout);
				idleTimeout = null;
			}
		} else if (status === "stopped" || status === "idle" || !status) {
			hasHours = false;
			if (!idleTimeout) {
				idleTimeout = setTimeout(() => {
					showClock = true;
				}, 3000);
			}
		}
	}

	function handleFullscreenChange() {
		if (typeof document === "undefined") return;
		isFullscreen = !!document.fullscreenElement;
	}

	async function toggleFullscreen() {
		if (!allowFullscreen) return;
		if (typeof document === "undefined") return;
		try {
			if (!document.fullscreenElement && rootEl) {
				await rootEl.requestFullscreen();
			} else if (document.fullscreenElement) {
				await document.exitFullscreen();
			}
		} catch (e) {
			console.error("Fullscreen error", e);
		}
	}

	onMount(() => {
		if (typeof document !== "undefined") {
			document.addEventListener(
				"fullscreenchange",
				handleFullscreenChange,
			);
			handleMouseMove();
		}
	});

	onDestroy(() => {
		if (typeof document !== "undefined") {
			document.removeEventListener(
				"fullscreenchange",
				handleFullscreenChange,
			);
		}
		if (idleTimeout) {
			clearTimeout(idleTimeout);
			idleTimeout = null;
		}
		if (activityTimeout) {
			clearTimeout(activityTimeout);
			activityTimeout = null;
		}
	});
</script>

<div
	class="relative h-full w-full px-6"
	class:cursor-none={!userActive}
	class:has-hours={hasHours}
	bind:this={rootEl}
	onmousemove={handleMouseMove}
	role="presentation"
	style="container-type: size;"
>
	{#if onClose}
		<div
			class="z-10 fixed top-2 left-2 transition-opacity duration-500"
			class:opacity-0={!userActive}
			class:pointer-events-none={!userActive}
		>
			<button
				class="rounded bg-white/10 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/20 active:bg-white/30 backdrop-blur-sm"
				onclick={onClose}
			>
				Close Fullscreen
			</button>
		</div>
	{:else if allowFullscreen}
		<div
			class="z-10 top-2 left-2 transition-opacity duration-500"
			class:absolute={!isFullscreen}
			class:fixed={isFullscreen}
			class:opacity-0={!userActive}
			class:pointer-events-none={!userActive}
		>
			<button
				class="rounded bg-transparent/0 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10 active:bg-white/20"
				onclick={toggleFullscreen}
			>
				{isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
			</button>
		</div>
	{/if}

	{#if isLoading}
		<div class="absolute inset-0 flex items-center justify-center">
			<div class="h-1/3 w-1/2 rounded bg-white/5 animate-pulse"></div>
		</div>
	{:else if showClock}
		<div class="absolute inset-0 z-0">
			<Clock
				onStatusChange={handleTimerStatus}
				showSeconds={showClockSeconds}
				showDate={showClockDate}
				dateFormat={clockDateFormat}
			/>
		</div>
	{:else}
		<div in:fade={{ duration: 300 }} out:fade={{ duration: 300 }}>
			<TimerSubscriber
				onStatusChange={handleTimerStatus}
				onTick={(t) => (hasHours = t >= 3600)}
				{showProgressBar}
				{showSecondaryClock}
			/>
		</div>
	{/if}
</div>
