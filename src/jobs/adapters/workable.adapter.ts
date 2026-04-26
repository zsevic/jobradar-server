import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SourceProvider } from '../../database/entities/source.entity';
import { JobProviderAdapter } from '../interfaces/job-provider-adapter.interface';
import { NormalizedJob } from '../interfaces/normalized-job.interface';
import { stripLocationFromTitle } from '../utils/strip-title-location';

interface WorkableLocation {
  location_str?: string;
  telecommuting?: boolean;
  workplace_type?: string;
}

interface WorkableJob {
  id?: string;
  title?: string;
  shortcode?: string;
  url?: string;
  shortlink?: string;
  location?: WorkableLocation;
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
        const location = job.location?.location_str?.trim() || 'Unknown';
        const telecommuting = Boolean(job.location?.telecommuting);
        const workplaceType = (
          job.location?.workplace_type ?? ''
        ).toLowerCase();
        const isRemote =
          telecommuting ||
          workplaceType === 'remote' ||
          location.toLowerCase().includes('remote');
        const rawTitle = (job.title as string).trim();
        const title = stripLocationFromTitle(rawTitle, location);

        return {
          provider: SourceProvider.WORKABLE,
          externalId: job.id?.toString() || (job.shortcode as string),
          title,
          company: sourceName,
          location,
          isRemote,
          postedAt: job.created_at ? new Date(job.created_at) : new Date(),
          url: (job.url || job.shortlink) as string,
          stack: [],
          seniority: null,
        };
      });
  }
}
