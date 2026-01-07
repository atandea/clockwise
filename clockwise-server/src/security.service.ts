import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private pin: string;

  constructor() {
    this.generatePin();
  }

  private generatePin() {
    // Generate 4-digit PIN
    this.pin = Math.floor(1000 + Math.random() * 9000).toString();
    this.logger.log(`*************************************************`);
    this.logger.log(`* SECURITY PIN GENERATED: ${this.pin}          *`);
    this.logger.log(`* This PIN is required for network access.      *`);
    this.logger.log(`*************************************************`);
  }

  getPin(): string {
    return this.pin;
  }

  verifyPin(providedPin: string): boolean {
    return this.pin === providedPin;
  }

  isLocal(ip: string | undefined): boolean {
    if (!ip) return false;
    return ip === '127.0.0.1' || ip.startsWith('127.') || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
}
