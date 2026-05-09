export interface TimerEvent {
  timerId?: string;
  name?: string;
  remainingSeconds?: number;
  totalSeconds?: number;
  progressPercent?: number;
  message?: string;
  status: 'running' | 'stopped' | 'overtime' | 'paused' | 'settings-updated';
}