import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from 'src/settings.controller';
import { SettingsService } from 'src/settings.service';
import { SecurityService } from 'src/security.service';
import { SecurityGuard } from 'src/security.guard';
import { TimerService } from 'src/timers/timer.service';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: SettingsService;

  const mockSettingsService = {
    getSettings: jest.fn().mockReturnValue({ preferred_monitor: 'M1' }),
    updateSettings: jest.fn().mockReturnValue({ preferred_monitor: 'M2' }),
  };

  const mockSecurityService = {};
  const mockTimerService = {
    emitSettingsUpdated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: SecurityService, useValue: mockSecurityService },
        { provide: TimerService, useValue: mockTimerService },
      ],
    })
    .overrideGuard(SecurityGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<SettingsController>(SettingsController);
    service = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get settings', () => {
    expect(controller.getSettings()).toEqual({ preferred_monitor: 'M1' });
    expect(service.getSettings).toHaveBeenCalled();
  });

  it('should update network access setting', () => {
    const updates = { network_access_enabled: false };
    mockSettingsService.updateSettings.mockReturnValueOnce({ network_access_enabled: false });
    expect(controller.updateSettings(updates)).toEqual({ network_access_enabled: false });
    expect(service.updateSettings).toHaveBeenCalledWith(updates);
  });
});
