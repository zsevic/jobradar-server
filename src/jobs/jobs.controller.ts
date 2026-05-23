import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JobsQueryDto } from './dto/jobs-query.dto';
import { JobsService } from './jobs.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get('latest')
  async getLatestJobsPreview(@Query('country') country?: string) {
    return this.jobsService.getLatestJobsPreview(5, country);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getJobs(
    @Req() request: AuthenticatedRequest,
    @Query() query: JobsQueryDto,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    const parsedLimit = query.limit ?? 50;
    const parsedPage = query.page ?? 1;
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 50;
    const safePage = Number.isFinite(parsedPage)
      ? Math.max(Math.floor(parsedPage), 1)
      : 1;
    return this.jobsService.getLatestJobsForUser(
      userId,
      safeLimit,
      safePage,
      query,
    );
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

  @Post('poll/lever')
  async pollLever() {
    await this.jobsService.enqueueLeverSources();
    return { status: 'queued' };
  }

  @Post('poll/company')
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
