import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Job } from '../database/entities/job.entity';
import { Source, SourceProvider } from '../database/entities/source.entity';
import {
  ASHBY_FETCH_QUEUE,
  EMAIL_SEND_QUEUE,
  GREENHOUSE_FETCH_QUEUE,
  JOB_MATCH_QUEUE,
  JOB_PROCESS_QUEUE,
  WORKABLE_FETCH_QUEUE,
} from './jobs.constants';
import { NormalizedJob } from './interfaces/normalized-job.interface';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly NEW_JOB_WINDOW_HOURS = 24;
  private readonly TWO_DAYS_IN_MS = 48 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(Source)
    private readonly sourceRepository: Repository<Source>,
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectQueue(ASHBY_FETCH_QUEUE)
    private readonly ashbyFetchQueue: Queue,
    @InjectQueue(GREENHOUSE_FETCH_QUEUE)
    private readonly greenhouseFetchQueue: Queue,
    @InjectQueue(WORKABLE_FETCH_QUEUE)
    private readonly workableFetchQueue: Queue,
    @InjectQueue(JOB_PROCESS_QUEUE)
    private readonly jobProcessQueue: Queue,
    @InjectQueue(JOB_MATCH_QUEUE)
    private readonly jobMatchQueue: Queue,
    @InjectQueue(EMAIL_SEND_QUEUE)
    private readonly emailSendQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduleSourcePolling(): Promise<void> {
    await this.enqueueAshbySources();
    await this.enqueueGreenhouseSources();
    await this.enqueueWorkableSources();
  }

  async enqueueAshbySources(): Promise<void> {
    const ashbySources = await this.sourceRepository.find({
      where: {
        provider: SourceProvider.ASHBY,
        isActive: true,
      },
      order: {
        name: 'ASC',
      },
    });

    for (const [index, source] of ashbySources.entries()) {
      await this.ashbyFetchQueue.add(
        'fetch-source',
        {
          sourceId: source.id,
        },
        {
          delay: index * 400,
          removeOnComplete: true,
          removeOnFail: 200,
        },
      );
    }

    this.logger.log(`Enqueued ${ashbySources.length} ashby sources`);
  }

  async enqueueGreenhouseSources(): Promise<void> {
    const greenhouseSources = await this.sourceRepository.find({
      where: {
        provider: SourceProvider.GREENHOUSE,
        isActive: true,
      },
      order: {
        name: 'ASC',
      },
    });

    for (const [index, source] of greenhouseSources.entries()) {
      await this.greenhouseFetchQueue.add(
        'fetch-source',
        {
          sourceId: source.id,
        },
        {
          delay: index * 400,
          removeOnComplete: true,
          removeOnFail: 200,
        },
      );
    }

    this.logger.log(`Enqueued ${greenhouseSources.length} greenhouse sources`);
  }

  async enqueueWorkableSources(): Promise<void> {
    const workableSources = await this.sourceRepository.find({
      where: {
        provider: SourceProvider.WORKABLE,
        isActive: true,
      },
      order: {
        name: 'ASC',
      },
    });

    for (const [index, source] of workableSources.entries()) {
      await this.workableFetchQueue.add(
        'fetch-source',
        {
          sourceId: source.id,
        },
        {
          delay: index * 400,
          removeOnComplete: true,
          removeOnFail: 200,
        },
      );
    }

    this.logger.log(`Enqueued ${workableSources.length} workable sources`);
  }

  async enqueueJobForProcessing(payload: {
    sourceId: string;
    normalizedJob: NormalizedJob;
  }): Promise<void> {
    await this.jobProcessQueue.add('persist-job', payload, {
      removeOnComplete: true,
      removeOnFail: 200,
    });
  }

  async enqueueJobForMatching(jobId: string): Promise<void> {
    await this.jobMatchQueue.add(
      'match-job',
      { jobId },
      {
        removeOnComplete: true,
        removeOnFail: 200,
      },
    );
  }

  async enqueueEmailSend(payload: {
    userId: string;
    jobId: string;
    email: string;
    score: number;
  }): Promise<void> {
    await this.emailSendQueue.add('send-email', payload, {
      removeOnComplete: true,
      removeOnFail: 200,
    });
  }

  async getLatestJobs(
    limit = 100,
    page = 1,
  ): Promise<{
    items: Array<{
      id: string;
      title: string;
      company: string;
      location: string;
      isRemote: boolean;
      postedAt: string;
      isNew: boolean;
      url: string;
      stack: string[];
      seniority: string | null;
    }>;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const now = Date.now();
    const cutoffDate = new Date(now - this.TWO_DAYS_IN_MS);
    const skip = (page - 1) * limit;

    const [jobs, total] = await this.jobsRepository.findAndCount({
      where: {
        postedAt: MoreThanOrEqual(cutoffDate),
      },
      order: {
        postedAt: 'DESC',
      },
      take: limit,
      skip,
    });

    const items = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      isRemote: job.isRemote,
      postedAt: job.postedAt.toISOString(),
      isNew:
        now - job.postedAt.getTime() <=
        this.NEW_JOB_WINDOW_HOURS * 60 * 60 * 1000,
      url: job.url,
      stack: job.stack,
      seniority: job.seniority,
    }));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getLatestJobsPreview(limit = 5): Promise<
    Array<{
      id: string;
      title: string;
      company: string;
      location: string;
      isRemote: boolean;
      postedAt: string;
      isNew: boolean;
    }>
  > {
    const jobs = await this.jobsRepository.find({
      order: {
        postedAt: 'DESC',
      },
      take: limit,
    });

    const now = Date.now();
    return jobs
      .filter((job) => now - job.postedAt.getTime() <= this.TWO_DAYS_IN_MS)
      .map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        isRemote: job.isRemote,
        postedAt: job.postedAt.toISOString(),
        isNew:
          now - job.postedAt.getTime() <=
          this.NEW_JOB_WINDOW_HOURS * 60 * 60 * 1000,
      }));
  }
}
