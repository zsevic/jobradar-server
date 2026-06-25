import { createHash } from 'crypto';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job as BullJob } from 'bullmq';
import { Repository } from 'typeorm';
import { Job } from '../../database/entities/job.entity';
import { JOB_PROCESS_QUEUE } from '../jobs.constants';
import { NormalizedJob } from '../interfaces/normalized-job.interface';
import {
  formatRawLocation,
  resolveNormalizedLocation,
  stripCompanyNameFromLocation,
} from '../utils/clean-location';
import {
  extractCountriesFromGeoScopedRemoteText,
  extractCountryMentionsFromText,
  extractLocationFacets,
  mergeLocationFacetsWithCountryHints,
} from '../utils/normalize-location';
import { transliterateLocationDisplay } from '../utils/transliterate-location';

interface PersistJobPayload {
  sourceId: string;
  normalizedJob: Omit<NormalizedJob, 'postedAt'> & {
    postedAt: string | Date;
  };
}

@Injectable()
@Processor(JOB_PROCESS_QUEUE, {
  concurrency: 4,
})
export class JobProcessProcessor extends WorkerHost {
  private readonly logger = new Logger(JobProcessProcessor.name);
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
  ) {
    super();
  }

  async process(job: BullJob<PersistJobPayload>): Promise<void> {
    const input = job.data.normalizedJob;
    const postedAt =
      input.postedAt instanceof Date
        ? input.postedAt
        : new Date(input.postedAt);
    if (Number.isNaN(postedAt.getTime())) {
      this.logger.warn(
        `Skip job with invalid postedAt value for provider=${input.provider} externalId=${input.externalId}`,
      );
      return;
    }

    const incomingRaw = input.locationRaw ?? input.location;
    const latinizedRaw = transliterateLocationDisplay(incomingRaw);
    const formattedRawLocation = formatRawLocation(latinizedRaw);
    const locationForGeo = stripCompanyNameFromLocation(
      formattedRawLocation,
      input.company,
    );
    const normalizedLocation = resolveNormalizedLocation(locationForGeo, {
      remoteIndicatedByProvider: input.remoteIndicatedByProvider ?? false,
    });
    const normalizedJob: NormalizedJob = {
      ...input,
      postedAt,
      location: normalizedLocation,
    };
    const jobId = `${normalizedJob.provider}:${normalizedJob.externalId}`;
    const hash = this.buildJobHash(normalizedJob);

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
      // this.logger.debug(`Skip duplicate job ${jobId}`);
      return;
    }

    const rawForFacets =
      locationForGeo.toLowerCase() === 'unknown' ? '' : locationForGeo;
    const locationFacets =
      normalizedLocation === 'Remote'
        ? { tokens: ['remote'], countries: [], regions: [] }
        : extractLocationFacets(rawForFacets);
    const hintedCountries = (input.locationCountryHints ?? [])
      .map((country) => country.trim().toLowerCase())
      .filter((country) => country.length > 0);
    if (hintedCountries.length > 0) {
      const merged = mergeLocationFacetsWithCountryHints(
        locationFacets,
        hintedCountries,
      );
      locationFacets.countries = merged.countries;
      locationFacets.regions = merged.regions;
      locationFacets.tokens = merged.tokens;
    }

    if (locationFacets.countries.length === 0) {
      const countriesFromTitle = [
        ...extractCountryMentionsFromText(input.title),
        ...extractCountriesFromGeoScopedRemoteText(input.title),
      ];
      if (countriesFromTitle.length > 0) {
        locationFacets.countries = Array.from(new Set(countriesFromTitle));
        locationFacets.tokens = Array.from(
          new Set<string>([
            ...locationFacets.tokens,
            ...locationFacets.countries,
          ]),
        );
      }
    }

    const saved = await this.jobRepository.save({
      id: jobId,
      provider: input.provider,
      externalId: input.externalId,
      title: input.title,
      company: input.company,
      location: normalizedLocation,
      locationRaw: locationForGeo,
      locationTokens: locationFacets.tokens,
      locationCountries: locationFacets.countries,
      locationRegions: locationFacets.regions,
      isRemote: input.isRemote,
      role: input.role,
      postedAt: normalizedJob.postedAt,
      url: input.url,
      stack: input.stack,
      seniorities: input.seniorities,
      hash,
    });

    this.logger.log(`Saved job ${saved.id}`);
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
