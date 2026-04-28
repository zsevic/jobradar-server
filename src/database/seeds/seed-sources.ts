import dataSource from '../data-source';
import { Source } from '../entities/source.entity';
import { sourceSeeds } from './source-seeds.data';

async function seedSources(): Promise<void> {
  await dataSource.initialize();
  const sourceRepository = dataSource.getRepository(Source);

  for (const source of sourceSeeds) {
    await sourceRepository.upsert(
      {
        name: source.name,
        provider: source.provider,
        externalId: source.externalId,
        isActive: true,
        syncStatus: 'idle',
      },
      {
        conflictPaths: ['provider', 'externalId'],
      },
    );
  }

  await dataSource.destroy();

  console.log(`Seeded ${sourceSeeds.length} sources (idempotent upsert).`);
}

void seedSources();
