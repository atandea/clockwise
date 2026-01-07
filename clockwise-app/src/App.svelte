<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";

  let remainingSeconds = $state(0);
  let totalSeconds = $state(0);
  let stopped = $state(false);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function calculateTimeToNextHour(): number {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);
    return Math.floor((nextHour.getTime() - now.getTime()) / 1000);
  }

  function getProgressPercent(): number {
    // Progress is relative to the full hour (3600 seconds)
    // remainingSeconds is time left until next hour, so elapsed = 3600 - remainingSeconds
    const elapsedInHour = 3600 - remainingSeconds;
    return (elapsedInHour / 3600) * 100;
  }

  function getTimerColor(): string {
    // Red text in the last minute
    if (remainingSeconds <= 60 || stopped) return "text-red-500";
    return "text-white";
  }

  function handleClose() {
    getCurrentWindow().close();
  }

  onMount(() => {
    totalSeconds = calculateTimeToNextHour();
    remainingSeconds = totalSeconds;

    intervalId = setInterval(() => {
      if (stopped || remainingSeconds <= 0) {
        stopped = true;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        return;
      }
      remainingSeconds--;
    }, 1000);
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
</script>

<main
  class="flex flex-col h-screen bg-[#020617] text-white relative select-none cursor-default overflow-hidden"
>
  <div
    class="w-full h-full flex flex-col items-center justify-center"
    data-tauri-drag-region
  >
    <button
      onclick={handleClose}
      onmousedown={(e) => e.stopPropagation()}
      ontouchstart={(e) => e.stopPropagation()}
      class="absolute top-1 right-1 text-white/10 hover:text-white/70 text-lg w-2 h-2 flex items-center justify-center rounded-full hover:bg-white/10 transition-all cursor-pointer z-50 no-drag"
      aria-label="Close"
    >
      ✕
    </button>

    <!-- Invisible resize zones on all edges and corners -->
    <!-- Top edge -->
    <div
      role="presentation"
      class="absolute top-0 left-2 right-2 h-1.5 cursor-n-resize z-40"
      onmousedown={(e: MouseEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("North");
      }}
      ontouchstart={(e: TouchEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("North");
      }}
    ></div>
    <!-- Bottom edge -->
    <div
      role="presentation"
      class="absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize z-40"
      onmousedown={(e: MouseEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("South");
      }}
      ontouchstart={(e: TouchEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("South");
      }}
    ></div>
    <!-- Left edge -->
    <div
      role="presentation"
      class="absolute left-0 top-2 bottom-2 w-1.5 cursor-w-resize z-40"
      onmousedown={(e: MouseEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("West");
      }}
      ontouchstart={(e: TouchEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("West");
      }}
    ></div>
    <!-- Right edge -->
    <div
      role="presentation"
      class="absolute right-0 top-2 bottom-2 w-1.5 cursor-e-resize z-40"
      onmousedown={(e: MouseEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("East");
      }}
      ontouchstart={(e: TouchEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("East");
      }}
    ></div>
    <!-- Corner: Top-Left -->
    <div
      role="presentation"
      class="absolute top-0 left-0 w-2 h-2 cursor-nw-resize z-50"
      onmousedown={(e: MouseEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("NorthWest");
      }}
      ontouchstart={(e: TouchEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("NorthWest");
      }}
    ></div>
    <!-- Corner: Top-Right -->
    <div
      role="presentation"
      class="absolute top-0 right-0 w-2 h-2 cursor-ne-resize z-50"
      onmousedown={(e: MouseEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("NorthEast");
      }}
      ontouchstart={(e: TouchEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("NorthEast");
      }}
    ></div>
    <!-- Corner: Bottom-Left -->
    <div
      role="presentation"
      class="absolute bottom-0 left-0 w-2 h-2 cursor-sw-resize z-50"
      onmousedown={(e: MouseEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("SouthWest");
      }}
      ontouchstart={(e: TouchEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("SouthWest");
      }}
    ></div>
    <!-- Corner: Bottom-Right -->
    <div
      role="presentation"
      class="absolute bottom-0 right-0 w-2 h-2 cursor-se-resize z-50"
      onmousedown={(e: MouseEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("SouthEast");
      }}
      ontouchstart={(e: TouchEvent) => {
        e.stopPropagation();
        getCurrentWindow().startResizeDragging("SouthEast");
      }}
    ></div>

    <div
      class={`text-[min(22rem,32vw)] font-mono leading-none tabular-nums pointer-events-none transition-colors duration-300 ${getTimerColor()}`}
    >
      {formatTime(remainingSeconds)}
    </div>

    <div
      class="w-full h-3 bg-gray-700/50 rounded absolute bottom-0 left-0 right-0 pointer-events-none"
    >
      <div
        class="h-full bg-green-500 rounded transition-all duration-1000 ease-linear"
        style="width: {Math.min(getProgressPercent(), 100)}%"
      ></div>
    </div>
  </div>
</main>
