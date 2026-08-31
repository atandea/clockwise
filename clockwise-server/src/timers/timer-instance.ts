export class TimerInstance {
  id: string;
  name: string;
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours';
  remainingSeconds: number;
  progressPercent: number;
  status: string;
}
