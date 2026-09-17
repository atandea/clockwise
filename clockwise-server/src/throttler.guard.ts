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
