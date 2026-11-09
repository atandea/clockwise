export type TimerMode = 'countdown' | 'countup';

export class TimerInstance {
  id: string;
  name: string;
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours';
  mode: TimerMode;
  elapsedSeconds: number;
  remainingSeconds: number;
  progressPercent: number;
  status: string;
}
