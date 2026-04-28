/**
 * Validates ATS URLs for every entry in source-seeds.data.ts (no database).
 * Same public endpoints as job adapters. Invalid = HTTP 404.
 *
 * Usage: npm run validate:sources
 *
 * Logs each source that returns 404. Exit code 1 if any 404 or network error.
 */

import { SourceProvider } from '../src/database/entities/source.entity';
import { sourceSeeds } from '../src/database/seeds/source-seeds.data';

const TIMEOUT_MS = 15_000;
const DELAY_MS_BETWEEN_MS = 200;

type Row = {
  provider: SourceProvider;
  externalId: string;
  name: string;
};

function buildUrl(row: Pick<Row, 'provider' | 'externalId'>): string {
  const id = encodeURIComponent(row.externalId);
  switch (row.provider) {
    case SourceProvider.GREENHOUSE:
      return `https://boards-api.greenhouse.io/v1/boards/${id}/jobs?content=true`;
    case SourceProvider.ASHBY:
      return `https://api.ashbyhq.com/posting-api/job-board/${id}`;
    case SourceProvider.WORKABLE:
      return `https://www.workable.com/api/accounts/${id}?details=true`;
    default:
      throw new Error(`Unknown provider: ${String((row as Row).provider)}`);
  }
}

async function checkStatus(url: string): Promise<number> {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
    },
  });
  await res.arrayBuffer().catch(() => undefined);
  return res.status;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const rows: Row[] = sourceSeeds.map((s) => ({
    provider: s.provider,
    externalId: s.externalId,
    name: s.name,
  }));

  console.log(
    `Validating ${rows.length} seed sources from source-seeds.data.ts…\n`,
  );

  const notFound: Row[] = [];
  const errors: Array<{ row: Row; message: string }> = [];

  for (const row of rows) {
    const url = buildUrl(row);
    let status = 0;
    try {
      status = await checkStatus(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ row, message: msg });
      console.log(
        `✖ ${row.provider} ${row.externalId} ERROR ${msg}`,
      );
      await sleep(DELAY_MS_BETWEEN_MS);
      continue;
    }

    if (status === 404) {
      notFound.push(row);
      console.log(
        `[404] ${row.provider} | ${row.externalId} | ${row.name}`,
      );
      console.log(`      ${url}`);
    } else {
      const icon = status >= 200 && status < 300 ? '✓' : '!';
      console.log(
        `${icon} ${row.provider.padEnd(12)} ${row.externalId.padEnd(36)} ${status} ${row.name}`,
      );
    }

    await sleep(DELAY_MS_BETWEEN_MS);
  }

  const failCount = notFound.length + errors.length;

  if (notFound.length > 0) {
    console.log(`\n--- ${notFound.length} source(s) returned 404 ---`);
    for (const row of notFound) {
      console.log(
        `  ${row.provider}  ${row.externalId}  (${row.name})  ${buildUrl(row)}`,
      );
    }
  }

  if (errors.length > 0) {
    console.log(`\n--- ${errors.length} request error(s) ---`);
    for (const { row, message } of errors) {
      console.log(`  ${row.provider} ${row.externalId}: ${message}`);
    }
  }

  console.log(
    `\nDone. ${failCount} failed (${notFound.length} not found, ${errors.length} errors) of ${rows.length}.`,
  );

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
