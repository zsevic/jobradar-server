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
import { matchesJobLocationPreset } from './utils/match-location-preset';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly NEW_JOB_WINDOW_HOURS = 24;

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

  async enqueueSourceByCompany(company: string): Promise<{
    sourceId: string;
    provider: SourceProvider;
    externalId: string;
    name: string;
  } | null> {
    const normalized = company.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const source = await this.sourceRepository
      .createQueryBuilder('source')
      .where('source.isActive = :isActive', { isActive: true })
      .andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(source.name) = :normalized', { normalized });
          qb.orWhere('LOWER(source.externalId) = :normalized', { normalized });
        }),
      )
      .getOne();

    if (!source) {
      return null;
    }

    const payload = { sourceId: source.id };
    const queueOptions = {
      removeOnComplete: true,
      removeOnFail: 200,
    };

    if (source.provider === SourceProvider.ASHBY) {
      await this.ashbyFetchQueue.add('fetch-source', payload, queueOptions);
    } else if (source.provider === SourceProvider.GREENHOUSE) {
      await this.greenhouseFetchQueue.add('fetch-source', payload, queueOptions);
    } else {
      await this.workableFetchQueue.add('fetch-source', payload, queueOptions);
    }

    this.logger.log(
      `Enqueued specific source poll for ${source.provider}:${source.externalId}`,
    );

    return {
      sourceId: source.id,
      provider: source.provider,
      externalId: source.externalId,
      name: source.name,
    };
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
        'server-side',
      ],
      frontend: ['frontend', 'front-end', 'react', 'angular', 'vue', 'next.js'],
      fullstack: ['fullstack', 'full-stack'],
      mobile: ['mobile', 'android', 'ios', 'react native', 'swift', 'kotlin'],
      devops: [
        'devops',
        'sre',
        'platform engineer',
        'infrastructure engineer',
        'site reliability',
      ],
      qa: ['qa', 'quality assurance', 'test engineer', 'automation engineer'],
      engineer: [
        'engineer',
        'engineering',
        'software engineer',
        'member of technical staff',
      ],
      ai: [
        'ai engineer',
        'ai engineering',
        'ai developer',
        'ai data engineer',
        'ai research engineer',
        'ai/ml engineer',
        'ai & ml engineer',
        'ai agents',
        'artificial intelligence',
        'machine learning',
        'machine learning engineer',
        'deep learning',
        'ml',
        'llm',
        'nlp',
        'computer vision',
        'generative ai',
      ],
      solutions: [
        'solutions engineer',
        'solutions architect',
        'solutions consultant',
        'sales engineer',
        'pre-sales engineer',
        'presales engineer',
        'gtm engineer',
        'go-to-market engineer',
        'forward deployed engineer',
      ],
      recruiter: [
        'recruiter',
        'technical recruiter',
        'talent acquisition',
        'sourcer',
        'staffing',
      ],
      management: [
        'engineering manager',
        'director of engineering',
        'head of engineering',
        'vp of engineering',
        'tech lead',
        'technical lead',
        'team lead',
        'project manager',
        'program manager',
        'engineering program manager',
        'engineering project manager',
        'technical project manager',
        'technical program manager',
        'product manager',
        'product marketing manager',
        'group product manager',
        'technical product manager',
        'product owner',
        'head of product',
        'vp of product',
        'head of solutions',
        'director of solutions',
        'vp of solutions',
      ],
    };

    return keywordMap[role] ?? [];
  }

  private matchesPresetMetadata(job: Job, preset: FilterPreset): boolean {
    const seniorityMatches =
      !preset.seniority || !job.seniority || job.seniority === preset.seniority;

    const rolesWithoutStack = [
      'devops',
      'qa',
      'management',
      'ai',
      'solutions',
      'recruiter',
    ];
    const stackRequired =
      !rolesWithoutStack.includes(preset.role) && preset.stack.length > 0;

    const stackMatches = stackRequired
      ? preset.stack.some((stack) => job.stack.includes(stack))
      : preset.stack.length === 0 ||
        preset.stack.some((stack) => job.stack.includes(stack));

    return seniorityMatches && stackMatches;
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
      locationPrimary: string;
      locationSecondary: string[];
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
    const skip = (page - 1) * limit;
    const preset = await this.filterPresetRepository.findOneBy({ userId });
    const roleKeywords = this.getRoleTitleKeywords(preset?.role ?? '');

    const query = this.jobsRepository
      .createQueryBuilder('job')
      .orderBy('job.postedAt', 'DESC');

    if (preset) {
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
    }

    if (!preset) {
      query.skip(skip).take(limit);
      const [jobs, total] = await query.getManyAndCount();
      const items = jobs.map((job) => ({
        ...this.getApiLocationParts(job),
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

    const jobs = await query.getMany();
    let filtered = jobs.filter((job) =>
      matchesJobLocationPreset(job, preset.locations),
    );
    filtered = filtered.filter((job) =>
      this.matchesPresetMetadata(job, preset),
    );
    const total = filtered.length;
    const pagedJobs = filtered.slice(skip, skip + limit);

    const items = pagedJobs.map((job) => ({
      ...this.getApiLocationParts(job),
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
      locationPrimary: string;
      locationSecondary: string[];
      isRemote: boolean;
      postedAt: string;
      isNew: boolean;
    }>
  > {
    // Public preview: only jobs with a classified role (see job-process classification).
    const jobs = await this.jobsRepository
      .createQueryBuilder('job')
      .where('job.role IS NOT NULL')
      .andWhere("length(trim(job.role)) > 0")
      .orderBy('job.postedAt', 'DESC')
      .take(limit)
      .getMany();

    const now = Date.now();
    return jobs.map((job) => ({
      ...this.getApiLocationParts(job),
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

  private getApiLocationParts(job: Job): {
    locationPrimary: string;
    locationSecondary: string[];
  } {
    const raw = (job.locationRaw ?? '').trim();
    if (!raw) {
      return {
        locationPrimary: job.location,
        locationSecondary: [],
      };
    }

    // Preferred format (new Ashby ingest): "primary | secondary1 | secondary2"
    if (raw.includes('|')) {
      const parts = raw
        .split('|')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      if (parts.length > 0) {
        return {
          locationPrimary: parts[0],
          locationSecondary: parts.slice(1),
        };
      }
    }

    // Backward-compatible fallback for older Ashby records stored as comma list.
    if (job.provider === SourceProvider.ASHBY) {
      const bits = raw
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
      if (bits.length > 0) {
        const hasRemote = bits.some((part) => part.toLowerCase() === 'remote');
        if (hasRemote) {
          const firstGeo = bits.find((part) => part.toLowerCase() !== 'remote');
          const remainder = bits.filter(
            (part, index) =>
              part.toLowerCase() !== 'remote' &&
              part !== firstGeo &&
              index !== bits.indexOf(firstGeo ?? ''),
          );
          return {
            locationPrimary: firstGeo ? `${firstGeo}, Remote` : 'Remote',
            locationSecondary: remainder,
          };
        }
        return {
          locationPrimary: bits[0],
          locationSecondary: bits.slice(1),
        };
      }
    }

    return {
      locationPrimary: job.location,
      locationSecondary: [],
    };
  }
}
