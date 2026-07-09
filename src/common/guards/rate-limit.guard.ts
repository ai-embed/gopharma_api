import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions, SKIP_RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitEntry>();

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      ip?: string;
      method: string;
      originalUrl?: string;
      route?: { path?: string };
      user?: { userId?: string };
    }>();
    const response = context.switchToHttp().getResponse<{
      setHeader(name: string, value: string | number): void;
    }>();

    const override = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    const limit = override?.limit ?? Number(this.configService.get('rateLimit.limit') ?? 120);
    const ttlMs = override?.ttlMs ?? Number(this.configService.get('rateLimit.ttlMs') ?? 60_000);
    const principal = request.user?.userId ?? request.ip ?? 'anonymous';
    const routeKey = request.route?.path ?? request.originalUrl ?? 'unknown-route';
    const key = `${principal}:${request.method}:${routeKey}`;
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + ttlMs
      });
      this.applyHeaders(response, limit, ttlMs, 1, now + ttlMs);
      this.cleanupExpired(now);
      return true;
    }

    current.count += 1;
    this.applyHeaders(response, limit, ttlMs, current.count, current.resetAt);

    if (current.count > limit) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    this.cleanupExpired(now);
    return true;
  }

  private applyHeaders(
    response: { setHeader(name: string, value: string | number): void },
    limit: number,
    ttlMs: number,
    count: number,
    resetAt: number
  ) {
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(limit - count, 0));
    response.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000));
    response.setHeader('Retry-After', Math.ceil(ttlMs / 1000));
  }

  private cleanupExpired(now: number) {
    if (this.buckets.size < 10_000) {
      return;
    }

    for (const [key, entry] of this.buckets.entries()) {
      if (entry.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
