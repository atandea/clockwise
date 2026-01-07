import { Injectable } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import * as path from 'path';

export interface DashboardSettings {
    preferred_monitor?: string;
    launch_fullscreen_on_startup?: boolean;
    [key: string]: any;
}

@Injectable()
export class SettingsService {
    private readonly settingsPath: string;

    constructor() {
        const dataPath = process.env.APP_DATA_FILE || './data/data.json';
        this.settingsPath = path.join(path.dirname(dataPath), 'settings.json');
    }

    public getSettings(): DashboardSettings {
        if (!existsSync(this.settingsPath)) return {};
        try {
            const content = readFileSync(this.settingsPath, 'utf8');
            return JSON.parse(content);
        } catch (err) {
            return {};
        }
    }

    public updateSettings(updates: Partial<DashboardSettings>): DashboardSettings {
        const current = this.getSettings();
        const merged = { ...current, ...updates };

        const dir = path.dirname(this.settingsPath);
        if (!existsSync(dir)) {
            require('fs').mkdirSync(dir, { recursive: true });
        }

        writeFileSync(this.settingsPath, JSON.stringify(merged, null, 2));
        return merged;
    }
}
