import { Test, TestingModule } from '@nestjs/testing';
import { SecurityController } from 'src/security.controller';
import { SecurityService } from 'src/security.service';
import { ForbiddenException } from '@nestjs/common';

describe('SecurityController', () => {
  let controller: SecurityController;
  let service: SecurityService;

  const mockSecurityService = {
    isLocal: jest.fn(),
    isPinEnabled: jest.fn(),
    verifyPin: jest.fn(),
    getPinLockAtStartup: jest.fn().mockReturnValue(true),
    setPinEnabled: jest.fn(),
    getPin: jest.fn().mockReturnValue('1234'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecurityController],
      providers: [
        { provide: SecurityService, useValue: mockSecurityService },
      ],
    }).compile();

    controller = module.get<SecurityController>(SecurityController);
    service = module.get<SecurityService>(SecurityService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return authorized for local IP', () => {
      mockSecurityService.isLocal.mockReturnValue(true);
      mockSecurityService.isPinEnabled.mockReturnValue(true);
      
      const req = { headers: {} } as any;
      const status = controller.getStatus('127.0.0.1', req);
      
      expect(status.authorized).toBe(true);
      expect(status.local).toBe(true);
    });

    it('should return unauthorized for remote IP when PIN is enabled', () => {
      mockSecurityService.isLocal.mockReturnValue(false);
      mockSecurityService.isPinEnabled.mockReturnValue(true);
      
      const req = { headers: {} } as any;
      const status = controller.getStatus('192.168.1.1', req);
      
      expect(status.authorized).toBe(false);
      expect(status.requiresPin).toBe(true);
    });

    it('should return authorized for remote IP if valid PIN header is provided', () => {
        mockSecurityService.isLocal.mockReturnValue(false);
        mockSecurityService.isPinEnabled.mockReturnValue(true);
        mockSecurityService.verifyPin.mockReturnValue(true);
        
        const req = { headers: { authorization: 'PIN 1234' } } as any;
        const status = controller.getStatus('192.168.1.1', req);
        
        expect(status.authorized).toBe(true);
    });
  });

  describe('togglePin', () => {
    it('should throw ForbiddenException for remote IP', () => {
      mockSecurityService.isLocal.mockReturnValue(false);
      expect(() => controller.togglePin(true, '192.168.1.1')).toThrow(ForbiddenException);
    });

    it('should call setPinEnabled for local IP', () => {
      mockSecurityService.isLocal.mockReturnValue(true);
      controller.togglePin(false, '127.0.0.1');
      expect(service.setPinEnabled).toHaveBeenCalledWith(false);
    });
  });

  describe('verify', () => {
    it('should return success true for valid PIN', () => {
        mockSecurityService.isLocal.mockReturnValue(false);
        mockSecurityService.verifyPin.mockReturnValue(true);
        expect(controller.verify('1234', '192.168.1.1')).toEqual({ success: true });
    });

    it('should throw ForbiddenException for invalid PIN', () => {
        mockSecurityService.isLocal.mockReturnValue(false);
        mockSecurityService.verifyPin.mockReturnValue(false);
        expect(() => controller.verify('wrong', '192.168.1.1')).toThrow(ForbiddenException);
    });
  });
});
