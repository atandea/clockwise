import { Test, TestingModule } from '@nestjs/testing';
import { SecurityService } from 'src/security.service';
import { SettingsService } from 'src/settings.service';

describe('SecurityService', () => {
  let service: SecurityService;
  let settingsService: SettingsService;

  const mockSettingsService = {
    getSettings: jest.fn().mockReturnValue({}),
    updateSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityService,
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
    settingsService = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a 4-digit PIN on initialization', () => {
    const pin = service.getPin();
    expect(pin).toMatch(/^\d{4}$/);
  });

  describe('verifyPin', () => {
    it('should verify correct PIN', () => {
      const pin = service.getPin();
      expect(service.verifyPin(pin)).toBe(true);
    });

    it('should reject incorrect PIN', () => {
      expect(service.verifyPin('wrong')).toBe(false);
    });
  });

  describe('isLocal', () => {
    it('should return true for localhost IP', () => {
      expect(service.isLocal('127.0.0.1')).toBe(true);
      expect(service.isLocal('127.0.0.2')).toBe(true);
    });

    it('should return false for remote IP', () => {
      expect(service.isLocal('192.168.1.1')).toBe(false);
      expect(service.isLocal('8.8.8.8')).toBe(false);
    });

    it('should return false for undefined IP', () => {
      expect(service.isLocal(undefined)).toBe(false);
    });
  });

  describe('settings integration', () => {
    it('should initialize pinLockAtStartup from settings', async () => {
      mockSettingsService.getSettings.mockReturnValue({
        pin_lock_at_startup: false,
      });

      // We need to re-initialize to test constructor logic
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SecurityService,
          { provide: SettingsService, useValue: mockSettingsService },
        ],
      }).compile();
      const newService = module.get<SecurityService>(SecurityService);

      expect(newService.getPinLockAtStartup()).toBe(false);
    });

    it('should update settings when toggling PIN', () => {
      service.setPinEnabled(false);
      expect(settingsService.updateSettings).toHaveBeenCalledWith({
        pin_lock_enabled: false,
      });
      expect(service.isPinEnabled()).toBe(false);
    });
  });
});
