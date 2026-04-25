import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigType<typeof databaseConfig>) => ({
        type: 'postgres',
        url: config.url,
        autoLoadEntities: true,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
