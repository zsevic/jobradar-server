import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilterPreset } from '../database/entities/filter-preset.entity';
import { NotificationClick } from '../database/entities/notification-click.entity';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(FilterPreset)
    private readonly filterPresetRepository: Repository<FilterPreset>,
    @InjectRepository(NotificationClick)
    private readonly notificationClickRepository: Repository<NotificationClick>,
  ) {}

  /**
   * One-click unsubscribe from job alert emails (token from digest link).
   * Frontend can read `token` and call this, or open a backend redirect here.
   */
  @Get('unsubscribe')
  async unsubscribe(@Query('token') token?: string): Promise<{ ok: boolean }> {
    const raw = token?.trim();
    if (!raw) {
      throw new BadRequestException('Missing token query parameter');
    }
    let userId: string;
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        aud?: string;
      }>(raw, {
        audience: 'jobradar:alerts-unsubscribe',
      });
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid or expired unsubscribe link');
    }

    const preset = await this.filterPresetRepository.findOneBy({ userId });
    if (!preset) {
      throw new BadRequestException('No alert preset found for this account');
    }

    await this.filterPresetRepository.update(
      { id: preset.id },
      { alertsEnabled: false },
    );

    return { ok: true };
  }

  /**
   * Tracks digest click-through and redirects directly to the job posting URL.
   */
  @Get('click')
  async clickThrough(
    @Query('token') token: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const raw = token?.trim();
    if (!raw) {
      throw new BadRequestException('Missing token query parameter');
    }

    let payload: { sub: string; jobId: string; targetUrl: string };
    try {
      payload = await this.jwtService.verifyAsync<{
        sub: string;
        jobId: string;
        targetUrl: string;
        aud?: string;
      }>(raw, {
        audience: 'jobradar:notification-click',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired click link');
    }

    await this.notificationClickRepository.save({
      userId: payload.sub,
      jobId: payload.jobId,
      userAgent: request.get('user-agent') ?? null,
      ipAddress: request.ip ?? null,
    });

    response.redirect(payload.targetUrl);
  }

  /**
   * Debug endpoint for recent notification click stats of the current user.
   */
  @Get('click-stats')
  @UseGuards(JwtAuthGuard)
  async clickStats(
    @Req()
    request: Request & {
      user?: {
        userId: string;
      };
    },
    @Query('limit') limit?: string,
  ): Promise<{
    totalClicks: number;
    recent: Array<{
      jobId: string;
      title: string;
      company: string;
      url: string;
      clicks: number;
      lastClickedAt: string;
    }>;
  }> {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException('Missing user context');
    }

    const parsed = Number(limit);
    const safeLimit = Number.isFinite(parsed)
      ? Math.min(Math.max(Math.floor(parsed), 1), 100)
      : 20;

    const rows = await this.notificationClickRepository
      .createQueryBuilder('click')
      .innerJoin('click.job', 'job')
      .select('click.jobId', 'jobId')
      .addSelect('job.title', 'title')
      .addSelect('job.company', 'company')
      .addSelect('job.url', 'url')
      .addSelect('COUNT(click.id)::int', 'clicks')
      .addSelect('MAX(click.clickedAt)', 'lastClickedAt')
      .where('click.userId = :userId', { userId })
      .groupBy('click.jobId')
      .addGroupBy('job.title')
      .addGroupBy('job.company')
      .addGroupBy('job.url')
      .orderBy('MAX(click.clickedAt)', 'DESC')
      .limit(safeLimit)
      .getRawMany<{
        jobId: string;
        title: string;
        company: string;
        url: string;
        clicks: string;
        lastClickedAt: string;
      }>();

    const totalClicks = await this.notificationClickRepository.countBy({
      userId,
    });

    return {
      totalClicks,
      recent: rows.map((row) => ({
        jobId: row.jobId,
        title: row.title,
        company: row.company,
        url: row.url,
        clicks: Number(row.clicks),
        lastClickedAt: row.lastClickedAt,
      })),
    };
  }
}
