import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  async getLatestJobsPreview() {
    return this.jobsService.getLatestJobsPreview(5);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getJobs(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    const parsedLimit = Number(limit ?? 50);
    const parsedPage = Number(page ?? 1);
    const safeLimit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 200)
      : 50;
    const safePage = Number.isFinite(parsedPage)
      ? Math.max(Math.floor(parsedPage), 1)
      : 1;
    return this.jobsService.getLatestJobsForUser(userId, safeLimit, safePage);
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
