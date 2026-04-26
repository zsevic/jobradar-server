import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Brackets, Repository } from 'typeorm';
import { FilterPreset } from '../database/entities/filter-preset.entity';
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
  private readonly REMOTE_LOCATION = 'remote';

  constructor(
    @InjectRepository(Source)
    private readonly sourceRepository: Repository<Source>,
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectRepository(FilterPreset)
    private readonly filterPresetRepository: Repository<FilterPreset>,
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

  private getRoleTitleKeywords(role: string): string[] {
    const keywordMap: Record<string, string[]> = {
      backend: [
        'backend',
        'back-end',
        'api',
        'server',
        'node',
        'python',
        'java',
        'php',
        'golang',
      ],
      frontend: ['frontend', 'front-end', 'react', 'angular', 'vue', 'next.js'],
      fullstack: ['fullstack', 'full-stack'],
      mobile: ['mobile', 'android', 'ios', 'react native', 'swift', 'kotlin'],
      devops: [
        'devops',
        'sre',
        'platform',
        'infrastructure',
        'site reliability',
      ],
      qa: ['qa', 'quality assurance', 'test engineer', 'automation engineer'],
    };

    return keywordMap[role] ?? [];
  }

  private normalizeCountryToken(value: string): string {
    return value.trim().toLowerCase();
  }

  async getLatestJobsForUser(
    userId: string,
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
    const preset = await this.filterPresetRepository.findOneBy({ userId });
    const roleKeywords = this.getRoleTitleKeywords(preset?.role ?? '');

    const query = this.jobsRepository
      .createQueryBuilder('job')
      .where('job.postedAt >= :cutoffDate', { cutoffDate })
      .orderBy('job.postedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (preset) {
      if (preset.seniority) {
        query.andWhere('job.seniority = :seniority', {
          seniority: preset.seniority,
        });
      }

      if (preset.stack.length > 0) {
        query.andWhere('job.stack && ARRAY[:...stack]::text[]', {
          stack: preset.stack,
        });
      }

      if (roleKeywords.length > 0) {
        query.andWhere(
          new Brackets((qb) => {
            qb.where('job.role = :presetRole', {
              presetRole: preset.role,
            });
            qb.orWhere(
              new Brackets((legacyQb) => {
                legacyQb.where('job.role IS NULL');
                legacyQb.andWhere(
                  new Brackets((keywordQb) => {
                    for (const [index, keyword] of roleKeywords.entries()) {
                      keywordQb.orWhere(
                        `LOWER(job.title) LIKE :roleKeyword${index}`,
                        {
                          [`roleKeyword${index}`]: `%${keyword.toLowerCase()}%`,
                        },
                      );
                    }
                  }),
                );
              }),
            );
          }),
        );
      } else if (preset.role) {
        query.andWhere('job.role = :presetRole', {
          presetRole: preset.role,
        });
      }

      if (preset.locations.length > 0) {
        query.andWhere(
          new Brackets((qb) => {
            const normalizedLocations = preset.locations
              .map((value) => this.normalizeCountryToken(value))
              .filter((value) => value.length > 0);
            const wantsRemote = normalizedLocations.includes(
              this.REMOTE_LOCATION,
            );
            const countries = normalizedLocations.filter(
              (value) => value !== this.REMOTE_LOCATION,
            );

            if (wantsRemote) {
              qb.orWhere('job.isRemote = true');
              qb.orWhere('LOWER(job.location) LIKE :remoteLocation', {
                remoteLocation: '%remote%',
              });
            }

            for (const [index, country] of countries.entries()) {
              qb.orWhere(`LOWER(job.location) LIKE :country${index}`, {
                [`country${index}`]: `%${country}%`,
              });
            }
          }),
        );
      }
    }

    const [jobs, total] = await query.getManyAndCount();

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
