import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import * as fs from 'node:fs';

jest.mock('node:fs');

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SettingsService],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettings', () => {
    it('should return empty object if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(service.getSettings()).toEqual({});
    });

    it('should return parsed settings if file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('{"pin_lock_enabled": true}');
      
      const settings = service.getSettings();
      expect(settings).toEqual({ pin_lock_enabled: true });
    });
  });

  describe('updateSettings', () => {
    it('should merge updates and write to file', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        (fs.readFileSync as jest.Mock).mockReturnValue('{"launch_fullscreen_on_startup": true}');
        
        const updates = { pin_lock_enabled: false };
        const result = service.updateSettings(updates);
        
        expect(result).toEqual({
            launch_fullscreen_on_startup: true,
            pin_lock_enabled: false
        });
        expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});
