import { Controller, Get, Post, Body, Req, Ip, ForbiddenException } from '@nestjs/common';
import { SecurityService } from './security.service';
import { Request } from 'express';

@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) { }
 
  @Get('status')
  getStatus(@Ip() ip: string) {
    const local = this.securityService.isLocal(ip);
    return {
      requiresPin: !local && this.securityService.isPinEnabled(),
      pinEnabled: this.securityService.isPinEnabled(),
      pinLockAtStartup: this.securityService.getPinLockAtStartup(),
      local: local
    };
  }

  @Post('toggle')
  togglePin(@Body('enabled') enabled: boolean, @Ip() ip: string) {
    if (!this.securityService.isLocal(ip)) {
      throw new ForbiddenException('PIN security can only be toggled from the host machine.');
    }
    this.securityService.setPinEnabled(enabled);
    return { pinEnabled: this.securityService.isPinEnabled() };
  }

  @Get('pin')
  getPin(@Req() req: Request, @Ip() ip: string) {
    const local = this.securityService.isLocal(ip);
    const authHeader = req.headers['authorization'];

    if (local) {
      return { pin: this.securityService.getPin() };
    }

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('PIN ')) {
      const providedPin = authHeader.substring(4);
      if (this.securityService.verifyPin(providedPin)) {
        return { pin: this.securityService.getPin() };
      }
    }

    throw new ForbiddenException('PIN can only be retrieved from the host machine or with valid PIN authorization.');
  }

  @Post('verify')
  verify(@Body('pin') pin: string, @Ip() ip: string) {
    // Allow localhost access without PIN
    if (this.securityService.isLocal(ip)) {
      return { success: true };
    }
    if (this.securityService.verifyPin(pin)) {
      return { success: true };
    }
    throw new ForbiddenException('Invalid PIN');
  }
}
