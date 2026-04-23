import { Test, TestingModule } from '@nestjs/testing';
import { TimerService } from './timer.service';
import { FileStorageService } from '../files/file.service';
import { Timer } from './timer';
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

  describe('getTimers', () => {
    it('should return sorted timers', () => {
      const timers = [
        { name: 'Long', duration: 1, unit: 'hours' },
        { name: 'Short', duration: 30, unit: 'seconds' },
        { name: 'Medium', duration: 5, unit: 'minutes' },
      ];
      mockFileStorageService.readData.mockReturnValue(timers);

      const result = service.getTimers();
      expect(result[0].name).toBe('Short');
      expect(result[1].name).toBe('Medium');
      expect(result[2].name).toBe('Long');
    });
  });
});
