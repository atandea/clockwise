import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService, DashboardSettings } from './settings.service';
import { SecurityGuard } from './security.guard';
import { TimerService } from './timers/timer.service';

@Controller('settings')
@UseGuards(SecurityGuard)
export class SettingsController {
    constructor(
        private readonly settingsService: SettingsService,
        private readonly timerService: TimerService
    ) {}

    @Get()
    getSettings(): DashboardSettings {
        return this.settingsService.getSettings();
    }

    @Post()
    updateSettings(@Body() body: Partial<DashboardSettings>): DashboardSettings {
        const result = this.settingsService.updateSettings(body);
        this.timerService.emitSettingsUpdated();
        return result;
    }
}
