/**
 * Audit stored Lever jobs: role, seniority, stack (title-based recompute), location facets.
 *
 * Usage: npm run audit:lever-jobs
 * Env: DATABASE_URL (from .env)
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { SourceProvider } from '../src/database/entities/source.entity';
import {
  formatRawLocation,
  resolveNormalizedLocation,
  stripCompanyNameFromLocation,
} from '../src/jobs/utils/clean-location';
import {
  classifyRoleFromTitle,
  extractStackFromJobText,
  type JobRoleKind,
} from '../src/jobs/utils/extract-stack';
import { extractSeniorityFromTitle } from '../src/jobs/utils/extract-seniority';
import {
  extractCountryMentionsFromText,
  extractLocationFacets,
  normalizeCountriesForFacetCompare,
  normalizeRegionsForFacetCompare,
} from '../src/jobs/utils/normalize-location';

interface DbJobRow {
  id: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  locationRaw: string | null;
  locationTokens: string[];
  locationCountries: string[];
  locationRegions: string[];
  isRemote: boolean;
  role: string | null;
  stack: string[];
  seniorities: string[];
}

interface Facets {
  tokens: string[];
  countries: string[];
  regions: string[];
}

function sortKey(values: string[]): string {
  return [...values].map((s) => s.toLowerCase()).sort().join('\x01');
}

function arraysEqual(a: string[], b: string[]): boolean {
  return sortKey(a) === sortKey(b);
}

function roleFromTitle(title: string): string | null {
  const kind = classifyRoleFromTitle(title);
  return kind === 'other' ? null : kind;
}

function mergeTitleCountryFacets(facets: Facets, title: string): Facets {
  if (facets.countries.length > 0) {
    return facets;
  }
  const fromTitle = extractCountryMentionsFromText(title);
  if (fromTitle.length === 0) {
    return facets;
  }
  return {
    countries: fromTitle,
    regions: facets.regions,
    tokens: Array.from(new Set([...facets.tokens, ...fromTitle])),
  };
}

function computeLocationFacets(job: DbJobRow): Facets {
  const formattedRaw = formatRawLocation(job.locationRaw ?? job.location ?? '');
  const geoRaw = stripCompanyNameFromLocation(formattedRaw, job.company);
  const normalizedLocation = resolveNormalizedLocation(geoRaw, {
    remoteIndicatedByProvider: job.isRemote,
  });
  const rawForFacets = geoRaw.toLowerCase() === 'unknown' ? '' : geoRaw;
  if (normalizedLocation === 'Remote') {
    return mergeTitleCountryFacets(
      { tokens: ['remote'], countries: [], regions: [] },
      job.title,
    );
  }
  return mergeTitleCountryFacets(
    extractLocationFacets(rawForFacets),
    job.title,
  );
}

/** Hint-aware compare: ISO-2 leftovers in stored facets do not count as drift. */
function facetsLocationEqual(
  stored: { countries: string[]; regions: string[] },
  expected: Facets,
): boolean {
  return (
    arraysEqual(
      normalizeCountriesForFacetCompare(stored.countries),
      normalizeCountriesForFacetCompare(expected.countries),
    ) &&
    arraysEqual(
      normalizeRegionsForFacetCompare(stored.regions),
      normalizeRegionsForFacetCompare(expected.regions),
    )
  );
}

type StackMismatchKind = 'description_enriched' | 'true_drift';

function classifyStackMismatch(
  stored: string[],
  expected: string[],
): StackMismatchKind {
  if (stored.length > 0 && expected.length === 0) {
    return 'description_enriched';
  }
  return 'true_drift';
}

function isGeoLookingRaw(raw: string | null): boolean {
  const t = (raw ?? '').trim().toLowerCase();
  if (!t || t === 'unknown' || t === 'remote' || t === 'hybrid') {
    return false;
  }
  return true;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const { rows } = await client.query<DbJobRow>(`
    SELECT
      id,
      "externalId",
      title,
      company,
      location,
      "locationRaw",
      "locationTokens",
      "locationCountries",
      "locationRegions",
      "isRemote",
      role,
      stack,
      seniorities
    FROM jobs
    WHERE provider = $1
    ORDER BY company, title
  `, [SourceProvider.LEVER]);

  await client.end();

  const total = rows.length;
  const roleMismatch: Array<{
    id: string;
    company: string;
    title: string;
    stored: string | null;
    expected: string | null;
  }> = [];
  const seniorityMismatch: Array<{
    id: string;
    company: string;
    title: string;
    stored: string;
    expected: string;
  }> = [];
  const stackDescriptionEnriched: Array<{
    id: string;
    company: string;
    title: string;
    stored: string[];
    role: string | null;
  }> = [];
  const stackTrueDrift: Array<{
    id: string;
    company: string;
    title: string;
    stored: string[];
    expected: string[];
    role: string | null;
  }> = [];
  const locationMismatch: Array<{
    id: string;
    company: string;
    title: string;
    locationRaw: string | null;
    storedCountries: string[];
    storedRegions: string[];
    expectedCountries: string[];
    expectedRegions: string[];
  }> = [];
  const emptyCountriesGeo: Array<{
    id: string;
    company: string;
    title: string;
    locationRaw: string | null;
  }> = [];

  const roleCounts = new Map<string, number>();
  const nullRole: DbJobRow[] = [];
  const emptySeniority: DbJobRow[] = [];
  const forwardDeployTitles: Array<{
    title: string;
    storedRole: string | null;
    titleRole: string | null;
  }> = [];

  for (const job of rows) {
    const expectedRole = roleFromTitle(job.title);
    const storedRole = job.role;
    roleCounts.set(storedRole ?? '(null)', (roleCounts.get(storedRole ?? '(null)') ?? 0) + 1);

    if (storedRole !== expectedRole) {
      roleMismatch.push({
        id: job.id,
        company: job.company,
        title: job.title,
        stored: storedRole,
        expected: expectedRole,
      });
    }

    if (/forward[-\s]?(deployed|deployment)/i.test(job.title)) {
      forwardDeployTitles.push({
        title: job.title,
        storedRole,
        titleRole: expectedRole,
      });
    }

    if (storedRole == null) {
      nullRole.push(job);
    }

    const expectedSeniorities = extractSeniorityFromTitle(job.title);
    if (!arraysEqual(job.seniorities, expectedSeniorities)) {
      seniorityMismatch.push({
        id: job.id,
        company: job.company,
        title: job.title,
        stored: job.seniorities.join(', ') || '(empty)',
        expected: expectedSeniorities.join(', ') || '(empty)',
      });
    }
    if (expectedSeniorities.length === 0) {
      emptySeniority.push(job);
    }

    const roleKind = (storedRole ?? expectedRole ?? 'other') as JobRoleKind;
    const expectedStack = extractStackFromJobText(job.title, null, roleKind);
    if (!arraysEqual(job.stack, expectedStack)) {
      const entry = {
        id: job.id,
        company: job.company,
        title: job.title,
        stored: job.stack,
        expected: expectedStack,
        role: storedRole,
      };
      if (
        classifyStackMismatch(job.stack, expectedStack) === 'description_enriched'
      ) {
        stackDescriptionEnriched.push({
          id: entry.id,
          company: entry.company,
          title: entry.title,
          stored: entry.stored,
          role: entry.role,
        });
      } else {
        stackTrueDrift.push(entry);
      }
    }
    const expectedFacets = computeLocationFacets(job);
    if (
      !facetsLocationEqual(
        {
          countries: job.locationCountries,
          regions: job.locationRegions,
        },
        expectedFacets,
      )
    ) {
      locationMismatch.push({
        id: job.id,
        company: job.company,
        title: job.title,
        locationRaw: job.locationRaw,
        storedCountries: job.locationCountries,
        storedRegions: job.locationRegions,
        expectedCountries: expectedFacets.countries,
        expectedRegions: expectedFacets.regions,
      });
    }

    if (
      isGeoLookingRaw(job.locationRaw) &&
      job.locationCountries.length === 0 &&
      job.locationRegions.length === 0
    ) {
      emptyCountriesGeo.push({
        id: job.id,
        company: job.company,
        title: job.title,
        locationRaw: job.locationRaw,
      });
    }
  }

  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'lever-jobs-audit.json');
  const summaryPath = path.join(outDir, 'lever-jobs-audit.summary.txt');

  const report = {
    generatedAt: new Date().toISOString(),
    total,
    roleDistribution: Object.fromEntries(roleCounts),
    mismatchCounts: {
      role: roleMismatch.length,
      seniority: seniorityMismatch.length,
      stackTotal:
        stackDescriptionEnriched.length + stackTrueDrift.length,
      stackDescriptionEnriched: stackDescriptionEnriched.length,
      stackTrueDrift: stackTrueDrift.length,
      locationFacets: locationMismatch.length,
      emptyCountriesDespiteGeoRaw: emptyCountriesGeo.length,
    },
    nullRoleCount: nullRole.length,
    emptySeniorityCount: emptySeniority.length,
    forwardDeployTitles,
    samples: {
      roleMismatch: roleMismatch.slice(0, 50),
      seniorityMismatch: seniorityMismatch.slice(0, 30),
      stackDescriptionEnriched: stackDescriptionEnriched.slice(0, 20),
      stackTrueDrift: stackTrueDrift.slice(0, 30),
      locationMismatch: locationMismatch.slice(0, 40),
      emptyCountriesGeo: emptyCountriesGeo.slice(0, 40),
    },
    notes: [
      'Role/stack expected values are recomputed from title only (no description).',
      'stackDescriptionEnriched: stored stack from job description; title-only audit expects [].',
      'stackTrueDrift: both stored and title-only stacks non-empty but differ — review manually.',
      'Location compare uses normalizeCountriesForFacetCompare (ISO-2 hints treated as full country names).',
    ],
  };

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const lines = [
    `Lever jobs audit (${total} rows)`,
    `Generated: ${report.generatedAt}`,
    '',
    'Role distribution (stored):',
    ...[...roleCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([r, n]) => `  ${r}: ${n}`),
    '',
    `Role mismatches (title-only recompute): ${roleMismatch.length}`,
    `Seniority mismatches: ${seniorityMismatch.length}`,
    `Stack mismatches (title-only): ${stackDescriptionEnriched.length + stackTrueDrift.length}`,
    `  description_enriched (stored non-empty, title-only empty): ${stackDescriptionEnriched.length}`,
    `  true_drift (both non-empty, differ): ${stackTrueDrift.length}`,
    `Location facet mismatches (hint-aware countries/regions): ${locationMismatch.length}`,
    `Geo-looking raw but no countries/regions: ${emptyCountriesGeo.length}`,
    `Null role: ${nullRole.length}`,
    `Empty seniority (expected): ${emptySeniority.length}`,
    '',
    'Forward deployed/deployment titles:',
    ...forwardDeployTitles.map(
      (f) =>
        `  [${f.storedRole ?? 'null'} / title→${f.titleRole ?? 'null'}] ${f.title}`,
    ),
    '',
    `Full JSON: ${jsonPath}`,
  ];

  fs.writeFileSync(summaryPath, lines.join('\n'));
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
