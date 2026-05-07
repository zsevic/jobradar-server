import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Job as BullJob } from 'bullmq';
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

  async process(_job: BullJob): Promise<void> {
    const maxJobs = this.configService.get<number>('EMAIL_DIGEST_MAX_JOBS') ?? 25;

    const distinctUsers = await this.pendingRepository
      .createQueryBuilder('p')
      .select('DISTINCT p.userId', 'userId')
      .getRawMany<{ userId: string }>();

    for (const row of distinctUsers) {
      const userId = row.userId;
      await this.processUserDigest(userId, maxJobs);
    }
  }

  private async processUserDigest(userId: string, maxJobs: number): Promise<void> {
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

    const pendings = await this.pendingRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.job', 'job')
      .where('p.userId = :userId', { userId })
      .orderBy('p.score', 'DESC')
      .addOrderBy('p.createdAt', 'ASC')
      .take(maxJobs)
      .getMany();

    if (pendings.length === 0) {
      return;
    }

    const jobs: DigestJobLine[] = await Promise.all(
      pendings.map(async (p) => ({
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

    const pendingIds = pendings.map((p) => p.id);
    const jobIds = pendings.map((p) => p.jobId);

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
      await queryRunner.manager.delete(PendingMatchEmail, { id: In(pendingIds) });
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

    this.logger.log(
      `Digest completed userId=${userId} jobs=${pendings.length} message sent`,
    );
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
      this.configService.get<string>('BACKEND_ORIGIN') ?? 'http://localhost:3000';
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
