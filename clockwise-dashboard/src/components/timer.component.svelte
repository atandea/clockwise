<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import ProgressBar from "./progress-bar.component.svelte";
	import SecondaryClock from "./secondary-clock.component.svelte";
	import { timerEvents, type TimerEventData } from "../lib/api";

	let {
		onStatusChange = () => {},
		onTick = (seconds: number) => {},
		showProgressBar = true,
		showSecondaryClock = false,
		normalColor = "#ffffff",
		warningColor = "#eab308",
		overtimeColor = "#ef4444",
		warningThreshold = 80,
		allowOvertime = true,
	}: {
		onStatusChange?: (status: string) => void;
		onTick?: (seconds: number) => void;
		showProgressBar?: boolean;
		showSecondaryClock?: boolean;
		normalColor?: string;
		warningColor?: string;
		overtimeColor?: string;
		warningThreshold?: number;
		allowOvertime?: boolean;
	} = $props();

	let storeData = $state<TimerEventData | null>(null);
	let unsubscribe: (() => void) | null = null;

	let rawTime = $derived(storeData?.remainingSeconds ?? 0);
	let rawStatus = $derived(storeData?.status ?? "idle");
	
	let status = $derived(!allowOvertime && rawStatus === "overtime" ? "stopped" : rawStatus);
	let time = $derived(!allowOvertime && rawStatus === "overtime" ? 0 : rawTime);
	
	let progress = $derived(storeData?.progressPercent ?? 0);


	let isWarning = $derived(status === "running" && progress >= warningThreshold);
	let isCritical = $derived(status === "overtime");
	let currentColor = $derived(isCritical ? overtimeColor : isWarning ? warningColor : normalColor);

	function formatTime(seconds: number) {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		if (hours > 0) {
			return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
		} else {
			return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
		}
	}

	onMount(() => {
		unsubscribe = timerEvents.subscribe((data) => {
			storeData = data;
		});
	});

	$effect(() => {
		onStatusChange(status);
	});

	$effect(() => {
		onTick(time);
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
	});
</script>

<div
	class="absolute inset-0 flex flex-col items-center justify-center text-white transition-colors duration-500 bg-[#020617] [container-type:size] px-4"
>
	<div
		class="font-mono transition-all duration-500 leading-none"
		class:text-[clamp(1rem,34cqw,42rem)]={Math.floor(time / 3600) === 0}
		class:text-[clamp(1rem,21cqw,40rem)]={Math.floor(time / 3600) > 0}
		style="color: {currentColor}"
	>
		{formatTime(time)}
	</div>

	{#if showProgressBar}
		<div class="w-full flex justify-center mt-[4%]">
			<ProgressBar {progress} baseColor={currentColor} />
		</div>
	{/if}

	{#if showSecondaryClock}
		<div class="mt-[4%]"><SecondaryClock /></div>
	{/if}
</div>
