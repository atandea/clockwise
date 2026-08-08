import { get } from "svelte/store";
import {
    appLocalIp,
    appServerPin,
    getPin,
    appAuthStatus,
    appSettings,
    getApiBaseUrl,
    fetchWithPin,
} from "./api";
import { toast } from "./toast.svelte";

export interface ClockPreset {
    id: string;
    name: string;
    builtIn: boolean;
}

const BUILT_IN_PRESETS: ClockPreset[] = [
    { id: "default", name: "Default", builtIn: true },
    { id: "minimal", name: "Minimal", builtIn: true },
    { id: "neon-glow", name: "Neon Glow", builtIn: true },
    { id: "sunset", name: "Sunset", builtIn: true },
    { id: "matrix", name: "Matrix", builtIn: true },
];

const PRESETS_STORAGE_KEY = "clockwise_clock_presets";
const SELECTED_PRESET_KEY = "clockwise_selected_preset";
const SHOW_PROGRESS_BAR_KEY = "clockwise_show_progress_bar";
const SHOW_SECONDARY_CLOCK_KEY = "clockwise_show_secondary_clock";
const SHOW_CLOCK_SECONDS_KEY = "clockwise_show_clock_seconds";
const SHOW_CLOCK_DATE_KEY = "clockwise_show_clock_date";
const CLOCK_DATE_FORMAT_KEY = "clockwise_clock_date_format";



export class SettingsState {
    localIp = $state(get(appLocalIp) || "");
    serverPin = $state(get(appServerPin) || "");
    pin = $state(getPin() || "");
    pinEnabled = $state(get(appAuthStatus)?.pinEnabled ?? true);
    autoLaunch = $state(
        get(appSettings)?.launch_fullscreen_on_startup ?? false,
    );
    startAtLogin: boolean | null = $state(null);
    networkAccessEnabled = $state(
        get(appSettings)?.network_access_enabled !== false,
    );
    isTauri = $state(false);
    monitors: any[] = $state([]);
    preferredMonitor = $state(get(appSettings)?.preferred_monitor || "");
    selectedMonitorCandidate = $state(
        get(appSettings)?.preferred_monitor || "",
    );
    // Main window display preference (separate from fullscreen target)
    preferredMainMonitor = $state(get(appSettings)?.preferred_main_monitor || "");
    selectedMainMonitorCandidate = $state(
        get(appSettings)?.preferred_main_monitor || "",
    );
    isLoading = $state(!get(appAuthStatus));

    // Appearance presets
    customPresets: ClockPreset[] = $state([]);
    selectedPresetId: string = $state("default");
    showProgressBar: boolean = $state(true);
    showSecondaryClock: boolean = $state(false);
    showClockSeconds: boolean = $state(false);
    showClockDate: boolean = $state(false);
    clockDateFormat: string = $state("DD/MM/YYYY");
    
    // Timer specific appearance
    timerNormalColor: string = $state("#ffffff");
    timerWarningColor: string = $state("#eab308");
    timerOvertimeColor: string = $state("#ef4444");
    timerWarningThreshold: number = $state(80);
    timerAllowOvertime: boolean = $state(true);

    constructor() {
        appSettings.subscribe((data) => {
            if (data) {
                this.loadFromBackend(data);
            }
        });
    }

    loadFromBackend(data: any) {
        this.autoLaunch = !!data.launch_fullscreen_on_startup;
        this.networkAccessEnabled = data.network_access_enabled !== false;
        this.preferredMonitor = data.preferred_monitor || "";
        this.selectedMonitorCandidate = this.preferredMonitor;
        this.preferredMainMonitor = data.preferred_main_monitor || "";
        this.selectedMainMonitorCandidate = this.preferredMainMonitor;
        
        if (data.show_progress_bar !== undefined) this.showProgressBar = data.show_progress_bar;
        if (data.show_secondary_clock !== undefined) this.showSecondaryClock = data.show_secondary_clock;
        if (data.show_clock_seconds !== undefined) this.showClockSeconds = data.show_clock_seconds;
        if (data.show_clock_date !== undefined) this.showClockDate = data.show_clock_date;
        if (data.clock_date_format) this.clockDateFormat = data.clock_date_format;
        if (data.selected_preset_id) this.selectedPresetId = data.selected_preset_id;
        if (data.custom_presets) this.customPresets = data.custom_presets;
        
        if (data.timer_normal_color) this.timerNormalColor = data.timer_normal_color;
        if (data.timer_warning_color) this.timerWarningColor = data.timer_warning_color;
        if (data.timer_overtime_color) this.timerOvertimeColor = data.timer_overtime_color;
        if (data.timer_warning_threshold !== undefined) this.timerWarningThreshold = data.timer_warning_threshold;
        if (data.timer_allow_overtime !== undefined) this.timerAllowOvertime = data.timer_allow_overtime;
    }

    async updateBackendSetting(key: string, value: any) {
        try {
            const apiBase = getApiBaseUrl();
            const res = await fetchWithPin(`${apiBase}/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [key]: value }),
            });
            if (res.ok) {
                toast.success("Appearance updated");
            } else {
                toast.error("Failed to save appearance");
            }
        } catch (err) {
            console.error(`Failed to save ${key} to backend:`, err);
            toast.error("Connection error");
        }
    }

    get allPresets(): ClockPreset[] {
        return [...BUILT_IN_PRESETS, ...this.customPresets];
    }

    get selectedPreset(): ClockPreset | undefined {
        return this.allPresets.find((p) => p.id === this.selectedPresetId);
    }

    selectPreset(id: string) {
        this.selectedPresetId = id;
        this.updateBackendSetting("selected_preset_id", id);
    }

    toggleProgressBar() {
        this.showProgressBar = !this.showProgressBar;
        this.updateBackendSetting("show_progress_bar", this.showProgressBar);
    }

    toggleSecondaryClock() {
        this.showSecondaryClock = !this.showSecondaryClock;
        this.updateBackendSetting("show_secondary_clock", this.showSecondaryClock);
    }

    toggleClockSeconds() {
        this.showClockSeconds = !this.showClockSeconds;
        this.updateBackendSetting("show_clock_seconds", this.showClockSeconds);
    }

    toggleClockDate() {
        this.showClockDate = !this.showClockDate;
        this.updateBackendSetting("show_clock_date", this.showClockDate);
    }

    setClockDateFormat(format: string) {
        this.clockDateFormat = format;
        this.updateBackendSetting("clock_date_format", format);
    }

    setTimerNormalColor(color: string) {
        this.timerNormalColor = color;
        this.updateBackendSetting("timer_normal_color", color);
    }

    setTimerWarningColor(color: string) {
        this.timerWarningColor = color;
        this.updateBackendSetting("timer_warning_color", color);
    }

    setTimerOvertimeColor(color: string) {
        this.timerOvertimeColor = color;
        this.updateBackendSetting("timer_overtime_color", color);
    }

    setTimerWarningThreshold(threshold: number) {
        this.timerWarningThreshold = threshold;
        this.updateBackendSetting("timer_warning_threshold", threshold);
    }

    toggleTimerAllowOvertime() {
        this.timerAllowOvertime = !this.timerAllowOvertime;
        this.updateBackendSetting("timer_allow_overtime", this.timerAllowOvertime);
    }

    savePreset(name: string) {
        const id = `custom-${Date.now()}`;
        const preset: ClockPreset = { id, name, builtIn: false };
        this.customPresets = [...this.customPresets, preset];
        this.updateBackendSetting("custom_presets", this.customPresets);
        this.selectPreset(id);
    }

    deletePreset(id: string) {
        this.customPresets = this.customPresets.filter((p) => p.id !== id);
        this.updateBackendSetting("custom_presets", this.customPresets);
        if (this.selectedPresetId === id) {
            this.selectPreset("default");
        }
    }

    get localAccessUrl() {
        return `http://${this.localIp || "localhost"}:4100`;
    }

    get displayUrl() {
        return this.networkAccessEnabled
            ? this.localAccessUrl
            : `http://localhost:4100`;
    }

    get isMonitorOnline() {
        return this.preferredMonitor
            ? this.monitors.some((m) => m.name === this.preferredMonitor)
            : false;
    }

    get isMainMonitorOnline() {
        return this.preferredMainMonitor
            ? this.monitors.some((m) => m.name === this.preferredMainMonitor)
            : false;
    }

    get hasDiscardedChanges() {
        return this.selectedMonitorCandidate !== this.preferredMonitor;
    }

    get hasDiscardedMainChanges() {
        return this.selectedMainMonitorCandidate !== this.preferredMainMonitor;
    }

    async setPreferredMainMonitor(monitorName: string) {
        this.preferredMainMonitor = monitorName;
        try {
            await this.updateBackendSetting("preferred_main_monitor", monitorName);
        } catch (err) {
            console.error("Failed to save preferred_main_monitor:", err);
        }
    }
}
