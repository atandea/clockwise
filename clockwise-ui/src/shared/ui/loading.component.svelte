<script lang="ts">
  let { subtext = "" } = $props();
</script>

<div class="flex-1 flex flex-col items-center justify-center p-4">
  <div class="relative w-16 h-16 mb-8 group">
    <div
      class="absolute inset-0 rounded-full border-4 border-indigo-500/10 scale-110 blur-sm group-hover:border-indigo-500/20 transition-all duration-700"
    ></div>
    <div
      class="absolute inset-0 rounded-full border-4 border-t-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] animate-spin"
    ></div>
    <div
      class="absolute inset-2 rounded-full border-4 border-blue-400/10 scale-110 blur-sm group-hover:border-blue-400/20 transition-all duration-700"
    ></div>
    <div
      class="absolute inset-2 rounded-full border-4 border-b-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.3)] animate-spin-slow"
    ></div>

    <div class="absolute inset-0 flex items-center justify-center">
      <div
        class="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white] animate-pulse"
      ></div>
    </div>
  </div>

  <div
    class="text-center animate-in fade-in slide-in-from-bottom-2 duration-700"
  >
    <h2
      class="text-xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent"
    >
      Clockwise
    </h2>
    {#if subtext}
      <p
        class="text-[10px] text-indigo-400 font-mono uppercase tracking-[0.2em] font-bold"
      >
        {subtext}
      </p>
    {:else}
      <p
        class="text-[10px] text-gray-500 font-mono uppercase tracking-[0.2em] font-bold"
      >
        Starting service...
      </p>
    {/if}
  </div>
</div>

<style>
  @keyframes spin-slow {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(-360deg);
    }
  }
  .animate-spin-slow {
    animation: spin-slow 2s linear infinite;
  }
</style>
