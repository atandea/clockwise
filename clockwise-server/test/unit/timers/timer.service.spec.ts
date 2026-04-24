import { Test, TestingModule } from '@nestjs/testing';
import { TimerService } from 'src/timers/timer.service';
import { FileStorageService } from 'src/files/file.service';
import { Timer } from 'src/timers/timer';
import { firstValueFrom, skip } from 'rxjs';

describe('TimerService', () => {
  let service: TimerService;
  let fileStorageService: FileStorageService;

  const mockFileStorageService = {
    readData: jest.fn().mockReturnValue([]),
    writeData: jest.fn(),
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimerService,
        { provide: FileStorageService, useValue: mockFileStorageService },
      ],
    }).compile();

    service = module.get<TimerService>(TimerService);
    fileStorageService = module.get<FileStorageService>(FileStorageService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTimer', () => {
    it('should create an ephemeral timer', () => {
      const timer: Timer = {
        name: 'Test Timer',
        duration: 10,
        unit: 'seconds',
      } as Timer;

      const created = service.createTimer(timer, true);
      expect(created.id).toBeDefined();
      expect(service.getTimerById(created.id)).toEqual(created);
      expect(fileStorageService.writeData).not.toHaveBeenCalled();
    });

    it('should create a persistent timer', () => {
      const timer: Timer = {
        name: 'Persistent Timer',
        duration: 5,
        unit: 'minutes',
      } as Timer;

      mockFileStorageService.readData.mockReturnValue([]);
      
      const created = service.createTimer(timer, false);
      expect(created.id).toBeDefined();
      expect(fileStorageService.writeData).toHaveBeenCalled();
    });
  });

  describe('startTimer', () => {
    it('should start a timer and emit events', () => {
      const timer: Timer = {
        id: 'test-id',
        name: 'Event Timer',
        duration: 2,
        unit: 'seconds',
      } as Timer;

      const events: any[] = [];
      service.subscribeToStream()!.subscribe(e => events.push(e));

      service.startTimer(timer);
      
      // Get initial events (idle state from BehaviorSubject + initial event from startTimer)
      expect(events.length).toBe(2);
      expect(events[0].status).toBe('idle');
      expect(events[1].status).toBe('running');
      expect(events[1].remainingSeconds).toBe(2);

      // Advance 1s - interval emits first value
      jest.advanceTimersByTime(1000);
      expect(events.length).toBe(3);
      expect(events[2].remainingSeconds).toBe(2); // Implementation returns current then decrements

      // Advance another 1s
      jest.advanceTimersByTime(1000);
      expect(events.length).toBe(4);
      expect(events[3].remainingSeconds).toBe(1);
    });

    it('should enter overtime when timer reaches 0', () => {
        const timer: Timer = {
          id: 'test-id',
          name: 'Overtime Timer',
          duration: 1,
          unit: 'seconds',
        } as Timer;
  
        const events: any[] = [];
        service.subscribeToStream()!.subscribe(e => events.push(e));

        service.startTimer(timer);

        // t=0 (initial)
        // t=1000: returns 1, decrements to 0
        jest.advanceTimersByTime(1000);
        
        // t=2000: remaining is 0, status becomes overtime
        jest.advanceTimersByTime(1000);
        
        expect(events[events.length - 1].status).toBe('overtime');
    });
  });

  describe('Timer control', () => {
    it('should stop the active timer', () => {
      const timer: Timer = { id: 't1', name: 'Timer', duration: 10, unit: 'seconds' } as Timer;
      service.startTimer(timer);
      
      const events: any[] = [];
      service.subscribeToStream()!.subscribe(e => events.push(e));
      
      service.stopActiveTimer();
      expect(events[events.length - 1].status).toBe('stopped');
    });

    it('should pause and resume the active timer', () => {
      const timer: Timer = { id: 't1', name: 'Timer', duration: 10, unit: 'seconds' } as Timer;
      service.startTimer(timer);
      
      const events: any[] = [];
      service.subscribeToStream()!.subscribe(e => events.push(e));
      
      service.pauseActiveTimer();
      expect(events[events.length - 1].status).toBe('paused');
      
      service.resumeActiveTimer();
      jest.advanceTimersByTime(1000);
      expect(events[events.length - 1].status).toBe('running');
    });


    it('should not pause if not running', () => {
        service.pauseActiveTimer();
        // Should not throw or emit paused event if no active timer
    });

    it('should not resume if not paused', () => {
        service.resumeActiveTimer();
        // Should not throw or emit running event if no active timer
    });
  });

  describe('deleteTimer', () => {
    it('should delete an ephemeral timer', () => {
      const timer = service.createTimer({ name: 'Eph', duration: 5, unit: 'seconds' } as Timer, true);
      expect(service.getTimerById(timer.id)).toBeDefined();
      service.deleteTimer(timer.id);
      expect(service.getTimerById(timer.id)).toBeUndefined();
    });

    it('should delete a persistent timer', () => {
      mockFileStorageService.readData.mockReturnValue([{ id: 'p1', name: 'Persist' }]);
      service.deleteTimer('p1');
      expect(fileStorageService.writeData).toHaveBeenCalled();
    });
  });

  describe('getTimerInfo', () => {
    it('should return timer info', () => {
        const timer = service.createTimer({ name: 'Info', duration: 5, unit: 'seconds' } as Timer, true);
        expect(service.getTimerInfo(timer.id)).toEqual(timer);
    });
  });

  describe('conversions and formatting', () => {
    it('should convert units to seconds correctly', () => {
        // Internal method test via public methods
        const timers = [
            { name: 'H', duration: 1, unit: 'hours' },
            { name: 'M', duration: 1, unit: 'minutes' },
            { name: 'S', duration: 1, unit: 'seconds' },
            { name: 'D', duration: 1, unit: 'invalid' as any },
        ];
        mockFileStorageService.readData.mockReturnValue(timers);
        const sorted = service.getTimers();
        expect(sorted[0].name).toBe('S');
        expect(sorted[1].name).toBe('D'); // invalid defaults to raw duration (1)
        expect(sorted[2].name).toBe('M'); // 60
        expect(sorted[3].name).toBe('H'); // 3600
    });

    it('should format time correctly for different units', () => {
        const timerH: Timer = { id: 'h', name: 'H', duration: 1, unit: 'hours' } as Timer;
        const timerM: Timer = { id: 'm', name: 'M', duration: 1, unit: 'minutes' } as Timer;
        
        let lastEvent: any;
        service.subscribeToStream()!.subscribe(e => lastEvent = e);

        service.startTimer(timerH);
        jest.advanceTimersByTime(1000);
        expect(lastEvent.message).toContain('01:00:00');

        service.startTimer(timerM);
        jest.advanceTimersByTime(1000);
        expect(lastEvent.message).toContain('01:00');
    });

    it('should handle stopped or null instance in countdown$', () => {
        // Start a timer to get the subscription running
        const timer: Timer = { id: 't', name: 'T', duration: 10, unit: 'seconds' } as Timer;
        service.startTimer(timer);
        
        let lastEvent: any;
        service.subscribeToStream()!.subscribe(e => lastEvent = e);

        // Manually stop it in a way that triggers the branch
        service.stopActiveTimer();
        jest.advanceTimersByTime(1000);
        expect(lastEvent.status).toBe('stopped');
    });
  });
});


