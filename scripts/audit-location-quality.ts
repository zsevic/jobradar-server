/**
 * Location facet quality audit (per provider or all):
 * 1) Rows with geographic-looking raw but empty locationCountries (SQL).
 * 2) Facet drift: stored vs recomputed facets via the same pipeline as ingestion
 *    (formatRawLocation → stripCompanyNameFromLocation →
 *    resolveNormalizedLocation → extractLocationFacets → merge countries from job title), **without**
 *    provider-specific extras such as Ashby
 *    API `locationCountryHints` (not stored on `jobs`). Jobs whose trimmed `locationRaw`
 *    is only **Remote** or **Hybrid** are omitted — no geographic signal.
 *
 * Outputs under scripts/output/: `{slug}-location-quality.json`, `.summary.txt`,
 * `.codebase-proposals.md`
 *
 * Usage (from jobradar-server/, DATABASE_URL in .env):
 *   npm run audit:locations
 *   npm run audit:locations -- --provider=greenhouse
 *   npm run audit:locations -- --provider=all
 *
 * Env:
 *   LOCATION_AUDIT_PROVIDER — ashby | greenhouse | workable | all (default: ashby)
 *   LOCATION_AUDIT_LIMIT — max jobs for full scan (default: no limit)
 *   ASHBY_AUDIT_LIMIT — legacy alias for LOCATION_AUDIT_LIMIT
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
  extractCountryMentionsFromText,
  extractLocationFacets,
} from '../src/jobs/utils/normalize-location';

/** Single ATS provider or entire `jobs` table. */
type AuditProvider = SourceProvider | 'all';

const PROVIDER_VALUES = new Set<string>(Object.values(SourceProvider));

function parseAuditProvider(raw: string): AuditProvider | null {
  const s = raw.trim().toLowerCase();
  if (s === 'all') {
    return 'all';
  }
  if (PROVIDER_VALUES.has(s)) {
    return s as SourceProvider;
  }
  return null;
}

function parseAuditArgs(): {
  provider: AuditProvider;
  limit: number | null;
} {
  let providerRaw =
    process.env.LOCATION_AUDIT_PROVIDER?.trim() ?? 'ashby';
  let limitRaw =
    process.env.LOCATION_AUDIT_LIMIT ?? process.env.ASHBY_AUDIT_LIMIT;

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--provider' || a === '-p') {
      providerRaw = argv[++i] ?? '';
      continue;
    }
    if (a.startsWith('--provider=')) {
      providerRaw = a.slice('--provider='.length);
      continue;
    }
    if (a === '--limit' || a === '-n') {
      limitRaw = argv[++i];
      continue;
    }
    if (a.startsWith('--limit=')) {
      limitRaw = a.slice('--limit='.length);
      continue;
    }
  }

  const provider = parseAuditProvider(providerRaw);
  if (provider == null) {
    console.error(
      `Invalid LOCATION_AUDIT_PROVIDER / --provider: "${providerRaw}". ` +
        `Use: ${[...PROVIDER_VALUES].join(', ')}, all`,
    );
    process.exit(1);
  }

  const limit =
    limitRaw && /^\d+$/.test(String(limitRaw))
      ? parseInt(String(limitRaw), 10)
      : null;

  return { provider, limit };
}

function outputFileSlug(provider: AuditProvider): string {
  return provider === 'all' ? 'all-providers' : provider;
}

/** File-safe description for markdown headers. */
function providerTitle(provider: AuditProvider): string {
  return provider === 'all' ? 'all providers' : provider;
}

interface DbJobRow {
  id: string;
  provider: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  locationRaw: string | null;
  locationTokens: string[];
  locationCountries: string[];
  locationRegions: string[];
  isRemote: boolean;
}

interface Facets {
  tokens: string[];
  countries: string[];
  regions: string[];
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

/** Mirrors job-process.processor facet logic minus provider-specific hints not on `Job`. */
function computeFacetsFromJob(job: DbJobRow): Facets {
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

function sortKey(values: string[]): string {
  return [...values].map((s) => s.toLowerCase()).sort().join('\x01');
}

function facetsEqual(a: Facets, b: Facets): boolean {
  return (
    sortKey(a.tokens) === sortKey(b.tokens) &&
    sortKey(a.countries) === sortKey(b.countries) &&
    sortKey(a.regions) === sortKey(b.regions)
  );
}

const JOB_SELECT = `
SELECT
  id,
  provider,
  "externalId",
  title,
  company,
  location,
  "locationRaw",
  "locationTokens",
  "locationCountries",
  "locationRegions",
  "isRemote"
FROM jobs`;

/** Work-mode-only raw strings: no geographic facet expectations — omit from facet scan. */
const SKIP_LOCATION_RAW_SQL = `LOWER(TRIM(COALESCE("locationRaw", ''))) NOT IN ('remote', 'hybrid')`;

function sqlScanAll(provider: AuditProvider, limit: number | null): {
  text: string;
  values: unknown[];
} {
  const limitClause = limit != null ? ` LIMIT ${limit}` : '';
  if (provider === 'all') {
    return {
      text: `${JOB_SELECT.trim()} WHERE ${SKIP_LOCATION_RAW_SQL} ORDER BY id${limitClause}`,
      values: [],
    };
  }
  return {
    text: `${JOB_SELECT.trim()} WHERE provider = $1 AND ${SKIP_LOCATION_RAW_SQL} ORDER BY id${limitClause}`,
    values: [provider],
  };
}

function sqlEmptyCountryGeo(provider: AuditProvider): {
  text: string;
  values: unknown[];
} {
  const tail = `
  COALESCE(array_length("locationCountries", 1), 0) = 0
  AND COALESCE(array_length("locationRegions", 1), 0) = 0
  AND LENGTH(TRIM(COALESCE("locationRaw", location, ''))) > 1
  AND LOWER(TRIM(COALESCE("locationRaw", location, ''))) NOT IN ('remote', 'hybrid', 'anywhere', 'unknown')
  AND NOT (
    "isRemote" = true
    AND TRIM(COALESCE("locationRaw", location, '')) ~* '^(remote|hybrid|anywhere|distributed|unknown|worldwide|global)\\s*$'
  )
  ORDER BY "locationRaw" NULLS LAST, id`;

  if (provider === 'all') {
    return {
      text: `${JOB_SELECT.trim()} WHERE ${tail.trim()}`,
      values: [],
    };
  }
  return {
    text: `${JOB_SELECT.trim()} WHERE provider = $1 AND ${tail.trim()}`,
    values: [provider],
  };
}

type MismatchCategory =
  | 'hint_delta_or_stale'
  | 'layout_only'
  | 'code_gap_candidate';

type FacetMismatchRow = DbJobRow & {
  expectedTokens: string[];
  expectedCountries: string[];
  expectedRegions: string[];
  mismatchReason: string;
  category: MismatchCategory;
};

function classifyMismatch(
  stored: Facets,
  expected: Facets,
  job: DbJobRow,
): MismatchCategory {
  const sameCountries = sortKey(stored.countries) === sortKey(expected.countries);
  const sameRegions = sortKey(stored.regions) === sortKey(expected.regions);
  const sameTokens = sortKey(stored.tokens) === sortKey(expected.tokens);

  if (
    expected.countries.length === 0 &&
    stored.countries.length === 0 &&
    sameRegions &&
    !sameTokens
  ) {
    return 'layout_only';
  }

  if (expected.countries.length === 0 && stored.countries.length > 0) {
    return 'hint_delta_or_stale';
  }

  if (
    stored.countries.length > expected.countries.length ||
    (stored.countries.length > 0 && expected.countries.length === 0)
  ) {
    return 'hint_delta_or_stale';
  }

  if (sameCountries && sameRegions && !sameTokens) {
    return 'layout_only';
  }

  if (expected.countries.length === 0 && stored.countries.length === 0) {
    // Empty countries is acceptable when regions are present (region-only geo).
    if (stored.regions.length > 0 || expected.regions.length > 0) {
      return 'hint_delta_or_stale';
    }
    // Fully remote-only: empty countries with no regions is acceptable for provider-remote jobs.
    if (job.isRemote) {
      const remoteTokens = new Set(['remote', 'anywhere', 'distributed']);
      const onlyRemoteTokens = (facets: Facets): boolean =>
        facets.tokens.length > 0 &&
        facets.tokens.every((t) => remoteTokens.has(t.toLowerCase()));
      if (onlyRemoteTokens(stored) || onlyRemoteTokens(expected)) {
        return 'hint_delta_or_stale';
      }
    }
    return 'code_gap_candidate';
  }

  return 'hint_delta_or_stale';
}

function mismatchReason(stored: Facets, expected: Facets): string {
  const parts: string[] = [];
  if (sortKey(stored.tokens) !== sortKey(expected.tokens)) {
    parts.push('tokens');
  }
  if (sortKey(stored.countries) !== sortKey(expected.countries)) {
    parts.push('countries');
  }
  if (sortKey(stored.regions) !== sortKey(expected.regions)) {
    parts.push('regions');
  }
  return parts.join('+') || 'unknown';
}

function aggregateCounts<T>(
  items: T[],
  keyFn: (x: T) => string,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const x of items) {
    const k = keyFn(x);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function writeCodebaseProposals(params: {
  provider: AuditProvider;
  scanned: number;
  facetMismatches: FacetMismatchRow[];
  emptyCountryGeo: DbJobRow[];
  categories: Record<string, number>;
}): string {
  const pTitle = providerTitle(params.provider);
  const ashbyHintNote =
    params.provider === SourceProvider.ASHBY ||
    params.provider === 'all';

  const lines: string[] = [];
  lines.push(`# Location audit (${pTitle}) — codebase proposals`);
  lines.push('');
  lines.push(`Generated at **${new Date().toISOString()}**.`);
  lines.push('');
  lines.push('## Method');
  lines.push('');
  lines.push(
    `1. **\`SQL_EMPTY_COUNTRY_GEO\`**: Same SQL as below, then **post-filter**: keep only rows where text-only recompute still has **no** countries **and** **no** regions (drops stale rows where the parser now resolves geography). Base SQL: jobs${params.provider === 'all' ? '' : ` for provider **${params.provider}**`} with **no** stored \`locationCountries\` **and** **no** \`locationRegions\`, non-trivial \`locationRaw\` / \`location\`, excluding plain \`remote\` / \`hybrid\` / \`anywhere\` / \`unknown\`, and excluding **\`isRemote\` + remote-only** raw (whole string matches remote/global/work-mode variants only).`,
  );
  lines.push(
    `2. **Facet recompute**: For each scanned job, recompute facets from \`formatRawLocation(locationRaw ?? location)\` via \`resolveNormalizedLocation\` + \`extractLocationFacets\`, matching [\`job-process.processor.ts\`](../src/jobs/processors/job-process.processor.ts) **minus** provider-only ingest fields **not** stored on \`jobs\` (e.g. Ashby **\`locationCountryHints\`** from postal data).`,
  );
  if (ashbyHintNote) {
    lines.push(
      '',
      `For **Ashby** rows, stored facets may include countries from **API hints** that text-only recompute cannot reproduce — **\`hint_delta_or_stale\`** is often expected there.`,
    );
  }
  lines.push('');
  lines.push('## Summary counts');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Jobs scanned (${pTitle}) | ${params.scanned} |`);
  lines.push(`| Stored vs text-only recompute **differ** | ${params.facetMismatches.length} |`);
  lines.push(`| Empty country + geo-like raw (SQL) | ${params.emptyCountryGeo.length} |`);
  lines.push('');
  lines.push('### Mismatch categories (heuristic)');
  lines.push('');
  lines.push('| Category | Count | Meaning |');
  lines.push('|----------|-------|---------|');
  lines.push(
    `| hint_delta_or_stale | ${params.categories.hint_delta_or_stale ?? 0} | Stored differs; ${ashbyHintNote ? 'Ashby hints / ' : ''}stale ingest vs current parser → often **backfill** after code changes. |`,
  );
  lines.push(
    `| layout_only | ${params.categories.layout_only ?? 0} | Same countries/regions; token list differs — usually **cosmetic**. |`,
  );
  lines.push(
    `| code_gap_candidate | ${params.categories.code_gap_candidate ?? 0} | Text-only recompute has **no** country **and** no regions (country-only gap). Rows with regions but no country are **not** this bucket — empty countries with regions is OK. |`,
  );
  lines.push('');

  lines.push('## A. Empty `locationCountries` + geographic raw (fix mapping first)');
  lines.push('');
  const rawEmpty = aggregateCounts(params.emptyCountryGeo, (r) =>
    String(r.locationRaw ?? r.location ?? '').trim() || '(empty)',
  );
  const topEmpty = [...rawEmpty.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  lines.push('Top distinct `locationRaw` / `location`:');
  lines.push('');
  for (const [loc, c] of topEmpty) {
    lines.push(`- **(${c}×)** \`${loc.replace(/`/g, "'").slice(0, 220)}${loc.length > 220 ? '…' : ''}\``);
  }
  lines.push('');
  lines.push(
    '**Suggested code changes**: Add `KNOWN_COUNTRIES`, `CITY_COUNTRY_HINTS`, `normalizeKnownLocationPhrases`, or ISO-prefix handlers in [`normalize-location.ts`](../src/jobs/utils/normalize-location.ts).',
  );
  lines.push('');

  lines.push('## B. Facet drift vs current parser (backfill)');
  lines.push('');
  if (ashbyHintNote) {
    lines.push(
      'When **stored has more countries** than text-only expected on Ashby jobs, ingestion may have merged **API `addressCountry` hints** — not necessarily a parser bug.',
    );
    lines.push('');
  }
  const driftRaw = aggregateCounts(params.facetMismatches, (r) =>
    String(r.locationRaw ?? r.location ?? '').trim() || '(empty)',
  );
  const topDrift = [...driftRaw.entries()].sort((a, b) => b[1] - a[1]).slice(0, 35);
  lines.push('Top distinct `locationRaw` among facet mismatches:');
  lines.push('');
  for (const [loc, c] of topDrift) {
    lines.push(`- **(${c}×)** \`${loc.replace(/`/g, "'").slice(0, 180)}${loc.length > 180 ? '…' : ''}\``);
  }
  lines.push('');
  lines.push(
    `**Suggested actions**: (1) After updating \`normalize-location.ts\`, **re-enqueue job processing** for the relevant source(s). (2) Treat persistent mismatches where **expected** lacks countries as **section A** candidates.`,
  );
  lines.push('');

  lines.push('## C. Optional DB persistence');
  lines.push('');
  lines.push(
    'Store provider-specific hint fields (e.g. `locationCountryHints`) or a merged facet snapshot on `jobs` if audits must replay ingest exactly.',
  );
  lines.push('');

  return lines.join('\n');
}

async function main(): Promise<void> {
  const { provider, limit } = parseAuditArgs();
  const slug = outputFileSlug(provider);
  const databaseUrl = process.env.DATABASE_URL;

  const outDir = path.join(__dirname, 'output');
  fs.mkdirSync(outDir, { recursive: true });

  const jsonPath = path.join(outDir, `${slug}-location-quality.json`);
  const summaryPath = path.join(outDir, `${slug}-location-quality.summary.txt`);
  const proposalsPath = path.join(
    outDir,
    `${slug}-location-quality.codebase-proposals.md`,
  );

  if (!databaseUrl) {
    const err =
      'DATABASE_URL is not set. Copy .env.example to .env and set DATABASE_URL, then re-run.';
    fs.writeFileSync(jsonPath, JSON.stringify({ error: err }, null, 2), 'utf8');
    fs.writeFileSync(summaryPath, err, 'utf8');
    fs.writeFileSync(proposalsPath, `# Audit failed\n\n${err}\n`, 'utf8');
    console.error(err);
    process.exit(1);
  }

  const scanQuery = sqlScanAll(provider, limit);
  const emptyQuery = sqlEmptyCountryGeo(provider);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  let allRows: DbJobRow[];
  let emptyGeoRows: DbJobRow[];
  try {
    const [rAll, rEmpty] = await Promise.all([
      client.query(scanQuery.text, scanQuery.values),
      client.query(emptyQuery.text, emptyQuery.values),
    ]);
    allRows = rAll.rows as DbJobRow[];
    emptyGeoRows = rEmpty.rows as DbJobRow[];
    /** Drop rows where current parser already yields countries or regions (stale DB facets). */
    emptyGeoRows = emptyGeoRows.filter((row) => {
      const expected = computeFacetsFromJob(row);
      return (
        expected.countries.length === 0 && expected.regions.length === 0
      );
    });
  } finally {
    await client.end();
  }

  const facetMismatches: FacetMismatchRow[] = [];
  const categories: Record<string, number> = {
    hint_delta_or_stale: 0,
    layout_only: 0,
    code_gap_candidate: 0,
  };

  for (const row of allRows) {
    const expected = computeFacetsFromJob(row);
    const stored: Facets = {
      tokens: row.locationTokens ?? [],
      countries: row.locationCountries ?? [],
      regions: row.locationRegions ?? [],
    };
    if (facetsEqual(stored, expected)) {
      continue;
    }

    const cat = classifyMismatch(stored, expected, row);
    categories[cat] = (categories[cat] ?? 0) + 1;

    facetMismatches.push({
      ...row,
      expectedTokens: expected.tokens,
      expectedCountries: expected.countries,
      expectedRegions: expected.regions,
      mismatchReason: mismatchReason(stored, expected),
      category: cat,
    });
  }

  const summaryLines: string[] = [];
  summaryLines.push(`Provider scope: ${providerTitle(provider)}`);
  summaryLines.push(`Jobs scanned: ${allRows.length}`);
  summaryLines.push(
    limit != null
      ? `(LOCATION_AUDIT_LIMIT=${limit})`
      : '(no limit)',
  );
  summaryLines.push(
    `Facet mismatches (stored ≠ text-only recompute): ${facetMismatches.length}`,
  );
  summaryLines.push(
    `Empty locationCountries + geo-like raw (SQL): ${emptyGeoRows.length}`,
  );
  summaryLines.push('');
  summaryLines.push('Mismatch categories:');
  for (const [k, v] of Object.entries(categories)) {
    summaryLines.push(`  ${k}: ${v}`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    provider,
    auditLimit: limit,
    scanned: allRows.length,
    stats: {
      facetMismatchCount: facetMismatches.length,
      emptyCountryGeoCount: emptyGeoRows.length,
      categories,
    },
    sql: {
      scanJobs: scanQuery.text.trim(),
      scanValues: scanQuery.values,
      emptyCountryGeo: emptyQuery.text.trim(),
      emptyValues: emptyQuery.values,
    },
    emptyCountryGeoRows: emptyGeoRows,
    facetMismatches,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(summaryPath, summaryLines.join('\n'), 'utf8');
  fs.writeFileSync(
    proposalsPath,
    writeCodebaseProposals({
      provider,
      scanned: allRows.length,
      facetMismatches: facetMismatches as FacetMismatchRow[],
      emptyCountryGeo: emptyGeoRows,
      categories,
    }),
    'utf8',
  );

  console.log(`Provider: ${providerTitle(provider)}`);
  console.log(`Scanned ${allRows.length} jobs`);
  console.log(`Facet mismatches: ${facetMismatches.length}`);
  console.log(`Empty country + geo raw: ${emptyGeoRows.length}`);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Summary: ${summaryPath}`);
  console.log(`Proposals: ${proposalsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
