import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService, DashboardSettings } from './settings.service';
import { SecurityGuard } from './security.guard';

@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Get()
    getSettings(): DashboardSettings {
        return this.settingsService.getSettings();
    }

    @Post()
    @UseGuards(SecurityGuard)
    updateSettings(@Body() body: Partial<DashboardSettings>): DashboardSettings {
        return this.settingsService.updateSettings(body);
    }
}
