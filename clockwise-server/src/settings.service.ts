import { Injectable } from '@nestjs/common';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import * as path from 'node:path';

export interface DashboardSettings {
    preferred_monitor?: string;
    launch_fullscreen_on_startup?: boolean;
    pin_lock_enabled?: boolean;
    pin_lock_at_startup?: boolean;
    [key: string]: any;
}

@Injectable()
export class SettingsService {
    private readonly settingsPath: string;

    constructor() {
        const dataPath = process.env.APP_DATA_FILE || './data/data.json';
        this.settingsPath = path.join(path.dirname(dataPath), 'settings.json');
    }

    private cache: DashboardSettings | null = null;

    public getSettings(): DashboardSettings {
        if (this.cache) return this.cache;
        if (!existsSync(this.settingsPath)) return {};
        try {
            const content = readFileSync(this.settingsPath, 'utf8');
            this.cache = JSON.parse(content);
            return this.cache || {};
        } catch (err) {
            console.error(err);
            return {};
        }
    }

    public updateSettings(updates: Partial<DashboardSettings>): DashboardSettings {
        const current = this.getSettings();
        const merged = { ...current, ...updates };
        this.cache = merged;

        const dir = path.dirname(this.settingsPath);
        if (!existsSync(dir)) {
            require('node:fs').mkdirSync(dir, { recursive: true });
        }

        writeFileSync(this.settingsPath, JSON.stringify(merged, null, 2));
        return merged;
    }
}
