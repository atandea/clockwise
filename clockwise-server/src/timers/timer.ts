export class Timer {
  id: string;
  name: string;
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours';
  createdAt: Date;
}
