import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { FilterPreset } from '../database/entities/filter-preset.entity';
import { Job } from '../database/entities/job.entity';
import { NotificationSent } from '../database/entities/notification-sent.entity';
import { Source } from '../database/entities/source.entity';
import { User } from '../database/entities/user.entity';
import { AshbyAdapter } from './adapters/ashby.adapter';
import { GreenhouseAdapter } from './adapters/greenhouse.adapter';
import { WorkableAdapter } from './adapters/workable.adapter';
import {
  ASHBY_FETCH_QUEUE,
  EMAIL_SEND_QUEUE,
  GREENHOUSE_FETCH_QUEUE,
  JOB_MATCH_QUEUE,
  JOB_PROCESS_QUEUE,
  WORKABLE_FETCH_QUEUE,
} from './jobs.constants';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { AshbyFetchProcessor } from './processors/ashby-fetch.processor';
import { EmailSendProcessor } from './processors/email-send.processor';
import { GreenhouseFetchProcessor } from './processors/greenhouse-fetch.processor';
import { JobMatchProcessor } from './processors/job-match.processor';
import { JobProcessProcessor } from './processors/job-process.processor';
import { WorkableFetchProcessor } from './processors/workable-fetch.processor';
import { ProviderCircuitBreaker } from './utils/provider-circuit-breaker';

@Module({
  imports: [
    HttpModule,
    AuthModule,
    TypeOrmModule.forFeature([
      Source,
      Job,
      User,
      FilterPreset,
      NotificationSent,
    ]),
    BullModule.registerQueue(
      { name: ASHBY_FETCH_QUEUE },
      { name: GREENHOUSE_FETCH_QUEUE },
      { name: WORKABLE_FETCH_QUEUE },
      { name: JOB_PROCESS_QUEUE },
      { name: JOB_MATCH_QUEUE },
      { name: EMAIL_SEND_QUEUE },
    ),
  ],
  controllers: [JobsController],
  providers: [
    ProviderCircuitBreaker,
    JobsService,
    AshbyAdapter,
    GreenhouseAdapter,
    WorkableAdapter,
    AshbyFetchProcessor,
    GreenhouseFetchProcessor,
    WorkableFetchProcessor,
    JobProcessProcessor,
    JobMatchProcessor,
    EmailSendProcessor,
  ],
  exports: [ProviderCircuitBreaker],
})
export class JobsModule {}
