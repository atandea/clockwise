import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from 'src/settings.service';
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
    jest.spyOn(console, 'error').mockImplementation(() => {});
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
        
        const updates = { pin_lock_enabled: false, network_access_enabled: true };
        const result = service.updateSettings(updates);
        
        expect(result).toEqual({
            launch_fullscreen_on_startup: true,
            pin_lock_enabled: false,
            network_access_enabled: true
        });
        expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should create directory if it does not exist', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        
        service.updateSettings({ network_access_enabled: false });
        
        expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle JSON parse errors in getSettings', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
      
      const settings = service.getSettings();
      expect(settings).toEqual({});
    });
  });
});
