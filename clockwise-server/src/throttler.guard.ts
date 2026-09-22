import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { ThrottlerLimitDetail } from '@nestjs/throttler/dist/throttler.guard.interface';
import { SecurityService } from './security.service';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly securityService: SecurityService,
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;

    if (
      this.securityService.isLocal(ip) ||
      !this.securityService.isPinEnabled() ||
      this.hasValidPin(request)
    ) {
      return true;
    }

    return super.canActivate(context);
  }

  private hasValidPin(request: any): boolean {
    const authHeader = request.headers?.authorization;
    const headerPin =
      typeof authHeader === 'string' && authHeader.startsWith('PIN ')
        ? authHeader.substring(4)
        : '';
    const queryPin =
      typeof request.query?.pin === 'string' ? request.query.pin : '';
    const bodyPin = typeof request.body?.pin === 'string' ? request.body.pin : '';
    const isVerifyEndpoint = request.path?.endsWith('/security/verify');
    const candidatePins = isVerifyEndpoint
      ? [bodyPin]
      : [headerPin, queryPin];

    return candidatePins.some((pin) => this.securityService.verifyPin(pin));
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const retryAfterMs = throttlerLimitDetail.timeToBlockExpire * 1000;

    this.securityService.setIpLockout(request.ip, retryAfterMs);

    throw new HttpException(
      {
        message: await this.getErrorMessage(context, throttlerLimitDetail),
        disabled: true,
        retryAfterMs,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
