import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { TimerController } from './timers/timer.controller';
import { TimerService } from './timers/timer.service';
import { FileStorageService } from './files/file.service';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 5,
        },
      ],
      errorMessage:
        'Too many security attempts. Please wait a minute before trying again.',
    }),
  ],
  controllers: [TimerController, SecurityController, SettingsController],
  providers: [
    TimerService,
    FileStorageService,
    SecurityService,
    SettingsService,
  ],
})
export class AppModule {}
