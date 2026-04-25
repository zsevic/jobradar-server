import { NormalizedJob } from './normalized-job.interface';

export interface JobProviderAdapter {
  fetchJobs(
    sourceExternalId: string,
    sourceName: string,
  ): Promise<NormalizedJob[]>;
}
