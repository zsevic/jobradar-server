import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
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

  @Post('poll/ashby')
  @SkipThrottle({ default: true, latest: true })
  async pollAshby() {
    await this.jobsService.enqueueAshbySources();
    return { status: 'queued' };
  }

  @Post('poll/greenhouse')
  @SkipThrottle({ default: true, latest: true })
  async pollGreenhouse() {
    await this.jobsService.enqueueGreenhouseSources();
    return { status: 'queued' };
  }

  @Post('poll/workable')
  @SkipThrottle({ default: true, latest: true })
  async pollWorkable() {
    await this.jobsService.enqueueWorkableSources();
    return { status: 'queued' };
  }

  @Post('poll/lever')
  @SkipThrottle({ default: true, latest: true })
  async pollLever() {
    await this.jobsService.enqueueLeverSources();
    return { status: 'queued' };
  }

  @Post('poll/company')
  @SkipThrottle({ default: true, latest: true })
  async pollSpecificCompany(@Query('company') company?: string) {
    const value = company?.trim();
    if (!value) {
      throw new BadRequestException('Query param "company" is required');
    }

    const queued = await this.jobsService.enqueueSourceByCompany(value);
    if (!queued) {
      throw new NotFoundException(
        `No active source found for company "${value}"`,
      );
    }

    return {
      status: 'queued',
      source: queued,
    };
  }
}
