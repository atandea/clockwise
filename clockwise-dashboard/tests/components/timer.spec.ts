import { render, screen, cleanup } from '@testing-library/svelte';
import TimerComponent from '../../src/components/timer.component.svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writable } from 'svelte/store';

// Mock the API module
vi.mock('../../src/lib/api', async () => {
  const { writable } = await import('svelte/store');
  const mockTimerEvents = writable({
    status: 'idle',
    remainingSeconds: 0,
    totalSeconds: 0,
    name: 'Clockwise',
    progressPercent: 0,
    timerId: null
  });
  return {
    timerEvents: mockTimerEvents
  };
});

// We need a way to access the store in tests
import { timerEvents } from '../../src/lib/api';
const mockTimerEvents = timerEvents as any;

describe('TimerComponent', () => {
  beforeEach(() => {
    mockTimerEvents.set({
        status: 'idle',
        remainingSeconds: 0,
        totalSeconds: 0,
        name: 'Clockwise',
        progressPercent: 0,
        timerId: null
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('should display "00:00" when idle', () => {
    render(TimerComponent);
    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('should display formatted time when running', async () => {
    mockTimerEvents.set({
        status: 'running',
        remainingSeconds: 125, // 02:05
        totalSeconds: 300,
        name: 'Test Timer',
        progressPercent: 41,
        timerId: '1'
    });
    
    render(TimerComponent);
    expect(screen.getByText('02:05')).toBeInTheDocument();
  });

  it('should display hours if time >= 3600', () => {
    mockTimerEvents.set({
        status: 'running',
        remainingSeconds: 3661, // 01:01:01
        totalSeconds: 7200,
        name: 'Long Timer',
        progressPercent: 50,
        timerId: '2'
    });

    render(TimerComponent);
    expect(screen.getByText('01:01:01')).toBeInTheDocument();
  });

  it('should apply red color when critical (progress > 90%)', () => {
    mockTimerEvents.set({
        status: 'running',
        remainingSeconds: 10,
        totalSeconds: 100,
        name: 'Critical Timer',
        progressPercent: 91,
        timerId: '3'
    });

    const { container } = render(TimerComponent);
    const timerText = container.querySelector('.font-mono');
    expect(timerText).toHaveClass('text-red-500');
  });

  it('should apply red color when in overtime', () => {
    mockTimerEvents.set({
        status: 'overtime',
        remainingSeconds: 10,
        totalSeconds: 100,
        name: 'Overtime Timer',
        progressPercent: 110,
        timerId: '3'
    });

    const { container } = render(TimerComponent);
    const timerText = container.querySelector('.font-mono');
    expect(timerText).toHaveClass('text-red-500');
  });
});
