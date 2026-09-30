<script lang="ts">
    import Viewer from "$features/viewer/viewer.component.svelte";
    import { getApiBaseUrl } from "$shared/api/api";
    import { SettingsState } from "$features/settings/settings.state.svelte";
    import { isTauriEnvironment } from "$shared/platform/tauri";
    import { onMount } from "svelte";
    
    const settings = new SettingsState();

    const apiBase = getApiBaseUrl();

    let closeHandler = $state<(() => void) | undefined>(undefined);

    onMount(async () => {
        // If running inside a Tauri window, provide a close handler
        if (isTauriEnvironment()) {
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
        showProgressBar={settings.showProgressBar}
        showSecondaryClock={settings.showSecondaryClock}
        showClockSeconds={settings.showClockSeconds}
        showClockDate={settings.showClockDate}
        clockDateFormat={settings.clockDateFormat}
        timerNormalColor={settings.timerNormalColor}
        timerWarningColor={settings.timerWarningColor}
        timerOvertimeColor={settings.timerOvertimeColor}
        timerWarningThreshold={settings.timerWarningThreshold}
        timerAllowOvertime={settings.timerAllowOvertime}
    />
</div>
