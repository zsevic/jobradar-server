import 'dotenv/config';
import { DataSource } from 'typeorm';
import { FilterPreset } from './entities/filter-preset.entity';
import { Job } from './entities/job.entity';
import { NotificationClick } from './entities/notification-click.entity';
import { NotificationSent } from './entities/notification-sent.entity';
import { PendingMatchEmail } from './entities/pending-match-email.entity';
import { Source } from './entities/source.entity';
import { User } from './entities/user.entity';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run TypeORM migrations');
}

export default new DataSource({
  type: 'postgres',
  url: databaseUrl,
  entities: [
    User,
    Source,
    Job,
    FilterPreset,
    NotificationSent,
    PendingMatchEmail,
    NotificationClick,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
