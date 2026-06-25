import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from '../database/entities/job.entity';
import { Source } from '../database/entities/source.entity';
import { AshbyAdapter } from './adapters/ashby.adapter';
import { GreenhouseAdapter } from './adapters/greenhouse.adapter';
import { LeverAdapter } from './adapters/lever.adapter';
import { WorkableAdapter } from './adapters/workable.adapter';
import { SourcePollingBootstrap } from './source-polling.bootstrap';
import {
  ASHBY_FETCH_QUEUE,
  GREENHOUSE_FETCH_QUEUE,
  JOB_PROCESS_QUEUE,
  LEVER_FETCH_QUEUE,
  SOURCE_POLLING_QUEUE,
  WORKABLE_FETCH_QUEUE,
} from './jobs.constants';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { AshbyFetchProcessor } from './processors/ashby-fetch.processor';
import { GreenhouseFetchProcessor } from './processors/greenhouse-fetch.processor';
import { JobProcessProcessor } from './processors/job-process.processor';
import { SourcePollingProcessor } from './processors/source-polling.processor';
import { LeverFetchProcessor } from './processors/lever-fetch.processor';
import { WorkableFetchProcessor } from './processors/workable-fetch.processor';
import { ProviderCircuitBreaker } from './utils/provider-circuit-breaker';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Source, Job]),
    BullModule.registerQueue(
      { name: ASHBY_FETCH_QUEUE },
      { name: GREENHOUSE_FETCH_QUEUE },
      { name: WORKABLE_FETCH_QUEUE },
      { name: LEVER_FETCH_QUEUE },
      { name: JOB_PROCESS_QUEUE },
      { name: SOURCE_POLLING_QUEUE },
    ),
  ],
  controllers: [JobsController],
  providers: [
    ProviderCircuitBreaker,
    JobsService,
    AshbyAdapter,
    GreenhouseAdapter,
    WorkableAdapter,
    LeverAdapter,
    AshbyFetchProcessor,
    GreenhouseFetchProcessor,
    WorkableFetchProcessor,
    LeverFetchProcessor,
    JobProcessProcessor,
    SourcePollingProcessor,
    SourcePollingBootstrap,
  ],
  exports: [ProviderCircuitBreaker],
})
export class JobsModule {}
