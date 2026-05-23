import type { DataSource } from 'typeorm';
import { Source } from '../entities/source.entity';
import { sourceSeeds } from './source-seeds.data';

/**
 * Idempotent upsert of all catalog sources. Caller must provide an initialized DataSource.
 */
export async function upsertSourceSeeds(
  dataSource: DataSource,
): Promise<number> {
  const sourceRepository = dataSource.getRepository(Source);

  for (const source of sourceSeeds) {
    await sourceRepository.upsert(
      {
        name: source.name,
        provider: source.provider,
        externalId: source.externalId,
        apiRegion: source.apiRegion ?? null,
        isActive: true,
        syncStatus: 'idle',
      },
      {
        conflictPaths: ['provider', 'externalId'],
      },
    );
  }

  return sourceSeeds.length;
}
