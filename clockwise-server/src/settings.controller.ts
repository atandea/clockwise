import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppThrottlerGuard } from './throttler.guard';
import { SettingsService, DashboardSettings } from './settings.service';
import { SecurityGuard } from './security.guard';
import { TimerService } from './timers/timer.service';

@Controller('settings')
@UseGuards(AppThrottlerGuard, SecurityGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly timerService: TimerService,
  ) {}

  @Get()
  getSettings(): DashboardSettings {
    return this.settingsService.getSettings();
  }

  @Post()
  updateSettings(@Body() body: Partial<DashboardSettings>): DashboardSettings {
    if (
      body.timer_mode !== undefined &&
      body.timer_mode !== 'countdown' &&
      body.timer_mode !== 'countup'
    ) {
      throw new BadRequestException('timer_mode must be countdown or countup');
    }

    const result = this.settingsService.updateSettings(body);
    this.timerService.emitSettingsUpdated();
    if (body.timer_mode !== undefined) {
      this.timerService.setTimerMode(body.timer_mode);
    }
    return result;
  }
}
