import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BehaviorSubject, interval, map, Observable } from 'rxjs';
import { FileStorageService } from 'src/files/file.service';
import { SettingsService } from 'src/settings.service';
import { Timer } from './timer';
import { TimerEvent } from './timer-event';
import { TimerInstance } from './timer-instance';
import type { TimerMode } from './timer-instance';

@Injectable()
export class TimerService {
  constructor(
    private readonly fileStorageService: FileStorageService,
    private readonly settingsService: SettingsService,
  ) {}

  private activeTimerInstance: TimerInstance | null = null;
  private activeSubscription: any;
  private readonly ephemeralTimers = new Map<string, Timer>();
  private readonly activeTimerSubject = new BehaviorSubject<any>({
    status: 'idle',
    remainingSeconds: 0,
  });
  private readonly ticker$ = interval(1000).pipe(
    map(() => this.advanceActiveTimer()),
  );

  startTimer(timer: Timer) {
    console.log('Starting timer:', timer.id, '(', timer.name, ')');
    if (this.activeSubscription) {
      this.activeSubscription.unsubscribe();
    }
    const duration = this.convertToSeconds(timer.duration, timer.unit);
    this.activeTimerInstance = {
      id: timer.id,
      name: timer.name,
      duration,
      unit: timer.unit,
      mode: this.getConfiguredMode(),
      elapsedSeconds: 0,
      remainingSeconds: duration,
      progressPercent: 0,
      status: 'running',
    };

    // Emit initial state immediately
    const initialEvent: TimerEvent = {
      status: 'running',
      timerId: this.activeTimerInstance.id,
      name: this.activeTimerInstance.name,
      remainingSeconds: this.activeTimerInstance.remainingSeconds,
      elapsedSeconds: 0,
      totalSeconds: this.activeTimerInstance.duration,
      progressPercent: 0,
      mode: this.activeTimerInstance.mode,
      message: `${this.activeTimerInstance.name}: Starting...`,
    };
    this.activeTimerSubject.next(initialEvent);

    this.activeSubscription = this.ticker$.subscribe({
      next: (event) => this.activeTimerSubject.next(event),
      error: (err) => this.activeTimerSubject.error(err),
    });

    return this.activeTimerInstance;
  }

  stopActiveTimer() {
    if (this.activeTimerInstance) {
      this.activeTimerInstance.status = 'stopped';
      if (this.activeSubscription) {
        this.activeSubscription.unsubscribe();
        this.activeSubscription = undefined;
      }
      // Emit stopped status
      this.activeTimerSubject.next({
        status: 'stopped',
        timerId: this.activeTimerInstance.id,
        remainingSeconds: 0,
        elapsedSeconds: this.activeTimerInstance.elapsedSeconds,
        totalSeconds: this.activeTimerInstance.duration,
        progressPercent: this.activeTimerInstance.progressPercent,
        mode: this.activeTimerInstance.mode,
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
        elapsedSeconds: this.activeTimerInstance.elapsedSeconds,
        totalSeconds: this.activeTimerInstance.duration,
        progressPercent: this.activeTimerInstance.progressPercent,
        mode: this.activeTimerInstance.mode,
      });
    }
  }

  resumeActiveTimer() {
    if (this.activeTimerInstance?.status === 'paused') {
      this.activeTimerInstance.status = 'running';
      this.activeSubscription = this.ticker$.subscribe({
        next: (event) => this.activeTimerSubject.next(event),
        error: (err) => this.activeTimerSubject.error(err),
      });
    }
  }

  setTimerMode(mode: TimerMode) {
    if (!this.activeTimerInstance || this.activeTimerInstance.status === 'stopped') {
      return;
    }
    if (this.activeTimerInstance.mode === mode) return;

    this.activeTimerInstance.mode = mode;
    this.activeTimerSubject.next(this.createActiveTimerEvent());
  }

  private getConfiguredMode(): TimerMode {
    return this.settingsService.getSettings().timer_mode === 'countup'
      ? 'countup'
      : 'countdown';
  }

  private advanceActiveTimer(): TimerEvent {
    if (!this.activeTimerInstance || this.activeTimerInstance.status === 'stopped') {
      return { status: 'stopped', remainingSeconds: 0 };
    }

    this.activeTimerInstance.elapsedSeconds++;
    this.activeTimerInstance.remainingSeconds = Math.max(
      this.activeTimerInstance.duration - this.activeTimerInstance.elapsedSeconds,
      0,
    );
    this.activeTimerInstance.progressPercent = Math.min(
      Math.round(
        (this.activeTimerInstance.elapsedSeconds /
          this.activeTimerInstance.duration) *
          100,
      ),
      100,
    );
    this.activeTimerInstance.status =
      this.activeTimerInstance.elapsedSeconds >=
      this.activeTimerInstance.duration
        ? 'overtime'
        : 'running';

    return this.createActiveTimerEvent();
  }

  private createActiveTimerEvent(): TimerEvent {
    const instance = this.activeTimerInstance!;
    const overtimeSeconds = Math.max(
      instance.elapsedSeconds - instance.duration,
      0,
    );
    const displayedSeconds =
      instance.status === 'overtime'
        ? overtimeSeconds
        : instance.mode === 'countup'
          ? instance.elapsedSeconds
          : instance.remainingSeconds;

    return {
      status: instance.status as TimerEvent['status'],
      timerId: instance.id,
      name: instance.name,
      remainingSeconds: displayedSeconds,
      elapsedSeconds: instance.elapsedSeconds,
      totalSeconds: instance.duration,
      progressPercent: instance.progressPercent,
      mode: instance.mode,
      message:
        instance.status === 'overtime'
          ? `${instance.name}: ${this.formatTime(overtimeSeconds, instance.unit)} overtime`
          : instance.mode === 'countup'
            ? `${instance.name}: ${this.formatTime(instance.elapsedSeconds, instance.unit)} elapsed`
            : `${instance.name}: ${this.formatTime(instance.remainingSeconds, instance.unit)} remaining`,
    };
  }

  subscribeToStream(): Observable<TimerEvent> | null {
    const subject = this.activeTimerSubject;
    if (!subject) {
      return null;
    }
    return subject.asObservable();
  }

  emitSettingsUpdated() {
    this.activeTimerSubject.next({
      status: 'settings-updated',
    });
  }

  getTimerInfo(timerId: string): Timer | undefined {
    return this.getTimerById(timerId);
  }

  getTimerById(timerId: string): Timer | undefined {
    if (this.ephemeralTimers.has(timerId)) {
      return this.ephemeralTimers.get(timerId);
    }
    const timers = this.fileStorageService.readData();
    return timers.find((timer) => timer.id === timerId);
  }

  private convertToSeconds(
    duration: number,
    unit: 'seconds' | 'minutes' | 'hours',
  ): number {
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

  private formatTime(
    seconds: number,
    originalUnit: 'seconds' | 'minutes' | 'hours',
  ): string {
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
      };
    });

    return timers.sort((a, b) => {
      const aSecs = this.convertToSeconds(a.duration, a.unit);
      const bSecs = this.convertToSeconds(b.duration, b.unit);
      return aSecs - bSecs;
    });
  }
}
