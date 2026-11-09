import type { TimerMode } from './timer-instance';

export interface TimerEvent {
  timerId?: string;
  name?: string;
  remainingSeconds?: number;
  elapsedSeconds?: number;
  totalSeconds?: number;
  progressPercent?: number;
  mode?: TimerMode;
  message?: string;
  status: 'running' | 'stopped' | 'overtime' | 'paused' | 'settings-updated';
}
