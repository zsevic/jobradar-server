/**
 * Recompute Lever job location facets using ISO-2 hint canonicalization.
 *
 * Hints are recovered from existing `locationCountries` / two-letter `locationTokens`
 * (Lever `country` is not stored on `jobs`). Re-parsing `locationRaw` plus merged hints
 * matches post-fix ingest without re-polling the API.
 *
 * Usage:
 *   npm run backfill:lever-location-facets -- --dry
 *   npm run backfill:lever-location-facets
 */

import 'dotenv/config';
import dataSource from '../src/database/data-source';
import { Job } from '../src/database/entities/job.entity';
import { SourceProvider } from '../src/database/entities/source.entity';
import {
  formatRawLocation,
  resolveNormalizedLocation,
  stripCompanyNameFromLocation,
} from '../src/jobs/utils/clean-location';
import {
  extractCountriesFromGeoScopedRemoteText,
  extractCountryMentionsFromText,
  extractLocationFacets,
  mergeLocationFacetsWithCountryHints,
} from '../src/jobs/utils/normalize-location';

function sortKey(values: string[]): string {
  return [...values].map((s) => s.toLowerCase()).sort().join('\x01');
}

function arraysEqual(a: string[], b: string[]): boolean {
  return sortKey(a) === sortKey(b);
}

function recoverCountryHints(job: Job): string[] {
  const hints = new Set<string>();
  for (const country of job.locationCountries) {
    const trimmed = country.trim().toLowerCase();
    if (trimmed.length > 0) {
      hints.add(trimmed);
    }
  }
  for (const token of job.locationTokens) {
    if (/^[a-z]{2}$/.test(token.trim().toLowerCase())) {
      hints.add(token.trim().toLowerCase());
    }
  }
  return Array.from(hints);
}

function recomputeLocationFacets(job: Job): {
  tokens: string[];
  countries: string[];
  regions: string[];
} {
  const formattedRaw = formatRawLocation(job.locationRaw ?? job.location ?? '');
  const geoRaw = stripCompanyNameFromLocation(formattedRaw, job.company);
  const normalizedLocation = resolveNormalizedLocation(geoRaw, {
    remoteIndicatedByProvider: job.isRemote,
  });
  const rawForFacets =
    geoRaw.toLowerCase() === 'unknown' ? '' : geoRaw;
  let facets =
    normalizedLocation === 'Remote'
      ? { tokens: ['remote'], countries: [] as string[], regions: [] as string[] }
      : extractLocationFacets(rawForFacets);

  const countryHints = recoverCountryHints(job);
  if (countryHints.length > 0) {
    facets = mergeLocationFacetsWithCountryHints(facets, countryHints);
  }

  if (facets.countries.length === 0) {
    const countriesFromTitle = [
      ...extractCountryMentionsFromText(job.title),
      ...extractCountriesFromGeoScopedRemoteText(job.title),
    ];
    if (countriesFromTitle.length > 0) {
      facets.countries = Array.from(new Set(countriesFromTitle));
      facets.tokens = Array.from(
        new Set<string>([...facets.tokens, ...facets.countries]),
      );
    }
  }

  return facets;
}

async function main(dry: boolean): Promise<void> {
  await dataSource.initialize();
  const repo = dataSource.getRepository(Job);
  const jobs = await repo.find({
    where: { provider: SourceProvider.LEVER },
    order: { company: 'ASC', title: 'ASC' },
  });

  let updated = 0;
  let unchanged = 0;

  for (const job of jobs) {
    const next = recomputeLocationFacets(job);
    const same =
      arraysEqual(job.locationCountries, next.countries) &&
      arraysEqual(job.locationRegions, next.regions) &&
      arraysEqual(job.locationTokens, next.tokens);

    if (same) {
      unchanged += 1;
      continue;
    }

    if (dry) {
      console.log(
        `- ${job.id} | ${job.company} | ${job.title}\n` +
          `    countries: ${JSON.stringify(job.locationCountries)} -> ${JSON.stringify(next.countries)}\n` +
          `    regions: ${JSON.stringify(job.locationRegions)} -> ${JSON.stringify(next.regions)}\n` +
          `    tokens: ${JSON.stringify(job.locationTokens)} -> ${JSON.stringify(next.tokens)}`,
      );
    } else {
      await repo.update(job.id, {
        locationCountries: next.countries,
        locationRegions: next.regions,
        locationTokens: next.tokens,
      });
    }
    updated += 1;
  }

  console.log(
    `${dry ? 'Would update' : 'Updated'} ${updated} Lever jobs ` +
      `(${unchanged} unchanged, ${jobs.length} total)`,
  );
  await dataSource.destroy();
}

void main(process.argv.includes('--dry'));
