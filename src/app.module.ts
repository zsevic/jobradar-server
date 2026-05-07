import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import { envValidationSchema } from './config/env.validation';
import { FilterPreset } from './database/entities/filter-preset.entity';
import { Job } from './database/entities/job.entity';
import { NotificationClick } from './database/entities/notification-click.entity';
import { NotificationSent } from './database/entities/notification-sent.entity';
import { PendingMatchEmail } from './database/entities/pending-match-email.entity';
import { Source } from './database/entities/source.entity';
import { User } from './database/entities/user.entity';
import { JobsModule } from './jobs/jobs.module';
import { OnboardingModule } from './onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
      validationSchema: envValidationSchema,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigType<typeof databaseConfig>) => ({
        type: 'postgres',
        url: config.url,
        entities: [
          User,
          Source,
          Job,
          FilterPreset,
          NotificationSent,
          PendingMatchEmail,
          NotificationClick,
        ],
        synchronize: false,
      }),
      inject: [databaseConfig.KEY],
    }),
    BullModule.forRootAsync({
      useFactory: (config: ConfigType<typeof redisConfig>) => {
        const redisUrl = new URL(config.url);
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            username: redisUrl.username || undefined,
            password: redisUrl.password || undefined,
            db: redisUrl.pathname ? Number(redisUrl.pathname.slice(1)) || 0 : 0,
          },
        };
      },
      inject: [redisConfig.KEY],
    }),
    AuthModule,
    JobsModule,
    OnboardingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
