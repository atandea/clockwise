import { Test, TestingModule } from '@nestjs/testing';
import { TimerController } from './timer.controller';
import { TimerService } from './timer.service';
import { SecurityService } from '../security.service';
import { SecurityGuard } from '../security.guard';

describe('TimerController', () => {
  let controller: TimerController;
  let service: TimerService;

  const mockTimerService = {
    getTimers: jest.fn().mockReturnValue([]),
    createTimer: jest.fn(),
    stopActiveTimer: jest.fn(),
    getTimerById: jest.fn(),
    startTimer: jest.fn(),
    deleteTimer: jest.fn(),
    subscribeToStream: jest.fn(),
  };

  const mockSecurityService = {
    isLocal: jest.fn().mockReturnValue(true),
    isPinEnabled: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimerController],
      providers: [
        { provide: TimerService, useValue: mockTimerService },
        { provide: SecurityService, useValue: mockSecurityService },
      ],
    })
    .overrideGuard(SecurityGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<TimerController>(TimerController);
    service = module.get<TimerService>(TimerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTimers', () => {
    it('should call timerService.getTimers', () => {
      controller.getTimers();
      expect(service.getTimers).toHaveBeenCalled();
    });
  });

  describe('createTimer', () => {
    it('should call timerService.createTimer with body and temporary flag', () => {
      const body = { name: 'Test', duration: 10, unit: 'seconds', temporary: true };
      controller.createTimer(body);
      expect(service.createTimer).toHaveBeenCalledWith(
        { name: 'Test', duration: 10, unit: 'seconds' },
        true
      );
    });
  });

  describe('startTimer', () => {
    it('should throw error if timer not found', () => {
      mockTimerService.getTimerById.mockReturnValue(null);
      expect(() => controller.startTimer('invalid')).toThrow('Timer not found');
    });

    it('should call startTimer if timer exists', () => {
        const timer = { id: '1', name: 'T1' };
        mockTimerService.getTimerById.mockReturnValue(timer);
        controller.startTimer('1');
        expect(service.startTimer).toHaveBeenCalledWith(timer);
    });
  });
});
