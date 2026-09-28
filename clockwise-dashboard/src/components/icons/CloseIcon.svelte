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
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>
