import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Job } from './entities/job.entity';
import { Source } from './entities/source.entity';
import { User } from './entities/user.entity';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run TypeORM migrations');
}

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [User, Source, Job],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
