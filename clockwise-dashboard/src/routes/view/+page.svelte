<script lang="ts">
    import Viewer from "../../components/viewer.component.svelte";
    import { getApiBaseUrl } from "$lib/api";
    import { onMount } from "svelte";

    const apiBase = getApiBaseUrl();

    let closeHandler = $state<(() => void) | undefined>(undefined);

    onMount(async () => {
        // If running inside a Tauri window, provide a close handler
        if ("__TAURI_INTERNALS__" in window) {
            try {
                const { getCurrentWindow } = await import(
                    "@tauri-apps/api/window"
                );
                const win = getCurrentWindow();
                closeHandler = () => {
                    win.close();
                };
            } catch (err) {
                console.error("Failed to set up Tauri close handler:", err);
            }
        }
    });
</script>

<div class="fixed inset-0 bg-gray-900 text-white overflow-hidden">
    <Viewer
        allowFullscreen={true}
        onClose={closeHandler}
    />
</div>
