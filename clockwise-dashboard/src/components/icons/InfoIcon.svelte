<script lang="ts">
    let {
        width = "24",
        height = "24",
        strokeWidth = "2",
        class: className = ""
    } = $props<{
        width?: string | number;
        height?: string | number;
        strokeWidth?: string | number;
        class?: string;
    }>();
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    {width}
    {height}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    class={className}
>
    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
</svg>