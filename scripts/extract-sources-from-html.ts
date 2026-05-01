/**
 * Extracts ATS source seed entries (Greenhouse, Ashby, Workable) from an HTML file.
 *
 * Scans every <a href> in the HTML, classifies the link by hostname/path,
 * derives an externalId (slug) and a best-effort company name, deduplicates,
 * and prints ready-to-paste seed entries grouped by provider.
 *
 * Usage:
 *   npm run extract:sources-html -- <path-to-html-file>
 *   npm run extract:sources-html -- <path-to-html-file> --provider=greenhouse
 *   npm run extract:sources-html -- <path-to-html-file> --provider=ashby
 *   npm run extract:sources-html -- <path-to-html-file> --provider=workable
 *   npm run extract:sources-html -- <path-to-html-file> --verify-software-engineer
 *   npm run extract:sources-html -- <path-to-html-file> --verify-software-engineer --only-verified
 *
 * Notes:
 * - Output goes to stdout; status/summary lines go to stderr so the seed
 *   block can be piped or redirected cleanly.
 * - Embed/iframe URL forms are intentionally out of scope.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as cheerio from 'cheerio';

type Provider = 'greenhouse' | 'ashby' | 'workable';

interface Extracted {
  provider: Provider;
  externalId: string;
  name: string;
}

interface ScriptOptions {
  input: string;
  provider: Provider | null;
  verifySoftwareEngineer: boolean;
  onlyVerified: boolean;
  outputFile: string;
}

interface VerificationResult {
  hasSoftwareEngineer: boolean;
  matchedTitles: string[];
  totalTitlesScanned: number;
}

const API_TIMEOUT_MS = 15_000;

const PROVIDER_ENUM: Record<Provider, string> = {
  greenhouse: 'SourceProvider.GREENHOUSE',
  ashby: 'SourceProvider.ASHBY',
  workable: 'SourceProvider.WORKABLE',
};

const PROVIDER_ORDER: Provider[] = ['greenhouse', 'ashby', 'workable'];

const GENERIC_NAME_TOKENS = new Set([
  'apply',
  'apply now',
  'careers',
  'career',
  'jobs',
  'open jobs',
  'open roles',
  'view jobs',
  'view roles',
  'see jobs',
  'see roles',
  'greenhouse',
  'ashby',
  'workable',
  'click here',
  'here',
  'website',
  'link',
]);

function isGenericName(value: string): boolean {
  return GENERIC_NAME_TOKENS.has(value.trim().toLowerCase());
}

function parseArgs(argv: string[]): {
  input: string;
  provider: Provider | null;
  verifySoftwareEngineer: boolean;
  onlyVerified: boolean;
  outputFile: string;
} {
  const args = argv.slice(2);
  let input: string | null = null;
  let provider: Provider | null = null;
  let verifySoftwareEngineer = false;
  let onlyVerified = false;
  let outputFile = 'scripts/extracted-sources.txt';

  for (const arg of args) {
    if (arg === '-h' || arg === '--help') {
      printHelpAndExit();
    } else if (arg.startsWith('--provider=')) {
      const value = arg.slice('--provider='.length).toLowerCase();
      if (value !== 'greenhouse' && value !== 'ashby' && value !== 'workable') {
        throw new Error(
          `Invalid --provider value: "${value}". Expected greenhouse, ashby, or workable.`,
        );
      }
      provider = value;
    } else if (arg === '--verify-software-engineer') {
      verifySoftwareEngineer = true;
    } else if (arg === '--only-verified') {
      onlyVerified = true;
    } else if (arg.startsWith('--output=')) {
      const value = arg.slice('--output='.length).trim();
      if (!value) {
        throw new Error('Invalid --output value: cannot be empty.');
      }
      outputFile = value;
    } else if (!input) {
      input = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }

  if (!input) {
    printHelpAndExit(1);
  }

  if (onlyVerified && !verifySoftwareEngineer) {
    throw new Error('--only-verified requires --verify-software-engineer.');
  }

  return { input: input!, provider, verifySoftwareEngineer, onlyVerified, outputFile };
}

function printHelpAndExit(code = 0): never {
  const msg = [
    'Usage:',
    '  npm run extract:sources-html -- <path-to-html-file> [--provider=greenhouse|ashby|workable] [--verify-software-engineer] [--only-verified] [--output=path]',
    '',
    'Reads an HTML file, finds Greenhouse/Ashby/Workable job-board links,',
    'and prints deduplicated seed entries grouped by provider.',
    '',
    'Flags:',
    '  --verify-software-engineer   Call ATS APIs and verify if source has software engineer roles',
    '  --only-verified              Keep only sources that pass verification (requires --verify-software-engineer)',
    '  --output=path                Save results to file (default: scripts/extracted-sources.txt)',
  ].join('\n');
  if (code === 0) {
    console.log(msg);
  } else {
    console.error(msg);
  }
  process.exit(code);
}

function readHtml(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

function detectFromUrl(
  rawHref: string,
): { provider: Provider; slug: string } | null {
  if (!rawHref) return null;

  const trimmed = rawHref.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('javascript:')) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(trimmed, 'https://placeholder.invalid/');
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);
  const first = segments[0]?.toLowerCase() ?? '';

  // Greenhouse: boards.greenhouse.io/<slug> or job-boards.greenhouse.io/<slug>
  if (host === 'boards.greenhouse.io' || host === 'job-boards.greenhouse.io') {
    if (!first || first === 'embed') return null;
    return { provider: 'greenhouse', slug: first };
  }

  // Ashby: jobs.ashbyhq.com/<slug> (skip app.ashbyhq.com which is admin)
  if (host === 'jobs.ashbyhq.com' || host === 'www.ashbyhq.com' || host === 'ashbyhq.com') {
    if (!first) return null;
    return { provider: 'ashby', slug: first };
  }

  // Workable: apply.workable.com/<slug>
  if (host === 'apply.workable.com') {
    if (!first) return null;
    return { provider: 'workable', slug: first };
  }
  // Workable subdomain form: <slug>.workable.com
  if (host.endsWith('.workable.com')) {
    const sub = host.slice(0, -'.workable.com'.length);
    if (sub && sub !== 'apply' && sub !== 'www') {
      return { provider: 'workable', slug: sub };
    }
  }

  return null;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function pickName(
  $: cheerio.CheerioAPI,
  $anchor: cheerio.Cheerio<any>,
  slug: string,
): string {
  const fromImg = collapseWhitespace($anchor.find('img[alt]').first().attr('alt') ?? '');
  if (fromImg && !isGenericName(fromImg)) return fromImg;

  const fromAriaOrTitle = collapseWhitespace(
    $anchor.attr('aria-label') ?? $anchor.attr('title') ?? '',
  );
  if (fromAriaOrTitle && !isGenericName(fromAriaOrTitle)) return fromAriaOrTitle;

  const fromText = collapseWhitespace($anchor.text());
  if (fromText && !isGenericName(fromText)) return fromText;

  // Walk up to a likely container and try common name-bearing children.
  const $container = $anchor
    .closest('td.company-cell, td, li, tr, .company-cell, [class*="company"]')
    .first();
  if ($container.length > 0) {
    const containerImg = collapseWhitespace(
      $container.find('img[alt]').first().attr('alt') ?? '',
    );
    if (containerImg && !isGenericName(containerImg)) return containerImg;

    const candidate = $container
      .find(
        '.company-name, .name, .title, [class*="company-name"], h1, h2, h3, h4, h5, h6, strong, span',
      )
      .filter((_: number, el: any) => {
        const text = collapseWhitespace($(el).text());
        return Boolean(text) && !isGenericName(text);
      })
      .first();
    if (candidate.length > 0) {
      const text = collapseWhitespace(candidate.text());
      if (text) return text;
    }

    // Last resort: full container text minus anchor text.
    const containerText = collapseWhitespace($container.clone().find('a').remove().end().text());
    if (containerText && !isGenericName(containerText)) return containerText;
  }

  return slug;
}

function escapeSingleQuotes(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function extract(html: string): Extracted[] {
  const $ = cheerio.load(html);
  const seen = new Map<string, Extracted>();

  $('a[href]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') ?? '';
    const detected = detectFromUrl(href);
    if (!detected) return;

    const { provider, slug } = detected;
    const key = `${provider}:${slug.toLowerCase()}`;
    if (seen.has(key)) return;

    const name = pickName($, $a, slug);
    seen.set(key, { provider, externalId: slug, name });
  });

  return Array.from(seen.values());
}

function buildJobsApiUrl(entry: Extracted): string {
  const id = encodeURIComponent(entry.externalId);
  switch (entry.provider) {
    case 'greenhouse':
      return `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`;
    case 'ashby':
      return `https://api.ashbyhq.com/posting-api/job-board/${id}`;
    case 'workable':
      return `https://www.workable.com/api/accounts/${id}?details=true`;
  }
}

function collectStringFieldsByKeyDeep(
  value: unknown,
  wantedKeys: Set<string>,
  output: string[],
): void {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringFieldsByKeyDeep(item, wantedKeys, output);
    }
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

async function verifySoftwareEngineer(
  payload: unknown,
): Promise<VerificationResult> {
  const titles: string[] = [];
  collectStringFieldsByKeyDeep(payload, new Set(['title']), titles);

  const uniqueTitles = Array.from(
    new Set(
      titles
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
  const matchedTitles = uniqueTitles.filter(hasSoftwareEngineerIntent);
  return {
    hasSoftwareEngineer: matchedTitles.length > 0,
    matchedTitles,
    totalTitlesScanned: uniqueTitles.length,
  };
}

async function fetchBoardPayload(entry: Extracted): Promise<unknown> {
  const url = buildJobsApiUrl(entry);
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return (await response.json()) as unknown;
}

function pickCompanyNameFromPayload(
  entry: Extracted,
  payload: unknown,
): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (entry.provider === 'greenhouse') {
    const greenhouseName = record.name;
    if (typeof greenhouseName === 'string' && greenhouseName.trim()) {
      return greenhouseName.trim();
    }
  }

  if (entry.provider === 'ashby') {
    const ashbyTop =
      (typeof record.name === 'string' && record.name.trim()) ||
      (typeof record.organizationName === 'string' && record.organizationName.trim()) ||
      (typeof record.companyName === 'string' && record.companyName.trim());
    if (ashbyTop) {
      return ashbyTop;
    }
  }

  if (entry.provider === 'workable') {
    const workableTop =
      (typeof record.company_name === 'string' && record.company_name.trim()) ||
      (typeof record.companyName === 'string' && record.companyName.trim()) ||
      (typeof record.name === 'string' && record.name.trim());
    if (workableTop) {
      return workableTop;
    }
  }

  const names: string[] = [];
  collectStringFieldsByKeyDeep(
    payload,
    new Set(['company_name', 'companyname', 'organizationname', 'company', 'name']),
    names,
  );
  const candidate = names
    .map((value) => value.trim())
    .find((value) => Boolean(value) && !isGenericName(value));
  return candidate ?? null;
}

function format(entries: Extracted[], filter: Provider | null): string {
  const bodyLines: string[] = [];
  for (const provider of PROVIDER_ORDER) {
    if (filter && provider !== filter) continue;
    const group = entries
      .filter((e) => e.provider === provider)
      .sort((a, b) => a.externalId.localeCompare(b.externalId));
    if (group.length === 0) continue;
    bodyLines.push(`  // ${provider} (${group.length})`);
    for (const entry of group) {
      bodyLines.push(
        `  { provider: ${PROVIDER_ENUM[provider]}, externalId: '${escapeSingleQuotes(
          entry.externalId,
        )}', name: '${escapeSingleQuotes(entry.name)}' },`,
      );
    }
    bodyLines.push('');
  }
  const trimmedBody = bodyLines.join('\n').trimEnd();
  if (!trimmedBody) {
    return '[]\n';
  }
  return `[\n${trimmedBody}\n]\n`;
}

async function main(): Promise<void> {
  const {
    input,
    provider,
    verifySoftwareEngineer: shouldVerifySoftwareEngineer,
    onlyVerified,
    outputFile,
  } = parseArgs(process.argv);
  const html = readHtml(input);
  const entries = extract(html);
  const baseFiltered = provider ? entries.filter((e) => e.provider === provider) : entries;

  if (baseFiltered.length === 0) {
    console.error(
      provider
        ? `No ${provider} links found in ${input}.`
        : `No Greenhouse/Ashby/Workable links found in ${input}.`,
    );
    process.exit(1);
  }

  const payloadBySource = new Map<string, unknown>();
  const enrichedEntries: Extracted[] = [];
  for (const entry of baseFiltered) {
    const key = `${entry.provider}:${entry.externalId.toLowerCase()}`;
    try {
      const payload = await fetchBoardPayload(entry);
      payloadBySource.set(key, payload);
      const nameFromApi = pickCompanyNameFromPayload(entry, payload);
      enrichedEntries.push({
        ...entry,
        name: nameFromApi ?? entry.name,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `! ${entry.provider}:${entry.externalId} name enrichment failed (${message}), using HTML-derived name`,
      );
      enrichedEntries.push(entry);
    }
  }

  let outputEntries = enrichedEntries;
  if (shouldVerifySoftwareEngineer) {
    const verified: Extracted[] = [];
    let failed = 0;
    for (const entry of enrichedEntries) {
      const tag = `${entry.provider}:${entry.externalId}`;
      try {
        const payloadKey = `${entry.provider}:${entry.externalId.toLowerCase()}`;
        let payload = payloadBySource.get(payloadKey);
        if (!payload) {
          payload = await fetchBoardPayload(entry);
          payloadBySource.set(payloadKey, payload);
        }
        const result = await verifySoftwareEngineer(payload);
        if (result.hasSoftwareEngineer) {
          verified.push(entry);
          const sample = result.matchedTitles.slice(0, 2).join(' | ');
          console.error(`✓ ${tag} software-engineer roles found (${result.matchedTitles.length}/${result.totalTitlesScanned})${sample ? ` | ${sample}` : ''}`);
        } else {
          console.error(`- ${tag} no software-engineer roles found (scanned ${result.totalTitlesScanned} titles)`);
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`! ${tag} verification failed: ${message}`);
      }
    }

    if (onlyVerified) {
      outputEntries = verified;
    }
    console.error(
      `\nVerification summary: ${verified.length}/${enrichedEntries.length} sources have software-engineer roles, ${failed} failed checks.`,
    );
  }

  if (outputEntries.length === 0) {
    console.error('No sources to output after applying filters.');
    process.exit(1);
  }

  const outputText = format(outputEntries, provider);
  const absoluteOutputPath = resolve(outputFile);
  writeFileSync(absoluteOutputPath, outputText, 'utf8');

  const counts: string[] = [];
  for (const p of PROVIDER_ORDER) {
    if (provider && p !== provider) continue;
    const n = outputEntries.filter((e) => e.provider === p).length;
    if (n > 0) counts.push(`${p}=${n}`);
  }
  console.error(
    `\nOutput ${outputEntries.length} unique source(s) [${counts.join(', ')}]. Saved to ${absoluteOutputPath}`,
  );
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
