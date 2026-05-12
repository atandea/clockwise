<script lang="ts">
	import ProgressBar from "./progress-bar.component.svelte";
	import SecondaryClock from "./secondary-clock.component.svelte";

	let {
		time = 60,
		progress = 0,
		showProgressBar = true,
		showSecondaryClock = false,
		status = "running"
	}: {
		time?: number;
		progress?: number;
		showProgressBar?: boolean;
		showSecondaryClock?: boolean;
		status?: string;
	} = $props();

	let isWarning = $derived(status === "running" && progress >= 80);
	let isCritical = $derived(status === "overtime");

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
		class:text-[clamp(1rem,34cqw,42rem)]={Math.floor(time / 3600) === 0}
		class:text-[clamp(1rem,21cqw,40rem)]={Math.floor(time / 3600) > 0}
		class:text-yellow-500={isWarning}
		class:text-red-500={isCritical}
	>
		{formatTime(time)}
	</div>

	{#if showProgressBar}
		<div class="w-full flex justify-center mt-[4%]">
			<ProgressBar {progress} />
		</div>
	{/if}

	{#if showSecondaryClock}
		<div class="mt-[4%]"><SecondaryClock /></div>
	{/if}
</div>
