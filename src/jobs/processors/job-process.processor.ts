import { createHash } from 'crypto';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job as BullJob } from 'bullmq';
import { Repository } from 'typeorm';
import { Job } from '../../database/entities/job.entity';
import { JOB_PROCESS_QUEUE } from '../jobs.constants';
import { NormalizedJob } from '../interfaces/normalized-job.interface';
import { JobsService } from '../jobs.service';

interface PersistJobPayload {
  sourceId: string;
  normalizedJob: NormalizedJob;
}

@Injectable()
@Processor(JOB_PROCESS_QUEUE, {
  concurrency: 4,
})
export class JobProcessProcessor extends WorkerHost {
  private readonly TWO_DAYS_IN_MS = 48 * 60 * 60 * 1000;
  private readonly logger = new Logger(JobProcessProcessor.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    private readonly jobsService: JobsService,
  ) {
    super();
  }

  async process(job: BullJob<PersistJobPayload>): Promise<void> {
    const input = job.data.normalizedJob;
    const jobId = `${input.provider}:${input.externalId}`;
    const hash = this.buildJobHash(input);

    const existing = await this.jobRepository.findOne({
      where: [
        { id: jobId },
        {
          provider: input.provider,
          externalId: input.externalId,
        },
        { hash },
      ],
    });

    if (existing) {
      this.logger.debug(`Skip duplicate job ${jobId}`);
      return;
    }

    const saved = await this.jobRepository.save({
      id: jobId,
      provider: input.provider,
      externalId: input.externalId,
      title: input.title,
      company: input.company,
      location: input.location,
      isRemote: input.isRemote,
      postedAt: input.postedAt,
      url: input.url,
      stack: input.stack,
      seniority: input.seniority,
      hash,
    });

    const now = Date.now();
    if (now - saved.postedAt.getTime() <= this.TWO_DAYS_IN_MS) {
      await this.jobsService.enqueueJobForMatching(saved.id);
      this.logger.log(`Saved job ${saved.id} and enqueued for matching`);
      return;
    }

    this.logger.log(`Saved job ${saved.id} (older than 48h, skip matching)`);
  }

  private buildJobHash(job: NormalizedJob): string {
    const hashInput = [
      job.provider,
      job.externalId,
      job.title.toLowerCase(),
      job.company.toLowerCase(),
      job.location.toLowerCase(),
      job.url,
      job.postedAt.toISOString(),
    ].join('|');

    return createHash('sha256').update(hashInput).digest('hex');
  }
}
