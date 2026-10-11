<script lang="ts">
	export let progress: number = 0;
	export let baseColor: string = "#ffffff";

	$: clampedProgress = Math.min(Math.max(progress, 0), 100);
</script>

<div 
	class="w-[92%] rounded-full overflow-hidden"
	style="height: 1.5cqh; background-color: {baseColor}1a;"
>
	<div
		class="h-full rounded-full transition-[width] duration-500 ease-out"
		style="width: {clampedProgress}%; background-color: {baseColor};"
	></div>
</div>

<style>
	div.h-full {
		border-radius: 9999px;
	}
</style>


