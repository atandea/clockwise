import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from 'src/settings.controller';
import { SettingsService } from 'src/settings.service';
import { SecurityService } from 'src/security.service';
import { SecurityGuard } from 'src/security.guard';
import { TimerService } from 'src/timers/timer.service';
import { AppThrottlerGuard } from 'src/throttler.guard';
import { beforeEach } from 'vitest';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: SettingsService;

  const mockSettingsService = {
    getSettings: vi.fn().mockReturnValue({ preferred_monitor: 'M1' }),
    updateSettings: vi.fn().mockReturnValue({ preferred_monitor: 'M2' }),
  };

  const mockSecurityService = {};
  const mockTimerService = {
    emitSettingsUpdated: vi.fn(),
    setTimerMode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      .overrideGuard(AppThrottlerGuard)
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
    mockSettingsService.updateSettings.mockReturnValueOnce({
      network_access_enabled: false,
    });
    expect(controller.updateSettings(updates)).toEqual({
      network_access_enabled: false,
    });
    expect(service.updateSettings).toHaveBeenCalledWith(updates);
  });

  it('should update and apply the timer mode', () => {
    const updates = { timer_mode: 'countup' as const };
    mockSettingsService.updateSettings.mockReturnValueOnce(updates);

    expect(controller.updateSettings(updates)).toEqual(updates);
    expect(service.updateSettings).toHaveBeenCalledWith(updates);
    expect(mockTimerService.setTimerMode).toHaveBeenCalledWith('countup');
  });

  it('should reject an unsupported timer mode', () => {
    expect(() =>
      controller.updateSettings({ timer_mode: 'sideways' } as any),
    ).toThrow('timer_mode must be countdown or countup');
    expect(service.updateSettings).not.toHaveBeenCalled();
  });
});
