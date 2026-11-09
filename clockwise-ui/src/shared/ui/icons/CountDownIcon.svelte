<script lang="ts">
    let {
        width = "24",
        height = "24",
        strokeWidth = "2",
        class: className = ""
    }: {
        width?: string | number;
        height?: string | number;
        strokeWidth?: string | number;
        class?: string;
    } = $props();
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
    aria-hidden="true"
>
    <circle cx="9.5" cy="13" r="7" />
    <path d="M8.5 3.5h2M9.5 3.5v2M9.5 13V9.5M9.5 13h3" />
    <path d="M21 5v6M20 9l1.5 2 1.5-2" />
</svg>