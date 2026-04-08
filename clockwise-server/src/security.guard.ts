import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SecurityService } from './security.service';

@Injectable()
export class SecurityGuard implements CanActivate {
  constructor(private readonly securityService: SecurityService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    
    // Allow localhost access without PIN
    if (this.securityService.isLocal(ip) || !this.securityService.isPinEnabled()) {
      return true;
    }

    // Network request: check for PIN in headers or query params (for SSE)
    const authHeader = request.headers['authorization'];
    let pin = '';
    if (authHeader && authHeader.startsWith('PIN ')) {
      pin = authHeader.substring(4);
    } else if (request.query && request.query.pin) {
      pin = request.query.pin as string;
    }

    if (!pin) {
      throw new ForbiddenException('Network access requires a PIN.');
    }

    if (this.securityService.verifyPin(pin)) {
      return true;
    }

    throw new ForbiddenException('Invalid PIN.');
  }
}
