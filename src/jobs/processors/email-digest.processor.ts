import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { GumroadService } from '../../auth/gumroad.service';
import { FilterPreset } from '../../database/entities/filter-preset.entity';
import { NotificationSent } from '../../database/entities/notification-sent.entity';
import { PendingMatchEmail } from '../../database/entities/pending-match-email.entity';
import { User } from '../../database/entities/user.entity';
import { DigestJobLine, MailService } from '../../mail/mail.service';
import { EMAIL_DIGEST_QUEUE } from '../jobs.constants';

@Injectable()
@Processor(EMAIL_DIGEST_QUEUE, {
  concurrency: 1,
})
export class EmailDigestProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailDigestProcessor.name);

  constructor(
    @InjectRepository(PendingMatchEmail)
    private readonly pendingRepository: Repository<PendingMatchEmail>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(FilterPreset)
    private readonly filterPresetRepository: Repository<FilterPreset>,
    private readonly gumroadService: GumroadService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    super();
  }

  async process(): Promise<void> {
    const maxJobs =
      this.configService.get<number>('EMAIL_DIGEST_MAX_JOBS') ?? 25;

    const distinctUsers = await this.pendingRepository
      .createQueryBuilder('p')
      .select('DISTINCT p.userId', 'userId')
      .getRawMany<{ userId: string }>();

    for (const row of distinctUsers) {
      const userId = row.userId;
      await this.processUserDigest(userId, maxJobs);
    }
  }

  private async processUserDigest(
    userId: string,
    maxJobs: number,
  ): Promise<void> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      this.logger.warn(`Digest skip: user not found userId=${userId}`);
      return;
    }

    const preset = await this.filterPresetRepository.findOneBy({ userId });
    if (!preset) {
      this.logger.warn(`Digest skip: no filter preset userId=${userId}`);
      return;
    }

    if (!preset.alertsEnabled) {
      this.logger.debug(
        `Digest skip: alerts disabled userId=${userId} preset=${preset.id}`,
      );
      return;
    }

    const gumroad = await this.gumroadService.verifyLicenseForUser(user);
    if (!gumroad.ok) {
      this.logger.log(
        `Digest skip: Gumroad verify failed userId=${userId} reason=${gumroad.reason ?? 'unknown'}`,
      );
      return;
    }

    const allPendings = await this.pendingRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.job', 'job')
      .where('p.userId = :userId', { userId })
      .orderBy('p.score', 'DESC')
      .addOrderBy('p.createdAt', 'ASC')
      .getMany();

    if (allPendings.length === 0) {
      return;
    }

    const cutoff = user.lastDigestSentAt ?? user.createdAt;
    const cutoffMs = cutoff.getTime();
    const postedMs = (p: PendingMatchEmail) => p.job.postedAt.getTime();
    const isFresh = (p: PendingMatchEmail) =>
      !Number.isNaN(postedMs(p)) && postedMs(p) > cutoffMs;
    const orderedFresh = allPendings.filter((p) => isFresh(p));
    const fresh = orderedFresh.slice(0, maxJobs);
    const stale = allPendings.filter((p) => !isFresh(p));
    const stalePruned = stale.length;

    if (fresh.length === 0) {
      if (stale.length > 0) {
        await this.persistDigestPersistence(userId, stale, false);
        this.logger.log(
          `Digest skip: no fresh candidates after cutoff userId=${userId} stalePruned=${stalePruned} cutoff=${cutoff.toISOString()}`,
        );
      }
      return;
    }

    const jobs: DigestJobLine[] = await Promise.all(
      fresh.map(async (p) => ({
        title: p.job.title,
        company: p.job.company,
        location: p.job.location,
        url: await this.buildTrackedClickUrl(userId, p.jobId, p.job.url),
        postedAt: p.job.postedAt,
        score: p.score,
      })),
    );

    const unsubscribeUrl = await this.buildUnsubscribeUrl(userId);
    await this.mailService.sendDigest({
      to: user.email,
      jobs,
      unsubscribeUrl,
    });

    const clearedRows = [...fresh, ...stale];
    await this.persistDigestPersistence(userId, clearedRows, true);

    this.logger.log(
      `Digest completed userId=${userId} jobs=${fresh.length} stalePruned=${stalePruned} cutoff=${cutoff.toISOString()} message sent`,
    );
  }

  /**
   * Inserts notifications_sent for each (userId, jobId), deletes the given pending rows,
   * and optionally sets users.lastDigestSentAt (only after a successful email send).
   */
  private async persistDigestPersistence(
    userId: string,
    rows: PendingMatchEmail[],
    advanceLastDigestSentAt: boolean,
  ): Promise<void> {
    const jobIds = [...new Set(rows.map((r) => r.jobId))];
    const pendingIds = rows.map((r) => r.id);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const jobId of jobIds) {
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into(NotificationSent)
          .values({ userId, jobId })
          .orIgnore()
          .execute();
      }
      await queryRunner.manager.delete(PendingMatchEmail, {
        id: In(pendingIds),
      });
      if (advanceLastDigestSentAt) {
        await queryRunner.manager.update(
          User,
          { id: userId },
          { lastDigestSentAt: () => 'NOW()' },
        );
      }
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Digest transaction failed userId=${userId} err=${(err as Error).message}`,
      );
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async buildUnsubscribeUrl(userId: string): Promise<string> {
    const origin = this.configService.get<string>('FRONTEND_ORIGIN');
    const token = await this.jwtService.signAsync(
      {
        sub: userId,
        aud: 'jobradar:alerts-unsubscribe',
      },
      {
        expiresIn: '30d',
      },
    );
    return `${origin}/account/alerts?token=${encodeURIComponent(token)}`;
  }

  private async buildTrackedClickUrl(
    userId: string,
    jobId: string,
    targetUrl: string,
  ): Promise<string> {
    const base =
      this.configService.get<string>('BACKEND_ORIGIN') ??
      'http://localhost:3000';
    const token = await this.jwtService.signAsync(
      {
        sub: userId,
        jobId,
        targetUrl,
        aud: 'jobradar:notification-click',
      },
      {
        expiresIn: '30d',
      },
    );
    return `${base}/api/notifications/click?token=${encodeURIComponent(token)}`;
  }
}
