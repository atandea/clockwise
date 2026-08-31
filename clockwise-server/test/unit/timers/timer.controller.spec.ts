import { Test, TestingModule } from '@nestjs/testing';
import { TimerController } from 'src/timers/timer.controller';
import { TimerService } from 'src/timers/timer.service';
import { SecurityService } from 'src/security.service';
import { SecurityGuard } from 'src/security.guard';

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
    pauseActiveTimer: jest.fn(),
    resumeActiveTimer: jest.fn(),
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
      const body = {
        name: 'Test',
        duration: 10,
        unit: 'seconds',
        temporary: true,
      };
      controller.createTimer(body);
      expect(service.createTimer).toHaveBeenCalledWith(
        { name: 'Test', duration: 10, unit: 'seconds' },
        true,
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

  describe('stopTimer', () => {
    it('should call timerService.stopActiveTimer', () => {
      controller.stopTimer();
      expect(service.stopActiveTimer).toHaveBeenCalled();
    });
  });

  describe('pauseTimer', () => {
    it('should call timerService.pauseActiveTimer', () => {
      controller.pauseTimer();
      expect(service.pauseActiveTimer).toHaveBeenCalled();
    });
  });

  describe('resumeTimer', () => {
    it('should call timerService.resumeActiveTimer', () => {
      controller.resumeTimer();
      expect(service.resumeActiveTimer).toHaveBeenCalled();
    });
  });

  describe('deleteTimer', () => {
    it('should call timerService.deleteTimer', () => {
      controller.deleteTimer('1');
      expect(service.deleteTimer).toHaveBeenCalledWith('1');
    });
  });

  describe('subscribeToStream', () => {
    it('should call timerService.subscribeToStream', () => {
      mockTimerService.subscribeToStream.mockReturnValue({
        pipe: jest.fn().mockReturnValue({}),
      });
      controller.subscribeToStream();
      expect(service.subscribeToStream).toHaveBeenCalled();
    });
  });
});
