import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job as BullJob } from 'bullmq';
import { Repository } from 'typeorm';
import { FilterPreset } from '../../database/entities/filter-preset.entity';
import { Job } from '../../database/entities/job.entity';
import { NotificationSent } from '../../database/entities/notification-sent.entity';
import { User } from '../../database/entities/user.entity';
import { JOB_MATCH_QUEUE } from '../jobs.constants';
import { JobsService } from '../jobs.service';
import { matchesJobLocationPreset } from '../utils/match-location-preset';

interface MatchJobPayload {
  jobId: string;
}

@Injectable()
@Processor(JOB_MATCH_QUEUE, {
  concurrency: 3,
})
export class JobMatchProcessor extends WorkerHost {
  private readonly THRESHOLD = 70;
  private readonly logger = new Logger(JobMatchProcessor.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectRepository(FilterPreset)
    private readonly filterPresetRepository: Repository<FilterPreset>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(NotificationSent)
    private readonly notificationSentRepository: Repository<NotificationSent>,
    private readonly jobsService: JobsService,
  ) {
    super();
  }

  async process(job: BullJob<MatchJobPayload>): Promise<void> {
    const dbJob = await this.jobRepository.findOneBy({ id: job.data.jobId });
    if (!dbJob) {
      this.logger.warn(`Job ${job.data.jobId} not found for matching`);
      return;
    }

    const presets = await this.filterPresetRepository.find({
      where: {
        alertsEnabled: true,
      },
    });
    this.logger.log(
      `Matching job ${dbJob.id} against ${presets.length} active presets`,
    );

    let enqueuedEmails = 0;
    for (const preset of presets) {
      const score = this.calculateScore(dbJob, preset);
      if (score <= this.THRESHOLD) {
        this.logger.debug(
          `Preset ${preset.id} below threshold for job ${dbJob.id} (score=${score})`,
        );
        continue;
      }

      const alreadySent = await this.notificationSentRepository.findOneBy({
        userId: preset.userId,
        jobId: dbJob.id,
      });
      if (alreadySent) {
        this.logger.debug(
          `Skip already-notified pair user=${preset.userId} job=${dbJob.id}`,
        );
        continue;
      }

      const user = await this.userRepository.findOneBy({ id: preset.userId });
      if (!user) {
        this.logger.warn(
          `User ${preset.userId} not found for preset ${preset.id}`,
        );
        continue;
      }

      await this.jobsService.enqueueEmailSend({
        userId: user.id,
        jobId: dbJob.id,
        email: user.email,
        score,
      });
      enqueuedEmails += 1;
      this.logger.log(
        `Enqueued email candidate user=${user.id} job=${dbJob.id} score=${score}`,
      );
    }

    if (enqueuedEmails === 0) {
      this.logger.log(`No qualifying alerts for job ${dbJob.id}`);
    }
  }

  private calculateScore(job: Job, preset: FilterPreset): number {
    let score = 0;
    const title = job.title.toLowerCase();
    const stack = job.stack.map((entry) => entry.toLowerCase());

    if (title.includes(preset.role.toLowerCase())) {
      score += 20;
    }

    if (
      preset.stack.some((stackEntry) =>
        stack.includes(stackEntry.toLowerCase().trim()),
      )
    ) {
      score += 40;
    }

    if (
      preset.seniority &&
      job.seniorities.some(
        (s) =>
          s.toLowerCase().trim() === preset.seniority.toLowerCase().trim(),
      )
    ) {
      score += 20;
    }

    if (matchesJobLocationPreset(job, preset.locations)) {
      score += 20;
    }

    return score;
  }
}
