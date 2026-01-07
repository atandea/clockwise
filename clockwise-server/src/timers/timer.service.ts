import { Injectable, MessageEvent } from '@nestjs/common';
import { Timer } from './timer';
import { FileStorageService } from 'src/files/file.service';
import { randomUUID } from 'node:crypto';
import { interval, map, Observable, Subject } from 'rxjs';
import { TimerEvent } from './timer-event';
import { TimerInstance } from './timer-instance';

@Injectable()
export class TimerService {
  constructor(private readonly fileStorageService: FileStorageService) { }

  private activeTimerSubject = new Subject<any>();
  private activeTimerInstance: TimerInstance | null = null;
  private overtime = 0;
  private activeSubscription: any;
  private countdown$ = interval(1000).pipe(
    map(() => {
      if ((this.activeTimerInstance && this.activeTimerInstance.status === 'stopped') || !this.activeTimerInstance) {
        return {
          status: "stopped",
          remainingSeconds: 0
        }
      } else if (this.activeTimerInstance.status === 'overtime' || this.activeTimerInstance.remainingSeconds <= 0) {
        this.activeTimerInstance.status = 'overtime';
        const event = {
          status: 'overtime',
          timerId: this.activeTimerInstance.id,
          remainingSeconds: this.overtime
        };
        this.overtime++;
        return event
      } else {
        const event: TimerEvent = {
          status: 'running',
          timerId: this.activeTimerInstance.id,
          name: this.activeTimerInstance.name,
          remainingSeconds: this.activeTimerInstance.remainingSeconds,
          totalSeconds: this.activeTimerInstance.duration,
          progressPercent: this.activeTimerInstance.progressPercent,
          message: `${this.activeTimerInstance.name}: ${this.formatTime(this.activeTimerInstance.remainingSeconds, this.activeTimerInstance.unit)} remaining`,
        };
        this.activeTimerInstance.remainingSeconds--;
        this.activeTimerInstance.progressPercent = Math.round(((this.activeTimerInstance.duration - this.activeTimerInstance.remainingSeconds) / this.activeTimerInstance.duration) * 100);
        return event;
      }
    })
  );

  startTimer(timer: Timer) {
    this.overtime = 0;
    if (this.activeSubscription) {
      this.activeSubscription.unsubscribe();
    }
    this.activeTimerInstance = {
      id: timer.id,
      name: timer.name,
      duration: this.convertToSeconds(timer.duration, timer.unit),
      unit: timer.unit,
      remainingSeconds: this.convertToSeconds(timer.duration, timer.unit),
      progressPercent: 0,
      status: 'running'
    };

    this.activeSubscription = this.countdown$.subscribe({
      next: (event) => this.activeTimerSubject.next(event),
      error: (err) => this.activeTimerSubject.error(err)
    });

    return this.activeTimerInstance;
  }


  stopActiveTimer() {
    if (this.activeTimerInstance) {
      this.activeTimerInstance.status = 'stopped';
      this.overtime = 0;
    }
  }

  subscribeToStream(): Observable<TimerEvent> | null {
    const subject = this.activeTimerSubject;
    if (!subject) {
      return null;
    }
    return subject.asObservable();
  }

  getTimerInfo(timerId: string): Timer | undefined {
    const timers = this.fileStorageService.readData();
    return timers.find(timer => timer.id === timerId);
  }

  private convertToSeconds(duration: number, unit: 'seconds' | 'minutes' | 'hours'): number {
    switch (unit) {
      case 'seconds':
        return duration;
      case 'minutes':
        return duration * 60;
      case 'hours':
        return duration * 3600;
      default:
        return duration;
    }
  }

  private formatTime(seconds: number, originalUnit: 'seconds' | 'minutes' | 'hours'): string {
    if (originalUnit === 'hours') {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else if (originalUnit === 'minutes') {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  }


  createTimer(timer: Timer): Timer {
    console.log('Creating timer:', timer);
    timer.id = randomUUID();
    timer.createdAt = new Date();
    const timers = this.fileStorageService.readData();
    timers.push(timer);
    this.fileStorageService.writeData(timers);
    return timer;
  }


  getTimers(): Timer[] {
    return this.fileStorageService.readData().map((timer: any) => {
      return {
        id: timer.id,
        name: timer.name,
        duration: timer.duration,
        unit: timer.unit,
        createdAt: timer.createdAt
      };
    });
  }
}
