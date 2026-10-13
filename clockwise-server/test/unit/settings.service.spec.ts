import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from 'src/settings.service';
import * as fs from 'node:fs';
import type { Mock } from 'vitest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SettingsService],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return empty object if file does not exist', () => {
      (fs.existsSync as Mock).mockReturnValue(false);
      expect(service.getSettings()).toEqual({});
    });

    it('should return parsed settings if file exists', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(
        '{"pin_lock_enabled": true}',
      );

      const settings = service.getSettings();
      expect(settings).toEqual({ pin_lock_enabled: true });
    });
  });

  describe('updateSettings', () => {
    it('should merge updates and write to file', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue(
        '{"launch_fullscreen_on_startup": true}',
      );

      const updates = { pin_lock_enabled: false, network_access_enabled: true };
      const result = service.updateSettings(updates);

      expect(result).toEqual({
        launch_fullscreen_on_startup: true,
        pin_lock_enabled: false,
        network_access_enabled: true,
      });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should create directory if it does not exist', () => {
      (fs.existsSync as Mock).mockReturnValue(false);

      service.updateSettings({ network_access_enabled: false });

      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse errors in getSettings', () => {
      (fs.existsSync as Mock).mockReturnValue(true);
      (fs.readFileSync as Mock).mockReturnValue('invalid json');

      const settings = service.getSettings();
      expect(settings).toEqual({});
    });
  });
});
