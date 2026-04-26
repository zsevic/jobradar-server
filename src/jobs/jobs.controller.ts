import { Controller, Get, Post, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('latest')
  async getLatestJobsPreview() {
    return this.jobsService.getLatestJobsPreview(5);
  }

  @Get()
  async getJobs(@Query('limit') limit?: string, @Query('page') page?: string) {
    const parsedLimit = Number(limit ?? 50);
    const parsedPage = Number(page ?? 1);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 50;
    const safePage = Number.isFinite(parsedPage)
      ? Math.max(Math.floor(parsedPage), 1)
      : 1;
    return this.jobsService.getLatestJobs(safeLimit, safePage);
  }

  @Post('poll/ashby')
  async pollAshby() {
    await this.jobsService.enqueueAshbySources();
    return { status: 'queued' };
  }

  @Post('poll/greenhouse')
  async pollGreenhouse() {
    await this.jobsService.enqueueGreenhouseSources();
    return { status: 'queued' };
  }

  @Post('poll/workable')
  async pollWorkable() {
    await this.jobsService.enqueueWorkableSources();
    return { status: 'queued' };
  }
}
