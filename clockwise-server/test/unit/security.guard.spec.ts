import { Test, TestingModule } from '@nestjs/testing';
import { SecurityGuard } from 'src/security.guard';
import { SecurityService } from 'src/security.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('SecurityGuard', () => {
  let guard: SecurityGuard;
  let securityService: SecurityService;

  const mockSecurityService = {
    isLocal: jest.fn(),
    isPinEnabled: jest.fn(),
    verifyPin: jest.fn(),
  };

  const createMockContext = (ip: string, headers: any = {}, query: any = {}) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          ip,
          headers,
          query,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityGuard,
        { provide: SecurityService, useValue: mockSecurityService },
      ],
    }).compile();

    guard = module.get<SecurityGuard>(SecurityGuard);
    securityService = module.get<SecurityService>(SecurityService);
    
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow local requests', () => {
      mockSecurityService.isLocal.mockReturnValue(true);
      const context = createMockContext('127.0.0.1');
      
      expect(guard.canActivate(context)).toBe(true);
      expect(mockSecurityService.isLocal).toHaveBeenCalledWith('127.0.0.1');
    });

    it('should allow requests if PIN is disabled', () => {
      mockSecurityService.isLocal.mockReturnValue(false);
      mockSecurityService.isPinEnabled.mockReturnValue(false);
      const context = createMockContext('1.2.3.4');
      
      expect(guard.canActivate(context)).toBe(true);
      expect(mockSecurityService.isPinEnabled).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if no PIN is provided for network request', () => {
      mockSecurityService.isLocal.mockReturnValue(false);
      mockSecurityService.isPinEnabled.mockReturnValue(true);
      const context = createMockContext('1.2.3.4');
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Network access requires a PIN.');
    });

    it('should allow if valid PIN is provided in Authorization header', () => {
      mockSecurityService.isLocal.mockReturnValue(false);
      mockSecurityService.isPinEnabled.mockReturnValue(true);
      mockSecurityService.verifyPin.mockReturnValue(true);
      const context = createMockContext('1.2.3.4', { authorization: 'PIN 1234' });
      
      expect(guard.canActivate(context)).toBe(true);
      expect(mockSecurityService.verifyPin).toHaveBeenCalledWith('1234');
    });

    it('should allow if valid PIN is provided in query params', () => {
      mockSecurityService.isLocal.mockReturnValue(false);
      mockSecurityService.isPinEnabled.mockReturnValue(true);
      mockSecurityService.verifyPin.mockReturnValue(true);
      const context = createMockContext('1.2.3.4', {}, { pin: '1234' });
      
      expect(guard.canActivate(context)).toBe(true);
      expect(mockSecurityService.verifyPin).toHaveBeenCalledWith('1234');
    });

    it('should throw ForbiddenException if invalid PIN is provided', () => {
      mockSecurityService.isLocal.mockReturnValue(false);
      mockSecurityService.isPinEnabled.mockReturnValue(true);
      mockSecurityService.verifyPin.mockReturnValue(false);
      const context = createMockContext('1.2.3.4', { authorization: 'PIN 0000' });
      
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('Invalid PIN.');
    });
  });
});
