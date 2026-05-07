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

/** `.ts` when loaded via ts-node (CLI); `.js` when compiled to `dist/` (prod app + prod CLI). */
const migrationExtension = __filename.endsWith('.ts') ? 'ts' : 'js';

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
  migrations: [`${__dirname}/migrations/*.${migrationExtension}`],
  synchronize: false,
});
