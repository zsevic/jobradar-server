import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { Source, SourceProvider } from '../../database/entities/source.entity';
import { GreenhouseAdapter } from '../adapters/greenhouse.adapter';
import { GREENHOUSE_FETCH_QUEUE } from '../jobs.constants';
import { JobsService } from '../jobs.service';
import { isAxiosTimeoutError } from '../utils/is-axios-timeout';
import { ProviderCircuitBreaker } from '../utils/provider-circuit-breaker';

interface FetchSourceJobPayload {
  sourceId: string;
}

@Injectable()
@Processor(GREENHOUSE_FETCH_QUEUE, {
  concurrency: 2,
})
export class GreenhouseFetchProcessor extends WorkerHost {
  private readonly logger = new Logger(GreenhouseFetchProcessor.name);

  constructor(
    @InjectRepository(Source)
    private readonly sourceRepository: Repository<Source>,
    private readonly greenhouseAdapter: GreenhouseAdapter,
    private readonly jobsService: JobsService,
    private readonly providerCircuitBreaker: ProviderCircuitBreaker,
  ) {
    super();
  }

  async process(job: Job<FetchSourceJobPayload>): Promise<void> {
    const source = await this.sourceRepository.findOne({
      where: {
        id: job.data.sourceId,
        provider: SourceProvider.GREENHOUSE,
        isActive: true,
      },
    });

    if (!source) {
      return;
    }

    try {
      const normalizedJobs = await this.greenhouseAdapter.fetchJobs(
        source.externalId,
        source.name,
      );

      for (const normalizedJob of normalizedJobs) {
        await this.jobsService.enqueueJobForProcessing({
          sourceId: source.id,
          normalizedJob,
        });
      }

      await this.jobsService.reconcileStaleJobsForSource(
        source,
        normalizedJobs,
      );

      source.lastSyncedAt = new Date();
      source.syncStatus = 'success';
      await this.sourceRepository.save(source);
      this.logger.log(
        `Queued ${normalizedJobs.length} jobs from source ${source.externalId}`,
      );
    } catch (error) {
      if (isAxiosTimeoutError(error)) {
        this.providerCircuitBreaker.recordTimeout(SourceProvider.GREENHOUSE);
      }
      source.syncStatus = 'error';
      await this.sourceRepository.save(source);
      this.logger.error(
        `Failed to fetch source ${source.externalId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw error;
    }
  }
}
