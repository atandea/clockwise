import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import SettingsComponent from './settings.component.svelte';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithPin } from '../lib/api';

// Mock the API module
vi.mock('../lib/api', () => ({
  getApiBaseUrl: vi.fn(() => 'http://localhost:4100/api/v1'),
  getCleanHostname: vi.fn(() => 'localhost'),
  getPin: vi.fn(() => '1234'),
  fetchWithPin: vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  })),
  appLocalIp: { subscribe: vi.fn(() => () => {}), set: vi.fn() },
  appAuthStatus: { subscribe: vi.fn((cb) => { cb({ pinEnabled: true }); return () => {} }), set: vi.fn() },
  appServerPin: { subscribe: vi.fn((cb) => { cb('1234'); return () => {} }), set: vi.fn() },
  appSettings: { subscribe: vi.fn((cb) => { cb({}); return () => {} }), set: vi.fn() },
}));

// Mock the Toast module
vi.mock('../lib/toast.svelte', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

// Mock Tauri core
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.resolve([]))
}));

describe('SettingsComponent', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    ));
    // Mock the __TAURI_INTERNALS__ to simulate being in Tauri
    vi.stubGlobal('window', {
        ...window,
        __TAURI_INTERNALS__: {}
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('should render the settings header', () => {
    render(SettingsComponent);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should render the Back button', () => {
    render(SettingsComponent);
    const backBtn = screen.getByText('Back');
    expect(backBtn).toBeInTheDocument();
    expect(backBtn.closest('a')).toHaveAttribute('href', '/');
  });

  it('should render all settings sections', () => {
    render(SettingsComponent);
    expect(screen.getByText('Network Access')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('should toggle network access', async () => {
    render(SettingsComponent);
    const toggle = screen.getByLabelText('Toggle Network Access');
    await fireEvent.click(toggle);
    
    // Check if fetchWithPin was called with the correct body
    await vi.waitFor(() => {
        expect(fetchWithPin).toHaveBeenCalledWith(
            expect.stringContaining('/settings'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"network_access_enabled":false')
            })
        );
    });
  });
});
