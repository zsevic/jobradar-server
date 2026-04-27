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
  { provider: SourceProvider.ASHBY, externalId: 'oakslab', name: "OAK'S LAB" },
  { provider: SourceProvider.ASHBY, externalId: 'space44', name: 'Space44' },
  {
    provider: SourceProvider.ASHBY,
    externalId: 'perplexity',
    name: 'Perplexity',
  },
  { provider: SourceProvider.ASHBY, externalId: 'rho', name: 'Rho' },
  {
    provider: SourceProvider.ASHBY,
    externalId: 'ruby-labs',
    name: 'Ruby Labs',
  },
  { provider: SourceProvider.ASHBY, externalId: 'deel', name: 'Deel' },

  { provider: SourceProvider.ASHBY, externalId: 'ramp', name: 'Ramp' },
  { provider: SourceProvider.ASHBY, externalId: 'cognition', name: 'Cognition' },
  { provider: SourceProvider.ASHBY, externalId: 'suno', name: 'Suno' },
  { provider: SourceProvider.ASHBY, externalId: 'brainco', name: 'BrainCo' },
  { provider: SourceProvider.ASHBY, externalId: 'notion', name: 'Notion' },
  { provider: SourceProvider.ASHBY, externalId: 'baseten', name: 'Baseten' },
  { provider: SourceProvider.ASHBY, externalId: 'substack', name: 'Substack' },
  { provider: SourceProvider.ASHBY, externalId: 'cluely', name: 'Cluely' },
  { provider: SourceProvider.ASHBY, externalId: 'everis', name: 'Everis' },
  { provider: SourceProvider.ASHBY, externalId: 'vibe', name: 'Vibe' },
  { provider: SourceProvider.ASHBY, externalId: 'sierra', name: 'Sierra' },
  { provider: SourceProvider.ASHBY, externalId: 'cohere', name: 'Cohere' },
  { provider: SourceProvider.ASHBY, externalId: 'supabase', name: 'Supabase' },
  { provider: SourceProvider.ASHBY, externalId: 'norm-ai', name: 'Norm AI' },
  { provider: SourceProvider.ASHBY, externalId: 'atticus', name: 'Atticus' },
  {
    provider: SourceProvider.ASHBY,
    externalId: 'develop-health',
    name: 'Develop Health',
  },
  { provider: SourceProvider.ASHBY, externalId: 'tenexlabs', name: 'Tenex Labs' },
  {
    provider: SourceProvider.ASHBY,
    externalId: 'ironcladhq',
    name: 'Ironclad',
  },
  { provider: SourceProvider.ASHBY, externalId: 'valon', name: 'Valon' },
  { provider: SourceProvider.ASHBY, externalId: 'mercor', name: 'Mercor' },
  { provider: SourceProvider.ASHBY, externalId: 'kalshi', name: 'Kalshi' },
  { provider: SourceProvider.ASHBY, externalId: 'auctor', name: 'Auctor' },
  { provider: SourceProvider.ASHBY, externalId: 'modernfi', name: 'ModernFi' },
  {
    provider: SourceProvider.ASHBY,
    externalId: 'mechanize',
    name: 'Mechanize',
  },
  { provider: SourceProvider.ASHBY, externalId: 'zania', name: 'Zania' },
  {
    provider: SourceProvider.ASHBY,
    externalId: 'adaptivesecurity',
    name: 'Adaptive Security',
  },
  { provider: SourceProvider.ASHBY, externalId: 'tandem', name: 'Tandem' },
  { provider: SourceProvider.ASHBY, externalId: 'replit', name: 'Replit' },
  { provider: SourceProvider.ASHBY, externalId: 'middesk', name: 'Middesk' },
  { provider: SourceProvider.ASHBY, externalId: 'sesame', name: 'Sesame' },
  { provider: SourceProvider.ASHBY, externalId: 'opal', name: 'Opal' },
  { provider: SourceProvider.ASHBY, externalId: 'rillet', name: 'Rillet' },
  {
    provider: SourceProvider.ASHBY,
    externalId: 'benchling',
    name: 'Benchling',
  },
  { provider: SourceProvider.ASHBY, externalId: 'eliseai', name: 'Elise AI' },

  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'telesign',
    name: 'TeleSign',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'brainrocketltd',
    name: 'BrainRocket',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'sofiastars',
    name: 'Sofia Stars',
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
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'chainguard',
    name: 'Chainguard',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'recursionpharmaceuticals',
    name: 'Recursion Pharmaceuticals',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'distantjob',
    name: 'DistantJob',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'pointwild',
    name: 'PointWild',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'neoris',
    name: 'NEORIS',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'andurilindustries',
    name: 'Anduril Industries',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'singlestore',
    name: 'SingleStore',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'neo4j',
    name: 'Neo4j',
  },
  {
    provider: SourceProvider.GREENHOUSE,
    externalId: 'equilibriumenergy',
    name: 'Equilibrium Energy',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'headquarters',
    name: 'HeadQuarters',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'flosum',
    name: 'Flosum',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'gomining',
    name: 'GoMining',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'devpro',
    name: 'Dev.Pro',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'fioneer',
    name: 'SAP Fioneer',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'huggingface',
    name: 'Hugging Face',
  },
  { provider: SourceProvider.WORKABLE, externalId: 'rokt', name: 'Rokt' },
  { provider: SourceProvider.WORKABLE, externalId: 'v4c', name: 'V4C' },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'movement-labs',
    name: 'Movement Labs',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'enable-data',
    name: 'Enable Data',
  },
  { provider: SourceProvider.WORKABLE, externalId: 'verneek', name: 'Verneek' },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'keepsafe',
    name: 'Keepsafe',
  },
  { provider: SourceProvider.WORKABLE, externalId: 'mlabs', name: 'MLabs' },
  { provider: SourceProvider.WORKABLE, externalId: 'otiv', name: 'Otiv' },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'blueprint-bryanjohnson',
    name: 'Blueprint (Bryan Johnson)',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'aureol-global-connections',
    name: 'Aureol Global Connections',
  },
  { provider: SourceProvider.WORKABLE, externalId: 'suade', name: 'Suade' },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'civica-uk-ltd-1',
    name: 'Civica UK',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'portless',
    name: 'Portless',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'ordermesh',
    name: 'Ordermesh',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'translution-software',
    name: 'Translution Software',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'newrich-network',
    name: 'NewRich Network',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'destinusgroup',
    name: 'Destinus Group',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'goodvision',
    name: 'GoodVision',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'everypay-1',
    name: 'EveryPay',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'devsinc-17',
    name: 'Devsinc',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'openbet-1',
    name: 'OpenBet',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'upsmith-1',
    name: 'Upsmith',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'pubgenius-1',
    name: 'PubGenius',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'writesonic',
    name: 'Writesonic',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'goodfit',
    name: 'GoodFit',
  },
  {
    provider: SourceProvider.WORKABLE,
    externalId: 'curology',
    name: 'Curology',
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
