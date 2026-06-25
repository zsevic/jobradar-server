/**
 * Enqueue job-board fetches (same work as scheduled source polling).
 * Requires Redis; jobs are processed when the API server workers are running.
 *
 * Usage:
 *   npm run poll:sources
 *   npm run poll:company -- stripe
 */

import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { JobsService } from '../src/jobs/jobs.service';

async function main(): Promise<void> {
  const company = process.argv[2]?.trim();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const jobsService = app.get(JobsService);

    if (company) {
      const queued = await jobsService.enqueueSourceByCompany(company);
      if (!queued) {
        console.error(`No active source found for "${company}"`);
        process.exitCode = 1;
        return;
      }
      console.log(
        `Queued ${queued.provider} fetch for ${queued.name} (${queued.externalId})`,
      );
      return;
    }

    await jobsService.enqueueAshbySources();
    await jobsService.enqueueGreenhouseSources();
    await jobsService.enqueueWorkableSources();
    await jobsService.enqueueLeverSources();
    console.log('Queued fetch jobs for all active sources');
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
