<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { timerEvents } from "../lib/api";

	let {
		onStatusChange = () => {},
	}: {
		onStatusChange?: (status: string) => void;
	} = $props();

	let now = $state(new Date());
	let tickInterval: number | null = null;
	let unsubscribe: (() => void) | null = null;

	function formatTime(date: Date) {
		const hours = date.getHours().toString().padStart(2, "0");
		const minutes = date.getMinutes().toString().padStart(2, "0");
		return `${hours}:${minutes}`;
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
	class="absolute inset-0 flex flex-col items-center justify-center text-white transition-colors duration-500 bg-[#020617]"
>
	<div
		class="font-mono transition-all duration-500 text-[clamp(1rem,34cqw,42rem)]"
	>
		{formatTime(now)}
	</div>
</div>
