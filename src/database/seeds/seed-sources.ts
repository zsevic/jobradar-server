import dataSource from '../data-source';
import { Source, SourceProvider } from '../entities/source.entity';

interface SourceSeedItem {
  provider: SourceProvider;
  externalId: string;
  name: string;
}

const sourceSeeds: SourceSeedItem[] = [
  { provider: SourceProvider.ASHBY, externalId: 'n8n', name: 'n8n' },
  { provider: SourceProvider.ASHBY, externalId: 'gorgias', name: 'Gorgias' },
  { provider: SourceProvider.ASHBY, externalId: 'passport', name: 'Passport' },
  { provider: SourceProvider.ASHBY, externalId: 'oakslab', name: 'Oakslab' },
  { provider: SourceProvider.ASHBY, externalId: 'space44', name: 'Space44' },
  {
    provider: SourceProvider.ASHBY,
    externalId: 'perplexity',
    name: 'Perplexity',
  },
  { provider: SourceProvider.ASHBY, externalId: 'rho', name: 'Rho' },
  {
    provider: SourceProvider.ASHBY,
    externalId: 'ruby labs',
    name: 'Ruby Labs',
  },
  { provider: SourceProvider.ASHBY, externalId: 'deel', name: 'Deel' },

  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'telesign',
    name: 'TeleSign',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'brainrocket',
    name: 'Brainrocket',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'sofiastars',
    name: 'Sofiastars',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'databricks',
    name: 'Databricks',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'fireblocks',
    name: 'Fireblocks',
  },
  { provider: SourceProvider.GREENHOUSE, externalId: 'rivian', name: 'Rivian' },
  { provider: SourceProvider.GREENHOUSE, externalId: 'gitlab', name: 'GitLab' },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'speechify',
    name: 'Speechify',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'learnupon',
    name: 'LearnUpon',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'typeform',
    name: 'Typeform',
  },
  { provider: SourceProvider.GREENHOUSE, externalId: 'spacex', name: 'SpaceX' },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'florencehealthcare',
    name: 'Florence Healthcare',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'constructorknowledge',
    name: 'Constructor Knowledge',
  },
];

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
