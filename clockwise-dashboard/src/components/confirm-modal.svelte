<script lang="ts">
  export let visible: boolean = false;
  export let title: string = "Confirm";
  export let message: string = "Are you sure?";
  export let confirmText: string = "Confirm";
  export let cancelText: string = "Cancel";
  export let onConfirm: () => void = () => {};
  export let onCancel: () => void = () => {};

  const handleKey = (e: KeyboardEvent) => {
    if (!visible) return;
    if (e.key === "Escape") onCancel();
    if (e.key === "Enter") onConfirm();
  };

  import { onMount, onDestroy } from "svelte";

  onMount(() => {
    document.addEventListener("keydown", handleKey);
  });

  onDestroy(() => {
    document.removeEventListener("keydown", handleKey);
  });
</script>

{#if visible}
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/60" on:click={onCancel} aria-hidden="true"></div>
    <div class="bg-gray-900 text-white rounded-lg shadow-lg p-4 z-10 w-[90%] max-w-md">
      <div class="text-lg font-semibold mb-2">{title}</div>
      <div class="text-sm mb-4">{message}</div>
      <div class="flex justify-end gap-2">
        <button class="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600" on:click={onCancel}>{cancelText}</button>
        <button class="px-3 py-1 rounded bg-red-600 hover:bg-red-500" on:click={onConfirm}>{confirmText}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* small modal styles kept local; relies on Tailwind-like utility classes in markup */
</style>
