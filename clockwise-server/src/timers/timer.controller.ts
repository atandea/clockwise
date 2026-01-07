import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { TimerService } from './timer.service';
import { Timer } from './timer';
import { Sse, MessageEvent, Param } from '@nestjs/common';
import { TimerEvent } from './timer-event';
import { map, Observable } from 'rxjs';
import { SecurityGuard } from '../security.guard';

@Controller("/timers")
@UseGuards(SecurityGuard)
export class TimerController {
  constructor(private readonly timerService: TimerService) { }

  @Get()
  getTimers(): Timer[] {
    return this.timerService.getTimers();
  }

  @Post()
  createTimer(@Body() body: any): Timer {
    const { temporary, ...timer } = body;
    return this.timerService.createTimer(timer, temporary);
  }

  @Post('/stop')
  stopTimer() {
    this.timerService.stopActiveTimer();
  }

  @Post('/pause')
  pauseTimer() {
    this.timerService.pauseActiveTimer();
  }

  @Post('/resume')
  resumeTimer() {
    this.timerService.resumeActiveTimer();
  }

  @Post(':id/start')
  startTimer(@Param('id') id: string) {
    const timer = this.timerService.getTimerById(id);
    if (!timer) {
      throw new Error('Timer not found');
    }
    return this.timerService.startTimer(timer);
  }

  @Delete(':id')
  deleteTimer(@Param('id') id: string) {
    this.timerService.deleteTimer(id);
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