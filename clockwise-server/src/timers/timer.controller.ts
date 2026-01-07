import { BadRequestException, Body, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import { TimerService } from './timer.service';
import { Timer } from './timer';
import { Sse, MessageEvent, Param } from '@nestjs/common';
import { TimerEvent } from './timer-event';
import { map, Observable } from 'rxjs';

@Controller("/timers")
export class TimerController {
  constructor(private readonly timerService: TimerService) { }

  @Get()
  getTimers(): Timer[] {
    return this.timerService.getTimers();
  }

  @Post()
  createTimer(@Body() timer: Timer): Timer {
    return this.timerService.createTimer(timer);
  }

  @Post('/stop')
  stopTimer() {
    this.timerService.stopActiveTimer();
  }

  @Post(':id/start')
  startTimer(@Param('id') id: string) {
    const timer = this.timerService.getTimers().find(t => t.id === id);
    if (!timer) {
      throw new Error('Timer not found');
    }
    return this.timerService.startTimer(timer);
  }

  @Sse('subscribe')
  subscribeToStream(): Observable<MessageEvent> {
    const timerStream = this.timerService.subscribeToStream();
    if (!timerStream) {
      throw new NotFoundException(`Timer stream not available`);
    }

    return timerStream.pipe(
      map((event: TimerEvent) => ({
        data: {
          ...event,
          subscribedAt: new Date().toISOString(),
          subscription: true
        },
        type: 'timer-tick'
      }))
    );
  }
}