import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job as BullJob } from 'bullmq';
import { Repository } from 'typeorm';
import { FilterPreset } from '../../database/entities/filter-preset.entity';
import { Job } from '../../database/entities/job.entity';
import { NotificationSent } from '../../database/entities/notification-sent.entity';
import { User } from '../../database/entities/user.entity';
import { JOB_MATCH_QUEUE } from '../jobs.constants';
import { JobsService } from '../jobs.service';

interface MatchJobPayload {
  jobId: string;
}

@Injectable()
@Processor(JOB_MATCH_QUEUE, {
  concurrency: 3,
})
export class JobMatchProcessor extends WorkerHost {
  private readonly THRESHOLD = 70;

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
    if (!dbJob) return;

    const presets = await this.filterPresetRepository.find({
      where: {
        alertsEnabled: true,
      },
    });

    for (const preset of presets) {
      const score = this.calculateScore(dbJob, preset);
      if (score <= this.THRESHOLD) {
        continue;
      }

      const alreadySent = await this.notificationSentRepository.findOneBy({
        userId: preset.userId,
        jobId: dbJob.id,
      });
      if (alreadySent) {
        continue;
      }

      const user = await this.userRepository.findOneBy({ id: preset.userId });
      if (!user) continue;

      await this.jobsService.enqueueEmailSend({
        userId: user.id,
        jobId: dbJob.id,
        email: user.email,
        score,
      });
    }
  }

  private calculateScore(job: Job, preset: FilterPreset): number {
    let score = 0;
    const title = job.title.toLowerCase();
    const location = job.location.toLowerCase();
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
      job.seniority &&
      job.seniority.toLowerCase().trim() ===
        preset.seniority.toLowerCase().trim()
    ) {
      score += 20;
    }

    const hasLocationMatch = preset.locations.some((preferredLocation) => {
      const normalized = preferredLocation.toLowerCase();
      if (normalized === 'remote') {
        return job.isRemote || location.includes('remote');
      }
      return location.includes(normalized.toLowerCase());
    });

    if (hasLocationMatch) {
      score += 20;
    }

    return score;
  }
}
