import dataSource from '../data-source';
import { upsertSourceSeeds } from './upsert-source-seeds';

async function seedSources(): Promise<void> {
  await dataSource.initialize();
  const count = await upsertSourceSeeds(dataSource);
  await dataSource.destroy();

  console.log(`Seeded ${count} sources (idempotent upsert).`);
}

void seedSources();
