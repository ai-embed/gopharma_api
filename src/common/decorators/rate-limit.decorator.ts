import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';
export const SKIP_RATE_LIMIT_KEY = 'skipRateLimit';

export interface RateLimitOptions {
  limit: number;
  ttlMs: number;
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
