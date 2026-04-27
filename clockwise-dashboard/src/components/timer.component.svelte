<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import ProgressBar from "./progress-bar.component.svelte";
	import { timerEvents, type TimerEventData } from "../lib/api";

	let {
		onStatusChange = () => {},
		onTick = (seconds: number) => {},
	}: {
		onStatusChange?: (status: string) => void;
		onTick?: (seconds: number) => void;
	} = $props();

	let storeData = $state<TimerEventData | null>(null);
	let unsubscribe: (() => void) | null = null;

	let time = $derived(storeData?.remainingSeconds ?? 0);
	let status = $derived(storeData?.status ?? "idle");
	let progress = $derived(storeData?.progressPercent ?? 0);

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

	onMount(() => {
		unsubscribe = timerEvents.subscribe((data) => {
			storeData = data;
			onStatusChange(data.status);
			onTick(data.remainingSeconds);
		});
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
	});
</script>

<div
	class="absolute inset-0 flex flex-col items-center justify-center text-white transition-colors duration-500 bg-[#020617] [container-type:size] px-4 pb-[3%]"
>
	<div
		class="mb-4 font-mono transition-all duration-500"
		class:text-[clamp(1rem,34cqw,42rem)]={Math.floor(time / 3600) === 0}
		class:text-[clamp(1rem,21cqw,40rem)]={Math.floor(time / 3600) > 0}
		class:text-yellow-500={isWarning}
		class:text-red-500={isCritical}
	>
		{formatTime(time)}
	</div>

	<ProgressBar {progress} />
</div>
