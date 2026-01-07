import { Module } from '@nestjs/common';
import { TimerController } from './timers/timer.controller';
import { DiscoveryController } from './discovery.controller';
import { TimerService } from './timers/timer.service';
import { FileStorageService } from './files/file.service';

@Module({
  imports: [],
  controllers: [TimerController, DiscoveryController],
  providers: [TimerService, FileStorageService],
})
export class AppModule { }
