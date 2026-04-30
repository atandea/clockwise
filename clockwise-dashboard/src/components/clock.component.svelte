<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { timerEvents } from "../lib/api";

	let {
		onStatusChange = () => {},
		showSeconds = false,
		showDate = false,
		dateFormat = "DD/MM/YYYY",
	}: {
		onStatusChange?: (status: string) => void;
		showSeconds?: boolean;
		showDate?: boolean;
		dateFormat?: string;
	} = $props();

	let now = $state(new Date());
	let tickInterval: number | null = null;
	let unsubscribe: (() => void) | null = null;

	function formatTime(date: Date) {
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");
		const seconds = date.getSeconds().toString().padStart(2, "0");
		return showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
	}

	function formatDate(date: Date) {
		const d = date.getDate().toString().padStart(2, "0");
		const m = (date.getMonth() + 1).toString().padStart(2, "0");
		const y = date.getFullYear();
		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		const mName = monthNames[date.getMonth()];

		switch (dateFormat) {
			case "MM/DD/YYYY": return `${m}/${d}/${y}`;
			case "YYYY-MM-DD": return `${y}-${m}-${d}`;
			case "MMM D, YYYY": return `${mName} ${date.getDate()}, ${y}`;
			case "DD/MM/YYYY":
			default: return `${d}/${m}/${y}`;
		}
	}

	onMount(() => {
		// update local clock every second
		tickInterval = window.setInterval(() => {
			now = new Date();
		}, 1000);

		unsubscribe = timerEvents.subscribe((data) => {
			onStatusChange(data.status);
		});
	});

	onDestroy(() => {
		if (tickInterval !== null) {
			clearInterval(tickInterval);
			tickInterval = null;
		}
		if (unsubscribe) unsubscribe();
	});
</script>

<div
	class="absolute inset-0 flex flex-col items-center justify-center text-white transition-colors duration-500 bg-[#020617] [container-type:size] px-4"
>
	<div
		class="font-mono transition-all duration-500 leading-none"
		class:text-[clamp(1rem,34cqw,42rem)]={!showSeconds}
		class:text-[clamp(1rem,21cqw,40rem)]={showSeconds}
	>
		{formatTime(now)}
	</div>

	{#if showDate}
		<div class="mt-[4%] font-mono text-[clamp(1rem,10cqw,12rem)] opacity-40">
			{formatDate(now)}
		</div>
	{/if}
</div>
