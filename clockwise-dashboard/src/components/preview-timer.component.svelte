<script lang="ts">
	import ProgressBar from "./progress-bar.component.svelte";
	import SecondaryClock from "./secondary-clock.component.svelte";

	let {
		time = 60,
		progress = 0,
		showProgressBar = true,
		showSecondaryClock = false,
		status = "running",
		normalColor = "#ffffff",
		warningColor = "#eab308",
		overtimeColor = "#ef4444",
		warningThreshold = 80,
		allowOvertime = true,
	}: {
		time?: number;
		progress?: number;
		showProgressBar?: boolean;
		showSecondaryClock?: boolean;
		status?: string;
		normalColor?: string;
		warningColor?: string;
		overtimeColor?: string;
		warningThreshold?: number;
		allowOvertime?: boolean;
	} = $props();

	let computedStatus = $derived(!allowOvertime && status === "overtime" ? "stopped" : status);
	let displayTime = $derived(!allowOvertime && status === "overtime" ? 0 : time);

	let isWarning = $derived(computedStatus === "running" && progress >= warningThreshold);
	let isCritical = $derived(computedStatus === "overtime");
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
</script>

<div
	class="absolute inset-0 flex flex-col items-center justify-center text-white transition-colors duration-500 bg-[#020617] [container-type:size] px-4"
>
	<div
		class="font-mono transition-all duration-500 leading-none"
		class:text-[clamp(1rem,34cqw,42rem)]={Math.floor(displayTime / 3600) === 0}
		class:text-[clamp(1rem,21cqw,40rem)]={Math.floor(displayTime / 3600) > 0}
		style="color: {currentColor}"
	>
		{formatTime(displayTime)}
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
