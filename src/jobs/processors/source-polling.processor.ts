import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job as BullJob } from 'bullmq';
import { SOURCE_POLLING_QUEUE } from '../jobs.constants';
import { JobsService } from '../jobs.service';

@Injectable()
@Processor(SOURCE_POLLING_QUEUE, {
  concurrency: 1,
})
export class SourcePollingProcessor extends WorkerHost {
  constructor(private readonly jobsService: JobsService) {
    super();
  }

  async process(_job: BullJob): Promise<void> {
    await this.jobsService.enqueueAshbySources();
    await this.jobsService.enqueueGreenhouseSources();
    await this.jobsService.enqueueWorkableSources();
  }
}
