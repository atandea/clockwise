<script lang="ts">
	export let progress: number = 0;
	export let baseColor: string = "#ffffff";
</script>

<div 
	class="w-[92%] backdrop-blur-md rounded-full overflow-hidden"
	style="height: 1.5cqh; background-color: {baseColor}1a;"
>
	<div
		class="h-full transition-transform duration-500 ease-out will-change-transform"
		style="transform: scaleX({Math.min(Math.max(progress, 0), 100) / 100}); transform-origin: left; background-color: {baseColor};"
	></div>
</div>

<style>
	div.h-full {
		border-radius: 9999px;
	}
</style>


