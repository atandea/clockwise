import { randomInt } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from './settings.service';

interface IpLockState {
  until: number;
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private pin!: string;
  private pinEnabled: boolean = true;
  private readonly pinLockAtStartup: boolean = true;
  private readonly ipLockouts = new Map<string, IpLockState>();

  constructor(private readonly settingsService: SettingsService) {
    this.generatePin();
    const settings = this.settingsService.getSettings();

    // This captures the state recorded at the previous startup
    this.pinLockAtStartup =
      settings.pin_lock_at_startup ?? settings.pin_lock_enabled ?? true;

    // Load current PIN security state
    this.pinEnabled = settings.pin_lock_enabled ?? true;

    // Record current state as the 'startup' state for the NEXT run
    this.settingsService.updateSettings({
      pin_lock_at_startup: this.pinEnabled,
    });
  }

  isPinEnabled(): boolean {
    return this.pinEnabled;
  }

  getPinLockAtStartup(): boolean {
    return this.pinLockAtStartup;
  }

  setPinEnabled(enabled: boolean) {
    this.pinEnabled = enabled;
    this.settingsService.updateSettings({ pin_lock_enabled: enabled });
    this.logger.log(`Security PIN ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  private generatePin() {
    // Generate 4-digit PIN
    this.pin = randomInt(1000, 10000).toString();
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

  setIpLockout(ip: string, durationMs: number): void {
    const normalizedIp = this.normalizeIp(ip);
    if (!normalizedIp) return;

    const until = Date.now() + durationMs;
    this.ipLockouts.set(normalizedIp, { until });
  }

  getLockoutRemainingMs(ip: string | undefined): number {
    const normalizedIp = this.normalizeIp(ip);
    if (!normalizedIp) return 0;

    const lockout = this.ipLockouts.get(normalizedIp);
    if (!lockout) return 0;

    const remainingMs = lockout.until - Date.now();
    if (remainingMs <= 0) {
      this.ipLockouts.delete(normalizedIp);
      return 0;
    }

    return remainingMs;
  }

  isIpLocked(ip: string | undefined): boolean {
    return this.getLockoutRemainingMs(ip) > 0;
  }

  normalizeIp(ip: string | undefined): string | null {
    if (!ip) return null;

    const normalized = ip.trim();
    if (!normalized) return null;

    return normalized
      .replace(/^::ffff:/, '')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  isLocal(ip: string | undefined): boolean {
    if (!ip) return false;
    return (
      ip.startsWith('127.') || ip === '::1' || ip.startsWith('::ffff:127.')
    );
  }
}
