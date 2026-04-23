import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SecurityService } from './security.service';
import { SecurityGuard } from './security.guard';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: SettingsService;

  const mockSettingsService = {
    getSettings: jest.fn().mockReturnValue({ preferred_monitor: 'M1' }),
    updateSettings: jest.fn().mockReturnValue({ preferred_monitor: 'M2' }),
  };

  const mockSecurityService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: SecurityService, useValue: mockSecurityService },
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

  it('should update settings', () => {
    const updates = { preferred_monitor: 'M2' };
    expect(controller.updateSettings(updates)).toEqual({ preferred_monitor: 'M2' });
    expect(service.updateSettings).toHaveBeenCalledWith(updates);
  });
});
