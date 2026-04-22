import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BehaviorSubject, interval, map, Observable } from 'rxjs';
import { FileStorageService } from 'src/files/file.service';
import { Timer } from './timer';
import { TimerEvent } from './timer-event';
import { TimerInstance } from './timer-instance';

@Injectable()
export class TimerService {
  constructor(private readonly fileStorageService: FileStorageService) { }

  private ephemeralTimers = new Map<string, Timer>();
  private activeTimerSubject = new BehaviorSubject<any>({ status: 'idle', remainingSeconds: 0 });
  private activeTimerInstance: TimerInstance | null = null;
  private overtime = 0;
  private activeSubscription: any;
  private countdown$ = interval(1000).pipe(
    map(() => {
      if (this.activeTimerInstance?.status === 'stopped' || !this.activeTimerInstance) {
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
    console.log('Starting timer:', timer.id, '(', timer.name, ')');
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

    // Emit initial state immediately
    const initialEvent: TimerEvent = {
      status: 'running',
      timerId: this.activeTimerInstance.id,
      name: this.activeTimerInstance.name,
      remainingSeconds: this.activeTimerInstance.remainingSeconds,
      totalSeconds: this.activeTimerInstance.duration,
      progressPercent: 0,
      message: `${this.activeTimerInstance.name}: Starting...`,
    };
    this.activeTimerSubject.next(initialEvent);

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
      if (this.activeSubscription) {
        this.activeSubscription.unsubscribe();
        this.activeSubscription = undefined;
      }
      // Emit stopped status
      this.activeTimerSubject.next({
        status: 'stopped',
        timerId: this.activeTimerInstance.id,
        remainingSeconds: 0
      });
    }
  }

  pauseActiveTimer() {
    if (this.activeTimerInstance?.status === 'running') {
      this.activeTimerInstance.status = 'paused';
      if (this.activeSubscription) {
        this.activeSubscription.unsubscribe();
        this.activeSubscription = undefined;
      }
      this.activeTimerSubject.next({
        status: 'paused',
        timerId: this.activeTimerInstance.id,
        name: this.activeTimerInstance.name,
        remainingSeconds: this.activeTimerInstance.remainingSeconds,
        totalSeconds: this.activeTimerInstance.duration,
        progressPercent: this.activeTimerInstance.progressPercent
      });
    }
  }

  resumeActiveTimer() {
    if (this.activeTimerInstance?.status === 'paused') {
      this.activeTimerInstance.status = 'running';
      this.activeSubscription = this.countdown$.subscribe({
        next: (event) => this.activeTimerSubject.next(event),
        error: (err) => this.activeTimerSubject.error(err)
      });
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
    return this.getTimerById(timerId);
  }

  getTimerById(timerId: string): Timer | undefined {
    if (this.ephemeralTimers.has(timerId)) {
      return this.ephemeralTimers.get(timerId);
    }
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


  createTimer(timer: Timer, temporary: boolean = false): Timer {
    console.log('Creating timer:', timer, 'temporary:', temporary);
    timer.id = randomUUID();
    timer.createdAt = new Date();

    if (temporary) {
      this.ephemeralTimers.set(timer.id, timer);
      return timer;
    }

    const timers = this.fileStorageService.readData();
    timers.push(timer);
    this.fileStorageService.writeData(timers);
    return timer;
  }

  deleteTimer(id: string) {
    if (this.ephemeralTimers.has(id)) {
      this.ephemeralTimers.delete(id);
      return;
    }
    const timers = this.fileStorageService.readData();
    const updatedTimers = timers.filter((timer: any) => timer.id !== id);
    this.fileStorageService.writeData(updatedTimers);
  }


  getTimers(): Timer[] {
    const timers = this.fileStorageService.readData().map((timer: any) => {
      return {
        id: timer.id,
        name: timer.name,
        duration: timer.duration,
        unit: timer.unit,
        createdAt: timer.createdAt,
      } as Timer;
    });

    return timers.sort((a, b) => {
      const aSecs = this.convertToSeconds(a.duration, a.unit);
      const bSecs = this.convertToSeconds(b.duration, b.unit);
      return aSecs - bSecs;
    });
  }
}
