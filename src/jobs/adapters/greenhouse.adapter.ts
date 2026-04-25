import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SourceProvider } from '../../database/entities/source.entity';
import { JobProviderAdapter } from '../interfaces/job-provider-adapter.interface';
import { NormalizedJob } from '../interfaces/normalized-job.interface';
import { stripLocationFromTitle } from '../utils/strip-title-location';

interface GreenhouseJob {
  id: number;
  title: string;
  location?: {
    name?: string;
  };
  updated_at?: string;
  absolute_url?: string;
}

interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
}

@Injectable()
export class GreenhouseAdapter implements JobProviderAdapter {
  private readonly logger = new Logger(GreenhouseAdapter.name);
  private readonly baseUrl = 'https://boards-api.greenhouse.io/v1/boards';

  constructor(private readonly httpService: HttpService) {}

  async fetchJobs(
    sourceExternalId: string,
    sourceName: string,
  ): Promise<NormalizedJob[]> {
    const endpoint = `${this.baseUrl}/${encodeURIComponent(sourceExternalId)}/jobs`;
    const { data } = await firstValueFrom(
      this.httpService.get<GreenhouseJobsResponse>(endpoint, {
        params: {
          content: true,
        },
        timeout: 10000,
      }),
    );

    const jobs = data.jobs ?? [];
    this.logger.log(
      `Fetched ${jobs.length} greenhouse jobs for ${sourceExternalId}`,
    );

    return jobs
      .filter((job) => !!job.id && !!job.title && !!job.absolute_url)
      .map((job) => {
        const location = job.location?.name?.trim() || 'Unknown';
        const locationLower = location.toLowerCase();
        const isRemote =
          locationLower.includes('remote') ||
          locationLower.includes('anywhere');
        const title = stripLocationFromTitle(job.title.trim(), location);

        return {
          provider: SourceProvider.GREENHOUSE,
          externalId: String(job.id),
          title,
          company: sourceName,
          location,
          isRemote,
          postedAt: job.updated_at ? new Date(job.updated_at) : new Date(),
          url: job.absolute_url as string,
          stack: [],
          seniority: null,
        };
      });
  }
}
