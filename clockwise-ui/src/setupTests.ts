import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs
vi.mock('@tauri-apps/api', () => ({
  invoke: vi.fn(),
  window: {
    getCurrent: vi.fn(() => ({
      listen: vi.fn(),
    })),
  },
  path: {
    appDataDir: vi.fn(() => Promise.resolve('/mock/app/data')),
  },
}));

// Mock Tauri plugins
vi.mock('@tauri-apps/plugin-opener', () => ({
  revealItemInDir: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-autostart', () => ({
  enable: vi.fn(),
  disable: vi.fn(),
  isEnabled: vi.fn(),
}));
