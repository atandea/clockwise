<script lang="ts">
    let {
        size = "20",
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
    viewBox="0 0 20 20"
    fill="currentColor"
    class={className}
>
    <path
        d="M13.28 7.78l3.22-3.22v2.69a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.69l-3.22 3.22a.75.75 0 001.06 1.06zM2 17.25v-4.5a.75.75 0 011.5 0v2.69l3.22-3.22a.75.75 0 011.06 1.06L4.56 16.5h2.69a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z"
    />
</svg>
