import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RedisThrottlerStorage } from './redis-throttler.storage';

function readPositiveInt(
  configService: ConfigService,
  key: string,
  fallback: number,
): number {
  const parsed = Number(configService.get<string>(key) ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService, RedisThrottlerStorage],
      useFactory: (
        configService: ConfigService,
        storage: RedisThrottlerStorage,
      ) => {
        const ttl = readPositiveInt(
          configService,
          'RATE_LIMIT_PUBLIC_JOBS_TTL_MS',
          60_000,
        );
        const blockDuration = readPositiveInt(
          configService,
          'RATE_LIMIT_PUBLIC_JOBS_BLOCK_MS',
          ttl,
        );

        return {
          storage,
          errorMessage: 'Too many requests. Please try again later.',
          throttlers: [
            {
              name: 'default',
              ttl,
              limit: readPositiveInt(
                configService,
                'RATE_LIMIT_PUBLIC_JOBS_MAX',
                60,
              ),
              blockDuration,
            },
            {
              name: 'latest',
              ttl,
              limit: readPositiveInt(
                configService,
                'RATE_LIMIT_PUBLIC_JOBS_LATEST_MAX',
                30,
              ),
              blockDuration,
            },
          ],
        };
      },
    }),
  ],
  providers: [
    RedisThrottlerStorage,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [ThrottlerModule, RedisThrottlerStorage],
})
export class RateLimitModule {}
