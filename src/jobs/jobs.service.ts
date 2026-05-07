import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Brackets, Repository } from 'typeorm';
import { FilterPreset } from '../database/entities/filter-preset.entity';
import { Job } from '../database/entities/job.entity';
import { Source, SourceProvider } from '../database/entities/source.entity';
import {
  ASHBY_FETCH_QUEUE,
  GREENHOUSE_FETCH_QUEUE,
  JOB_MATCH_QUEUE,
  JOB_PROCESS_QUEUE,
  WORKABLE_FETCH_QUEUE,
} from './jobs.constants';
import { JobsQueryDto } from './dto/jobs-query.dto';
import { NormalizedJob } from './interfaces/normalized-job.interface';
import {
  matchesJobLocationPreset,
  normalizeCountryToken,
} from './utils/match-location-preset';
import { ProviderCircuitBreaker } from './utils/provider-circuit-breaker';

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
    private readonly providerCircuitBreaker: ProviderCircuitBreaker,
  ) {}

  async enqueueAshbySources(): Promise<void> {
    if (this.providerCircuitBreaker.isOpen(SourceProvider.ASHBY)) {
      this.logger.warn('Skip ashby polling: circuit open');
      return;
    }
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
    if (this.providerCircuitBreaker.isOpen(SourceProvider.GREENHOUSE)) {
      this.logger.warn('Skip greenhouse polling: circuit open');
      return;
    }
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
    if (this.providerCircuitBreaker.isOpen(SourceProvider.WORKABLE)) {
      this.logger.warn('Skip workable polling: circuit open');
      return;
    }
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

    if (this.providerCircuitBreaker.isOpen(source.provider)) {
      this.logger.warn(
        `Skip manual fetch: circuit open for ${source.provider}:${source.externalId}`,
      );
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
        'devsecops',
        'sre',
        'platform engineer',
        'infrastructure engineer',
        'cloud engineer',
        'site reliability',
      ],
      qa: ['qa', 'quality assurance', 'test engineer', 'automation engineer'],
      data: [
        'data engineer',
        'data engineering',
        'analytics engineer',
        'analytics engineering',
        'data platform engineer',
        'etl engineer',
        'bi engineer',
        'data analyst',
        'analytics analyst',
        'insights analyst',
        'reporting analyst',
        'bi analyst',
        'business intelligence analyst',
        'decision scientist',
        'marketing scientist',
        'business scientist',
        'growth scientist',
      ],
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
        'data scientist',
        'applied scientist',
        'research scientist',
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
      designer: [
        'designer',
        'ui designer',
        'ui ux designer',
        'ui/ux design',
        'ui/ux designer',
        'ui/ ux designer',
        'uxui designer',
        'ux designer',
        'ux product designer',
        'ui and graphic designer',
        'product designer',
        'visual designer',
        'interaction designer',
        'service designer',
        'web designer',
        'graphic designer',
        'game designer',
        'ux researcher',
        'user experience designer',
        'user experience researcher',
        'ux/ui manager',
        'ui/ux manager',
        'ux manager',
        'ui manager',
        'design manager',
        'design director',
        'design lead',
        'ux lead',
        'ui lead',
        'ux/ui lead',
        'ui/ux lead',
        'head of design',
        'director of design',
        'vp of design',
      ],
      security: [
        'security engineer',
        'security engineering',
        'application security',
        'appsec',
        'product security',
        'cloud security',
        'cybersecurity',
        'information security',
        'infosec',
        'security architect',
        'offensive security',
        'defensive security',
        'penetration testing',
        'pentest',
        'soc engineer',
        'security operations engineer',
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
        'head of security',
        'director of security',
        'vp of security',
        'ciso',
        'chief information security officer',
        'security manager',
        'security director',
      ],
    };

    return keywordMap[role] ?? [];
  }

  private matchesPresetMetadata(
    job: Job,
    preset: Pick<FilterPreset, 'role' | 'stack' | 'seniority'>,
  ): boolean {
    const seniorityMatches =
      !preset.seniority ||
      job.seniorities.length === 0 ||
      job.seniorities.includes(preset.seniority);

    const rolesWithoutStack = [
      'devops',
      'qa',
      'management',
      'ai',
      'data',
      'solutions',
      'recruiter',
      'security',
      'designer',
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
    jobsQuery?: JobsQueryDto,
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
      seniorities: string[];
    }>;
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    const now = Date.now();
    const skip = (page - 1) * limit;

    const rolesWithoutStackForQuery = [
      'devops',
      'qa',
      'management',
      'ai',
      'data',
      'solutions',
      'recruiter',
      'security',
      'designer',
    ] as const;

    const overridePreset =
      jobsQuery?.role !== undefined
        ? {
            role: jobsQuery.role,
            stack: rolesWithoutStackForQuery.includes(
              jobsQuery.role as (typeof rolesWithoutStackForQuery)[number],
            )
              ? []
              : (jobsQuery.stack ?? []),
            seniority: jobsQuery.seniority!,
            locations: jobsQuery.location!,
            alertsEnabled: jobsQuery.alertsEnabled ?? true,
          }
        : null;

    const preset =
      overridePreset ??
      (await this.filterPresetRepository.findOneBy({ userId }));
    const roleKeywords = this.getRoleTitleKeywords(preset?.role ?? '');

    const jobQuery = this.jobsRepository
      .createQueryBuilder('job')
      .orderBy('job.postedAt', 'DESC');

    if (preset) {
      if (roleKeywords.length > 0) {
        jobQuery.andWhere(
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
        jobQuery.andWhere('job.role = :presetRole', {
          presetRole: preset.role,
        });
      }
    }

    if (!preset) {
      jobQuery.skip(skip).take(limit);
      const [jobs, total] = await jobQuery.getManyAndCount();
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
        seniorities: job.seniorities,
      }));

      return {
        items,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    const jobs = await jobQuery.getMany();
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
      seniorities: job.seniorities,
    }));

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getLatestJobsPreview(
    limit = 5,
    countryParam?: string | null,
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
    }>;
    total: number;
    country: string | null;
  }> {
    // Total: all jobs in the table (landing page headline count).
    const total = await this.jobsRepository.count();

    const countryName = this.resolvePreviewCountry(countryParam);

    // Public preview list: only jobs with a classified role (see job-process classification).
    const jobQuery = this.jobsRepository
      .createQueryBuilder('job')
      .where('job.role IS NOT NULL')
      .andWhere("length(trim(job.role)) > 0");

    const countryLike =
      countryName !== null ? `%${countryName}%` : null;

    if (countryName && countryLike) {
      jobQuery.andWhere(
        new Brackets((qb) => {
          qb.where(':country = ANY(job.locationCountries)', {
            country: countryName,
          })
            .orWhere('job.isRemote = TRUE')
            .orWhere(
              'LOWER(COALESCE(job.locationRaw, \'\')) LIKE :countryLike',
              {
                countryLike,
              },
            )
            .orWhere('LOWER(job.location) LIKE :countryLike', {
              countryLike,
            });
        }),
      );

      // Prefer in-country / location-text matches over remote-only listings.
      jobQuery
        .orderBy(
          `CASE WHEN (
            :country = ANY(job.locationCountries)
            OR LOWER(COALESCE(job.locationRaw, '')) LIKE :countryLike
            OR LOWER(job.location) LIKE :countryLike
          ) THEN 0
          WHEN job.isRemote = TRUE THEN 1
          ELSE 2 END`,
          'ASC',
        )
        .addOrderBy('job.postedAt', 'DESC');
    } else {
      jobQuery.orderBy('job.postedAt', 'DESC');
    }

    const jobs = await jobQuery.take(limit).getMany();

    const now = Date.now();
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
    }));

    return {
      items,
      total,
      country: countryName,
    };
  }

  /** Resolves `?country=` to a normalized lowercase country token for preview filtering. */
  private resolvePreviewCountry(countryParam?: string | null): string | null {
    const raw = countryParam?.trim();
    if (!raw) {
      return null;
    }

    if (/^[A-Za-z]{2}$/.test(raw)) {
      try {
        const code = raw.toUpperCase();
        const display = new Intl.DisplayNames(['en'], {
          type: 'region',
        }).of(code);
        if (!display || display === code) {
          return null;
        }
        if (display.toLowerCase().includes('unknown')) {
          return null;
        }
        return normalizeCountryToken(display);
      } catch {
        return null;
      }
    }

    const token = normalizeCountryToken(raw);
    return token.length > 0 ? token : null;
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
