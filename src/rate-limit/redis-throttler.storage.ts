import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ThrottlerStorage } from '@nestjs/throttler';

type ThrottlerStorageRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisThrottlerStorage
  implements ThrottlerStorage, OnModuleDestroy
{
  private redis: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleDestroy(): void {
    void this.redis?.quit();
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const redis = this.getRedis();
    const hitsKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `${hitsKey}:block`;

    const blockTtlMs = await redis.pttl(blockKey);
    if (blockTtlMs > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: Math.ceil(blockTtlMs / 1000),
        isBlocked: true,
        timeToBlockExpire: Math.ceil(blockTtlMs / 1000),
      };
    }

    const totalHits = await redis.incr(hitsKey);
    if (totalHits === 1) {
      await redis.pexpire(hitsKey, ttl);
    }

    let windowTtlMs = await redis.pttl(hitsKey);
    if (windowTtlMs < 0) {
      await redis.pexpire(hitsKey, ttl);
      windowTtlMs = ttl;
    }

    const timeToExpire = Math.max(1, Math.ceil(windowTtlMs / 1000));
    if (totalHits > limit) {
      await redis.set(blockKey, '1', 'PX', blockDuration);
      const timeToBlockExpire = Math.max(1, Math.ceil(blockDuration / 1000));
      return {
        totalHits,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire,
      };
    }

    return {
      totalHits,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  private getRedis(): Redis {
    if (this.redis) {
      return this.redis;
    }
    const url = this.configService.get<string>('REDIS_URL');
    if (!url) {
      throw new Error('REDIS_URL is required for rate limiting');
    }
    this.redis = new Redis(url, { maxRetriesPerRequest: 1 });
    return this.redis;
  }
}
