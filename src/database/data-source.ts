import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Job } from './entities/job.entity';
import { Source } from './entities/source.entity';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run TypeORM migrations');
}

/** `.ts` when loaded via ts-node (CLI); `.js` when compiled to `dist/` (prod app + prod CLI). */
const migrationExtension = __filename.endsWith('.ts') ? 'ts' : 'js';

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [Source, Job],
  migrations: [`${__dirname}/migrations/*.${migrationExtension}`],
  synchronize: false,
});
