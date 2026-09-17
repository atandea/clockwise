import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Ip,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SecurityService } from './security.service';
import { Request } from 'express';
import { AppThrottlerGuard } from './throttler.guard';

@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('status')
  @UseGuards(AppThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  getStatus(@Ip() ip: string, @Req() req: Request) {
    const local = this.securityService.isLocal(ip);
    const pinEnabled = this.securityService.isPinEnabled();
    const authHeader = req.headers['authorization'];
    const lockedRemainingMs = this.securityService.getLockoutRemainingMs(ip);

    let authorized = true;
    if (!local && pinEnabled) {
      authorized = false;
      if (
        authHeader &&
        typeof authHeader === 'string' &&
        authHeader.startsWith('PIN ')
      ) {
        const providedPin = authHeader.substring(4);
        if (this.securityService.verifyPin(providedPin)) {
          authorized = true;
        }
      }
    }

    return {
      authorized,
      requiresPin: !local && pinEnabled && !authorized,
      pinEnabled: pinEnabled,
      pinLockAtStartup: this.securityService.getPinLockAtStartup(),
      local: local,
      lockoutRemainingMs: lockedRemainingMs,
    };
  }

  @Post('toggle')
  togglePin(@Body('enabled') enabled: boolean, @Ip() ip: string) {
    if (!this.securityService.isLocal(ip)) {
      throw new ForbiddenException(
        'PIN security can only be toggled from the host machine.',
      );
    }
    this.securityService.setPinEnabled(enabled);
    return { pinEnabled: this.securityService.isPinEnabled() };
  }

  @Get('pin')
  @UseGuards(AppThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  getPin(@Req() req: Request, @Ip() ip: string) {
    const local = this.securityService.isLocal(ip);
    const authHeader = req.headers['authorization'];

    if (local) {
      return { pin: this.securityService.getPin() };
    }

    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('PIN ')
    ) {
      const providedPin = authHeader.substring(4);
      if (this.securityService.verifyPin(providedPin)) {
        return { pin: this.securityService.getPin() };
      }
    }

    throw new ForbiddenException(
      'PIN can only be retrieved from the host machine or with valid PIN authorization.',
    );
  }

  @Post('verify')
  @UseGuards(AppThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  verify(@Body('pin') pin: string, @Ip() ip: string) {
    // Allow localhost access without PIN
    if (this.securityService.isLocal(ip)) {
      return { success: true };
    }

    const remainingMs = this.securityService.getLockoutRemainingMs(ip);
    if (remainingMs > 0) {
      throw new ForbiddenException({
        message: 'PIN temporarily disabled for this IP.',
        disabled: true,
        retryAfterMs: remainingMs,
      });
    }

    if (this.securityService.verifyPin(pin)) {
      return { success: true };
    }

    throw new ForbiddenException('Invalid PIN');
  }
}
