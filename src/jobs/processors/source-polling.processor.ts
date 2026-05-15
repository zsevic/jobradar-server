import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
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

  async process(): Promise<void> {
    await this.jobsService.enqueueAshbySources();
    await this.jobsService.enqueueGreenhouseSources();
    await this.jobsService.enqueueWorkableSources();
  }
}
