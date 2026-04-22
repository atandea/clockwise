import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { TimerController } from './timers/timer.controller';
import { DiscoveryController } from './discovery.controller';
import { TimerService } from './timers/timer.service';
import { FileStorageService } from './files/file.service';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
      exclude: ['/timers*', '/discovery*', '/security*', '/settings*'],
      serveStaticOptions: {
        maxAge: '1d',
      },
    }),
  ],
  controllers: [TimerController, DiscoveryController, SecurityController, SettingsController],
  providers: [TimerService, FileStorageService, SecurityService, SettingsService],
})
export class AppModule { }
