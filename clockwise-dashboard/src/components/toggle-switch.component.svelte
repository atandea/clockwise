<script lang="ts">
    let {
        checked,
        onToggle,
        label,
    }: { checked: boolean; onToggle: () => void; label: string } = $props();
</script>

<button
    class="relative flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 {checked
        ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]'
        : 'bg-gray-800'}"
    onclick={onToggle}
    aria-label={label}
>
    <span
        class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 {checked
            ? 'translate-x-6'
            : 'translate-x-1'} shadow-sm"
    ></span>
</button>
