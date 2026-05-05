/**
 * Transliterate non-Latin characters in job.location / job.locationRaw to Latin.
 *
 * Usage:
 *   npm run backfill:transliterate-locations -- --dry
 *   npm run backfill:transliterate-locations
 */

import 'dotenv/config';
import dataSource from '../src/database/data-source';
import { Job } from '../src/database/entities/job.entity';
import {
  containsNonLatinScript,
  transliterateLocationDisplay,
} from '../src/jobs/utils/transliterate-location';

async function main(dry: boolean): Promise<void> {
  await dataSource.initialize();
  const repo = dataSource.getRepository(Job);
  const candidates = await repo
    .createQueryBuilder('job')
    .where("job.location ~ '[^[:ascii:]]'")
    .orWhere("job.\"locationRaw\" ~ '[^[:ascii:]]'")
    .orWhere('strpos(job.location, CHR(96)) > 0')
    .orWhere('strpos(COALESCE(job."locationRaw", \'\'), CHR(96)) > 0')
    .getMany();

  const targets = candidates.filter(
    (job) =>
      containsNonLatinScript(job.location) ||
      (job.locationRaw != null && containsNonLatinScript(job.locationRaw)) ||
      job.location.includes('`') ||
      (job.locationRaw?.includes('`') ?? false),
  );

  if (dry) {
    for (const job of targets) {
      const before = job.locationRaw ?? job.location;
      const after = transliterateLocationDisplay(before);
      console.log(`- ${job.id} | "${before}" -> "${after}"`);
    }
  }

  let updated = 0;
  for (const job of targets) {
    const newLocation = transliterateLocationDisplay(job.location);
    const newRaw =
      job.locationRaw != null
        ? transliterateLocationDisplay(job.locationRaw)
        : job.locationRaw;
    if (newLocation !== job.location || newRaw !== job.locationRaw) {
      if (!dry) {
        await repo.update(job.id, { location: newLocation, locationRaw: newRaw });
      }
      updated += 1;
    }
  }

  console.log(
    `${dry ? 'Would update' : 'Updated'} ${updated} jobs ` +
      `(SQL prefilter: ${candidates.length} non-ASCII rows; ` +
      `${targets.length} contain non-Latin scripts)`,
  );
  await dataSource.destroy();
}

void main(process.argv.includes('--dry'));
