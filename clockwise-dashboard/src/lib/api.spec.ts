import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  getApiBaseUrl, 
  getCleanHostname, 
  getPin, 
  setPin, 
  fetchWithPin, 
  checkAuth, 
  timerEvents,
  appAuthStatus
} from './api';
import { get } from 'svelte/store';

describe('api utilities', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
    vi.stubGlobal('EventSource', vi.fn().mockImplementation(function() {
      return {
        addEventListener: vi.fn(),
        close: vi.fn(),
        onerror: null,
      };
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('getApiBaseUrl', () => {
    it('should return localhost if window is undefined', () => {
      const originalWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;
      expect(getApiBaseUrl()).toBe('http://localhost:4100/api/v1');
      globalThis.window = originalWindow;
    });

    it('should return localhost if hostname is tauri.localhost', () => {
      vi.stubGlobal('window', { location: { hostname: 'tauri.localhost' } });
      expect(getApiBaseUrl()).toBe('http://localhost:4100/api/v1');
    });

    it('should return dynamic host based on location', () => {
      vi.stubGlobal('window', { location: { hostname: '192.168.1.5' } });
      expect(getApiBaseUrl()).toBe('http://192.168.1.5:4100/api/v1');
    });
  });

  describe('getCleanHostname', () => {
    it('should return localhost if hostname is tauri.localhost', () => {
      vi.stubGlobal('window', { location: { hostname: 'tauri.localhost' } });
      expect(getCleanHostname()).toBe('localhost');
    });

    it('should return actual hostname if not tauri', () => {
      vi.stubGlobal('window', { location: { hostname: 'my-clock' } });
      expect(getCleanHostname()).toBe('my-clock');
    });

    it('should return localhost if window is undefined', () => {
      const originalWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;
      expect(getCleanHostname()).toBe('localhost');
      globalThis.window = originalWindow;
    });
  });

  describe('PIN management', () => {
    it('should get PIN from sessionStorage', () => {
      vi.stubGlobal('window', {});
      (sessionStorage.getItem as any).mockReturnValue('mock-pin');
      expect(getPin()).toBe('mock-pin');
      expect(sessionStorage.getItem).toHaveBeenCalledWith('clockwise_pin');
    });

    it('should set PIN in sessionStorage', () => {
      vi.stubGlobal('window', {});
      setPin('new-pin');
      expect(sessionStorage.setItem).toHaveBeenCalledWith('clockwise_pin', 'new-pin');
    });
  });

  describe('fetchWithPin', () => {
    it('should include Authorization header if PIN exists', async () => {
      vi.stubGlobal('window', {});
      (sessionStorage.getItem as any).mockReturnValue('1234');
      (fetch as any).mockResolvedValue({ ok: true });

      await fetchWithPin('http://test.com');

      expect(fetch).toHaveBeenCalledWith('http://test.com', expect.objectContaining({
        headers: expect.any(Headers)
      }));
      
      const lastCallHeaders = (fetch as any).mock.calls[0][1].headers;
      expect(lastCallHeaders.get('Authorization')).toBe('PIN 1234');
    });
  });

  describe('checkAuth', () => {
    it('should update appAuthStatus store on success', async () => {
      const mockStatus = { authorized: true, pinEnabled: true };
      (fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStatus)
      });

      const result = await checkAuth();
      
      expect(result).toEqual(mockStatus);
      expect(get(appAuthStatus)).toEqual(mockStatus);
    });

    it('should return null on failure', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));
      const result = await checkAuth();
      expect(result).toBeNull();
    });
  });

  describe('timerEvents (SSE)', () => {
    it('should initialize EventSource on first subscription', () => {
      vi.stubGlobal('window', { location: { hostname: 'localhost', origin: 'http://localhost:1420' } });
      
      const unsubscribe = timerEvents.subscribe(() => {});
      
      expect(EventSource).toHaveBeenCalled();
      unsubscribe();
    });

    it('should close EventSource when last subscriber unsubscribes', () => {
      vi.stubGlobal('window', { location: { hostname: 'localhost', origin: 'http://localhost:1420' } });
      
      const mockClose = vi.fn();
      (EventSource as any).mockImplementation(function() {
        return {
          addEventListener: vi.fn(),
          close: mockClose,
        };
      });

      const unsub1 = timerEvents.subscribe(() => {});
      const unsub2 = timerEvents.subscribe(() => {});
      
      unsub1();
      expect(mockClose).not.toHaveBeenCalled();
      
      unsub2();
      expect(mockClose).toHaveBeenCalled();
    });

    it('should fallback if window is undefined', () => {
      const originalWindow = globalThis.window;
      // @ts-ignore
      delete globalThis.window;
      const unsubscribe = timerEvents.subscribe(() => {});
      expect(unsubscribe).toBeDefined();
      unsubscribe();
      globalThis.window = originalWindow;
    });

    it('should set status to error on EventSource error', () => {
      vi.stubGlobal('window', { location: { hostname: 'localhost', origin: 'http://localhost:1420' } });
      let errorHandler: any;
      (EventSource as any).mockImplementation(function() {
        const self = {
          addEventListener: vi.fn(),
          close: vi.fn(),
          set onerror(cb: any) { errorHandler = cb; }
        };
        return self;
      });

      const unsubscribe = timerEvents.subscribe(() => {});
      if (errorHandler) errorHandler();
      
      const currentStatus = get(timerEvents);
      expect(currentStatus.status).toBe('error');
      unsubscribe();
    });
  });
});
