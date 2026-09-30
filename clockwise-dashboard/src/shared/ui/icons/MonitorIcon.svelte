<script lang="ts">
    let {
        size = "24",
        width = size,
        height = size,
        class: className = ""
    } = $props<{
        size?: string | number;
        width?: string | number;
        height?: string | number;
        class?: string;
    }>();
</script>

<svg
    xmlns="http://www.w3.org/2000/svg"
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="currentColor"
    class={className}
>
    <path
        d="M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6 14h6v1a1 1 0 01-1 1h-4a1 1 0 01-1-1v-1z"
    />
</svg>
