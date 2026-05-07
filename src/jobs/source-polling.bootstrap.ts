import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { SOURCE_POLLING_QUEUE } from './jobs.constants';

@Injectable()
export class SourcePollingBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(SourcePollingBootstrap.name);

  constructor(
    @InjectQueue(SOURCE_POLLING_QUEUE)
    private readonly pollingQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const minutes =
      this.configService.get<number>('SOURCE_POLLING_INTERVAL_MINUTES') ?? 30;
    const everyMs = minutes * 60 * 1000;

    await this.pollingQueue.upsertJobScheduler(
      'source-polling-repeatable',
      { every: everyMs },
      {
        name: 'run-source-polling',
        data: {},
        opts: {
          removeOnComplete: true,
          removeOnFail: 50,
        },
      },
    );

    this.logger.log(
      `Registered repeatable source polling every ${minutes} minutes (jobId=source-polling-repeatable)`,
    );
  }
}
