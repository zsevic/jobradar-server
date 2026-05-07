import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { EMAIL_DIGEST_QUEUE } from './jobs.constants';

@Injectable()
export class EmailDigestBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmailDigestBootstrap.name);

  constructor(
    @InjectQueue(EMAIL_DIGEST_QUEUE)
    private readonly digestQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const minutes =
      this.configService.get<number>('EMAIL_DIGEST_INTERVAL_MINUTES') ?? 15;
    const everyMs = minutes * 60 * 1000;

    const repeatables = await this.digestQueue.getRepeatableJobs();
    for (const r of repeatables) {
      if (r.id === 'email-digest-repeatable') {
        await this.digestQueue.removeRepeatableByKey(r.key);
      }
    }

    await this.digestQueue.add(
      'run-digest',
      {},
      {
        repeat: { every: everyMs },
        jobId: 'email-digest-repeatable',
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );

    this.logger.log(
      `Registered repeatable email digest every ${minutes} minutes (jobId=email-digest-repeatable)`,
    );
  }
}
