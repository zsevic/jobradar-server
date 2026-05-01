/**
 * Reads an HTML export (e.g. Google Sheets "Existing Company Pages") containing
 * Ashby career links (jobs.ashbyhq.com/<slug>). For each unique slug, fetches
 * the Ashby posting API and checks job titles for software-engineer intent.
 * Companies that match are merged into scripts/extracted-sources.json (same
 * shape as extract-sources-from-html.ts).
 *
 * Usage:
 *   npm run extract:ashby-html-swe -- "<path-to-html-file>"
 *   npm run extract:ashby-html-swe -- "<path>" --output=scripts/extracted-sources.json
 *   npm run extract:ashby-html-swe -- "<path>" --delay-ms=200
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as cheerio from 'cheerio';

type Provider = 'greenhouse' | 'ashby' | 'workable';

interface Extracted {
  provider: Provider;
  externalId: string;
  name: string | null;
}

const API_TIMEOUT_MS = 15_000;
const PROVIDER_ORDER: Provider[] = ['greenhouse', 'ashby', 'workable'];

function parseArgs(argv: string[]): { input: string; outputFile: string; delayMs: number } {
  const args = argv.slice(2);
  let input: string | null = null;
  let outputFile = 'scripts/extracted-sources.json';
  let delayMs = 200;

  for (const arg of args) {
    if (arg === '-h' || arg === '--help') {
      printHelpAndExit();
    } else if (arg.startsWith('--output=')) {
      const value = arg.slice('--output='.length).trim();
      if (!value) throw new Error('Invalid --output value: cannot be empty.');
      outputFile = value;
    } else if (arg.startsWith('--delay-ms=')) {
      const n = Number(arg.slice('--delay-ms='.length));
      if (!Number.isFinite(n) || n < 0) {
        throw new Error('Invalid --delay-ms: expected a non-negative number.');
      }
      delayMs = n;
    } else if (!input) {
      input = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!input) printHelpAndExit(1);

  return { input: input!, outputFile, delayMs };
}

function printHelpAndExit(code = 0): never {
  const msg = [
    'Usage:',
    '  npm run extract:ashby-html-swe -- <path-to-html-file> [--output=scripts/extracted-sources.json] [--delay-ms=200]',
    '',
    'Parses jobs.ashbyhq.com/<slug> links from HTML, verifies software-engineer jobs via API,',
    'and merges matching ashby sources into the JSON output file.',
  ].join('\n');
  if (code === 0) console.log(msg);
  else console.error(msg);
  process.exit(code);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Decode path segment and lowercase — Ashby APIs expect lowercase board slugs. */
function normalizeAshbySlugSegment(segment: string): string {
  try {
    return decodeURIComponent(segment).trim().toLowerCase();
  } catch {
    return segment.trim().toLowerCase();
  }
}

/** Spreadsheet / paste exports sometimes append a trailing comma to URLs. */
function sanitizeHref(rawHref: string): string {
  return rawHref.trim().replace(/,+$/g, '');
}

function parseAshbySlugFromHref(rawHref: string): string | null {
  if (!rawHref?.trim()) return null;
  const trimmed = sanitizeHref(rawHref);
  if (trimmed.startsWith('#') || trimmed.startsWith('javascript:')) return null;

  let url: URL;
  try {
    url = new URL(trimmed, 'https://placeholder.invalid/');
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);
  const first = segments[0] ?? '';

  if (host === 'jobs.ashbyhq.com' || host === 'www.ashbyhq.com' || host === 'ashbyhq.com') {
    if (!first) return null;
    return normalizeAshbySlugSegment(first);
  }
  return null;
}

function extractAshbySlugs(html: string): string[] {
  const $ = cheerio.load(html);
  const slugs = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const slug = parseAshbySlugFromHref(href);
    if (slug) slugs.add(slug);
  });
  return [...slugs].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function collectStringFieldsByKeyDeep(
  value: unknown,
  wantedKeys: Set<string>,
  output: string[],
): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) collectStringFieldsByKeyDeep(item, wantedKeys, output);
    return;
  }
  if (typeof value !== 'object') return;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'string' && wantedKeys.has(k.toLowerCase())) {
      output.push(v);
    }
    if (typeof v === 'object' && v !== null) {
      collectStringFieldsByKeyDeep(v, wantedKeys, output);
    }
  }
}

function hasSoftwareEngineerIntent(title: string): boolean {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return false;
  return (
    /\bsoftware\s+engineer\b/i.test(normalized) ||
    /\bswe\b/i.test(normalized) ||
    /\b(full[-\s]?stack|backend|back[-\s]?end|frontend|front[-\s]?end)\s+engineer\b/i.test(
      normalized,
    )
  );
}

function verifySoftwareEngineerFromPayload(payload: unknown): {
  hasSoftwareEngineer: boolean;
  matchedTitles: string[];
  totalTitlesScanned: number;
} {
  const titles: string[] = [];
  collectStringFieldsByKeyDeep(payload, new Set(['title']), titles);
  const uniqueTitles = Array.from(
    new Set(titles.map((t) => t.trim()).filter(Boolean)),
  );
  const matchedTitles = uniqueTitles.filter(hasSoftwareEngineerIntent);
  return {
    hasSoftwareEngineer: matchedTitles.length > 0,
    matchedTitles,
    totalTitlesScanned: uniqueTitles.length,
  };
}

async function fetchAshbyBoardPayload(externalId: string): Promise<unknown> {
  const id = encodeURIComponent(externalId);
  const url = `https://api.ashbyhq.com/posting-api/job-board/${id}`;
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as unknown;
}

function sortEntries(entries: Extracted[]): Extracted[] {
  return [...entries].sort((a, b) => {
    const providerCmp =
      PROVIDER_ORDER.indexOf(a.provider) - PROVIDER_ORDER.indexOf(b.provider);
    if (providerCmp !== 0) return providerCmp;
    return a.externalId.localeCompare(b.externalId);
  });
}

function loadExistingEntries(absoluteOutputPath: string): Extracted[] {
  if (!existsSync(absoluteOutputPath)) return [];

  const raw = readFileSync(absoluteOutputPath, 'utf8').trim();
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Output file is not valid JSON (${absoluteOutputPath}): ${message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Output file must contain a JSON array: ${absoluteOutputPath}`);
  }

  const valid: Extracted[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const provider = row.provider;
    const externalId = row.externalId;
    const name = row.name;
    if (
      (provider === 'greenhouse' || provider === 'ashby' || provider === 'workable') &&
      typeof externalId === 'string' &&
      (typeof name === 'string' || name === null)
    ) {
      valid.push({ provider, externalId, name: name ?? null });
    }
  }
  return valid;
}

function mergeEntries(existing: Extracted[], incoming: Extracted[]): Extracted[] {
  const byKey = new Map<string, Extracted>();
  for (const entry of existing) {
    byKey.set(`${entry.provider}:${entry.externalId.toLowerCase()}`, entry);
  }
  for (const entry of incoming) {
    byKey.set(`${entry.provider}:${entry.externalId.toLowerCase()}`, entry);
  }
  return sortEntries(Array.from(byKey.values()));
}

async function main(): Promise<void> {
  const { input, outputFile, delayMs } = parseArgs(process.argv);
  const html = readFileSync(input, 'utf8');
  const slugs = extractAshbySlugs(html);

  if (slugs.length === 0) {
    console.error(`No jobs.ashbyhq.com links found in ${input}`);
    process.exit(1);
  }

  console.error(`Found ${slugs.length} unique Ashby slug(s). Checking API…`);

  const matched: Extracted[] = [];
  let failed = 0;
  let noSwe = 0;

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const tag = `ashby:${slug}`;
    try {
      const payload = await fetchAshbyBoardPayload(slug);
      const result = verifySoftwareEngineerFromPayload(payload);
      if (result.hasSoftwareEngineer) {
        matched.push({ provider: 'ashby', externalId: slug, name: null });
        const sample = result.matchedTitles.slice(0, 2).join(' | ');
        console.error(
          `✓ ${tag} SWE (${result.matchedTitles.length}/${result.totalTitlesScanned})${sample ? ` | ${sample}` : ''}`,
        );
      } else {
        noSwe += 1;
        console.error(`- ${tag} no SWE titles (${result.totalTitlesScanned} scanned)`);
      }
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`! ${tag} ${message}`);
    }
    if (delayMs > 0 && i < slugs.length - 1) {
      await sleep(delayMs);
    }
  }

  console.error(
    `\nSummary: ${matched.length} with SWE roles, ${noSwe} without, ${failed} API errors (of ${slugs.length} slugs).`,
  );

  if (matched.length === 0) {
    console.error('Nothing to merge (no companies passed SWE check).');
    process.exit(1);
  }

  const absoluteOutputPath = resolve(outputFile);
  const existing = loadExistingEntries(absoluteOutputPath);
  const merged = mergeEntries(existing, matched);
  writeFileSync(absoluteOutputPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');

  console.error(
    `Merged ${matched.length} ashby source(s) with SWE. Total entries in file: ${merged.length}. Saved to ${absoluteOutputPath}`,
  );
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
