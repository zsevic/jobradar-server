import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SourceProvider } from '../../database/entities/source.entity';
import { JobProviderAdapter } from '../interfaces/job-provider-adapter.interface';
import { NormalizedJob } from '../interfaces/normalized-job.interface';

interface AshbyApiJob {
  id?: string;
  title?: string;
  location?: string;
  isRemote?: boolean;
  workplaceType?: string;
  publishedAt?: string;
  jobUrl?: string;
  applyUrl?: string;
  isListed?: boolean;
}

interface AshbyApiResponse {
  jobs: AshbyApiJob[];
}

@Injectable()
export class AshbyAdapter implements JobProviderAdapter {
  private readonly logger = new Logger(AshbyAdapter.name);
  private readonly baseUrl = 'https://api.ashbyhq.com/posting-api/job-board';

  constructor(private readonly httpService: HttpService) {}

  async fetchJobs(
    sourceExternalId: string,
    sourceName: string,
  ): Promise<NormalizedJob[]> {
    const endpoint = `${this.baseUrl}/${encodeURIComponent(sourceExternalId)}`;
    const { data } = await firstValueFrom(
      this.httpService.get<AshbyApiResponse>(endpoint, {
        timeout: 10000,
      }),
    );

    const jobs = data.jobs ?? [];
    this.logger.log(
      `Fetched ${jobs.length} ashby jobs for ${sourceExternalId}`,
    );

    return jobs
      .filter(
        (job) => (job.isListed ?? true) && !!job.title && !!job.publishedAt,
      )
      .map((job) => {
        const location = job.location?.trim() || 'Unknown';
        const url = job.jobUrl || job.applyUrl || '';
        const isRemote =
          Boolean(job.isRemote) ||
          job.workplaceType?.toLowerCase() === 'remote' ||
          location.toLowerCase().includes('remote');

        return {
          provider: SourceProvider.ASHBY,
          externalId:
            job.id?.toString() ||
            `${sourceExternalId}:${job.title}:${job.publishedAt}`,
          title: (job.title as string).trim(),
          company: sourceName,
          location,
          isRemote,
          postedAt: new Date(job.publishedAt as string),
          url,
          stack: [],
          seniority: null,
        };
      })
      .filter((job) => job.url.length > 0);
  }
}
