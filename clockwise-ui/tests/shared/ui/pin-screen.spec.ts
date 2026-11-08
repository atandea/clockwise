import { render, fireEvent, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PinScreen from '../../../src/shared/ui/pin-screen.component.svelte';

describe('PinScreen lockout', () => {
  const storage = new Map<string, string>();
  const pinStorage = {
    clear: () => storage.clear(),
    getItem: (key: string) => storage.get(key) ?? null,
    removeItem: (key: string) => storage.delete(key),
    setItem: (key: string, value: string) => storage.set(key, String(value)),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: pinStorage,
    });
    pinStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    pinStorage.clear();
  });

  it('preserves the remaining lock window instead of resetting it to the new retry duration', async () => {
      pinStorage.setItem('clockwise_pin_lock_until', String(Date.now() + 60_000));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ retryAfterMs: 30_000 }),
    }));

    render(PinScreen, {
      props: {
        apiBase: 'http://localhost:4100/api/v1',
        onSuccess: vi.fn(),
      },
    });

    expect(screen.getByText(/Try again in 60s/i)).toBeInTheDocument();

    const input = screen.getAllByRole('textbox')[0];
    await fireEvent.input(input, { target: { value: '1' } });
    await fireEvent.click(screen.getByRole('button', { name: /unlock dashboard/i }));

    await Promise.resolve();

    expect(screen.getByText(/Try again in 60s/i)).toBeInTheDocument();
  });
});
