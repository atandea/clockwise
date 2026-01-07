<script lang="ts">
	export let progress: number = 0;
</script>

<div 
	class="absolute bg-white/10 backdrop-blur-md rounded-full overflow-hidden"
	style="
		height: 1.5cqh; 
		bottom: 8cqh; 
		left: 4cqw; 
		right: 4cqw;
	"
>
	<div
		class="h-full bg-white transition-transform duration-500 ease-out will-change-transform"
		style="transform: scaleX({Math.min(Math.max(progress, 0), 100) / 100}); transform-origin: left;"
	></div>
</div>

<style>
	div.h-full {
		border-radius: 9999px;
	}
</style>


