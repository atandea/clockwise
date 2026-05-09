<script lang="ts">
	import { onMount, onDestroy } from "svelte";

	let now = $state(new Date());
	let clockInterval: any;

	onMount(() => {
		clockInterval = setInterval(() => {
			now = new Date();
		}, 1000);
	});

	onDestroy(() => {
		if (clockInterval) clearInterval(clockInterval);
	});
</script>

<div class="font-mono text-[clamp(1rem,14cqw,16rem)] opacity-40">
	{now.getHours().toString().padStart(2, "0")}:{now
		.getMinutes()
		.toString()
		.padStart(2, "0")}
</div>
