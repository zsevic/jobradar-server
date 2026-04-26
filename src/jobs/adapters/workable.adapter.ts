import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SourceProvider } from '../../database/entities/source.entity';
import { JobProviderAdapter } from '../interfaces/job-provider-adapter.interface';
import { NormalizedJob } from '../interfaces/normalized-job.interface';
import { extractSeniorityFromTitle } from '../utils/extract-seniority';
import {
  classifyRoleFromTitle,
  extractStackFromJobText,
} from '../utils/extract-stack';
import { stripLocationFromTitle } from '../utils/strip-title-location';

interface WorkableLocation {
  location_str?: string;
  telecommuting?: boolean;
  workplace_type?: string;
  city?: string;
  country?: string;
  country_name?: string;
  region?: string;
  state_code?: string;
}

interface WorkableJob {
  id?: string;
  title?: string;
  shortcode?: string;
  url?: string;
  shortlink?: string;
  experience?: string;
  description?: string;
  full_description?: string;
  location?: WorkableLocation;
  locations?: WorkableLocation[];
  created_at?: string;
  state?: string;
}

interface WorkableJobsResponse {
  jobs: WorkableJob[];
}

@Injectable()
export class WorkableAdapter implements JobProviderAdapter {
  private readonly logger = new Logger(WorkableAdapter.name);
  private readonly baseUrl = 'https://www.workable.com/api/accounts';

  constructor(private readonly httpService: HttpService) {}

  async fetchJobs(
    sourceExternalId: string,
    sourceName: string,
  ): Promise<NormalizedJob[]> {
    const endpoint = `${this.baseUrl}/${encodeURIComponent(sourceExternalId)}`;

    const { data } = await firstValueFrom(
      this.httpService.get<WorkableJobsResponse>(endpoint, {
        params: { details: true },
        timeout: 10000,
      }),
    );

    const jobs = data.jobs ?? [];
    this.logger.log(
      `Fetched ${jobs.length} workable jobs for ${sourceExternalId}`,
    );

    return jobs
      .filter((job) => {
        const hasBasics = !!job.title && !!(job.url || job.shortlink);
        const isPublished = !job.state || job.state === 'published';
        return hasBasics && isPublished;
      })
      .map((job) => {
        const location = this.resolveLocation(job);
        const isRemote = this.resolveIsRemote(job, location);
        const rawTitle = (job.title as string).trim();
        const title = stripLocationFromTitle(rawTitle, location);
        const seniority =
          this.resolveSeniorityFromExperience(job.experience) ??
          extractSeniorityFromTitle(title);
        const descriptionText = `${job.description ?? ''} ${job.full_description ?? ''}`;
        const role = classifyRoleFromTitle(title);
        const stack = extractStackFromJobText(title, descriptionText, role);

        return {
          provider: SourceProvider.WORKABLE,
          externalId: job.id?.toString() || (job.shortcode as string),
          title,
          company: sourceName,
          location,
          isRemote,
          postedAt: job.created_at ? new Date(job.created_at) : new Date(),
          url: (job.url || job.shortlink) as string,
          stack,
          seniority,
        };
      });
  }

  private resolveSeniorityFromExperience(experience?: string): string | null {
    const value = experience?.toLowerCase().trim();
    if (!value) {
      return null;
    }

    if (
      value.includes('director') ||
      value.includes('executive') ||
      value.includes('head') ||
      value.includes('vp') ||
      value.includes('chief')
    ) {
      return 'staff';
    }

    if (value.includes('senior')) {
      return 'senior';
    }

    if (
      value.includes('entry') ||
      value.includes('junior') ||
      value.includes('intern') ||
      value.includes('trainee')
    ) {
      return 'junior';
    }

    if (
      value.includes('associate') ||
      value.includes('mid') ||
      value.includes('intermediate')
    ) {
      return 'mid';
    }

    return null;
  }

  private resolveLocation(job: WorkableJob): string {
    const primary = job.location?.location_str?.trim();
    if (primary) {
      return primary;
    }

    const normalizedLocations = (job.locations ?? [])
      .map((entry) => this.stringifyStructuredLocation(entry))
      .filter((entry) => entry.length > 0);

    if (normalizedLocations.length > 0) {
      return normalizedLocations.join(' / ');
    }

    return 'Unknown';
  }

  private resolveIsRemote(job: WorkableJob, location: string): boolean {
    const primaryRemote =
      Boolean(job.location?.telecommuting) ||
      (job.location?.workplace_type ?? '').toLowerCase() === 'remote';
    if (primaryRemote) {
      return true;
    }

    const structuredRemote = (job.locations ?? []).some(
      (entry) =>
        Boolean(entry.telecommuting) ||
        (entry.workplace_type ?? '').toLowerCase() === 'remote',
    );
    if (structuredRemote) {
      return true;
    }

    const descriptionText =
      `${job.description ?? ''} ${job.full_description ?? ''}`
        .toLowerCase()
        .replace(/<[^>]*>/g, ' ');
    const remoteIndicators = [
      'remote-first',
      'remote first',
      'remote work',
      'work remotely',
      'fully remote',
      'full remote',
      '100% remote',
      'distributed team',
      'work from home',
      'wfh',
    ];
    if (remoteIndicators.some((phrase) => descriptionText.includes(phrase))) {
      return true;
    }

    return location.toLowerCase().includes('remote');
  }

  private stringifyStructuredLocation(location: WorkableLocation): string {
    const city = location.city?.trim();
    const state = location.state_code?.trim() || location.region?.trim();
    const country = location.country_name?.trim() || location.country?.trim();

    if (city && state && country) {
      return `${city}, ${state}, ${country}`;
    }
    if (city && country) {
      return `${city}, ${country}`;
    }
    if (country) {
      return country;
    }
    if (city) {
      return city;
    }
    return '';
  }
}
