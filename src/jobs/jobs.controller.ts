import { Controller, Get, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JobsQueryDto } from './dto/jobs-query.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('latest')
  @SkipThrottle({ default: true })
  async getLatestJobsPreview(@Query('country') country?: string) {
    return this.jobsService.getLatestJobsPreview(5, country);
  }

  @Get()
  @SkipThrottle({ latest: true })
  async getJobs(@Query() query: JobsQueryDto) {
    const parsedLimit = query.limit ?? 50;
    const parsedPage = query.page ?? 1;
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 50;
    const safePage = Number.isFinite(parsedPage)
      ? Math.max(Math.floor(parsedPage), 1)
      : 1;
    return this.jobsService.getLatestJobs(safeLimit, safePage, query);
  }
}
