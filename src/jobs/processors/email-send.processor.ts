import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job as BullJob } from 'bullmq';
import { Repository } from 'typeorm';
import { NotificationSent } from '../../database/entities/notification-sent.entity';
import { EMAIL_SEND_QUEUE } from '../jobs.constants';

interface EmailSendPayload {
  userId: string;
  jobId: string;
  email: string;
  score: number;
}

@Injectable()
@Processor(EMAIL_SEND_QUEUE, {
  concurrency: 2,
})
export class EmailSendProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailSendProcessor.name);

  constructor(
    @InjectRepository(NotificationSent)
    private readonly notificationSentRepository: Repository<NotificationSent>,
  ) {
    super();
  }

  async process(job: BullJob<EmailSendPayload>): Promise<void> {
    const payload = job.data;

    const alreadySent = await this.notificationSentRepository.findOneBy({
      userId: payload.userId,
      jobId: payload.jobId,
    });

    if (alreadySent) {
      this.logger.debug(
        `Skip duplicate notification user=${payload.userId} job=${payload.jobId}`,
      );
      return;
    }

    // Placeholder until Resend integration is added.
    this.logger.log(
      `Email queued for ${payload.email} (job=${payload.jobId}, score=${payload.score})`,
    );

    await this.notificationSentRepository.save({
      userId: payload.userId,
      jobId: payload.jobId,
    });
    this.logger.log(
      `Notification persisted user=${payload.userId} job=${payload.jobId}`,
    );
  }
}
