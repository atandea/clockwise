import { Module } from '@nestjs/common';
import { TimerController } from './timers/timer.controller';
import { TimerService } from './timers/timer.service';
import { FileStorageService } from './files/file.service';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [TimerController, SecurityController, SettingsController],
  providers: [TimerService, FileStorageService, SecurityService, SettingsService],
})
export class AppModule { }
