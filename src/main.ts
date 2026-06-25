import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import dataSource from './database/data-source';
import { upsertSourceSeeds } from './database/seeds/upsert-source-seeds';

const bootstrapLogger = new Logger('Bootstrap');

async function runDatabaseBootstrap(): Promise<void> {
  const skipMigrations = process.env.SKIP_DB_MIGRATIONS === 'true';
  const skipSeed = process.env.SKIP_SOURCE_SEED === 'true';

  if (skipMigrations && skipSeed) {
    bootstrapLogger.log(
      'SKIP_DB_MIGRATIONS and SKIP_SOURCE_SEED — skipping database bootstrap',
    );
    return;
  }

  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  if (!skipMigrations) {
    bootstrapLogger.log('Running database migrations…');
    const executed = await dataSource.runMigrations();
    bootstrapLogger.log(
      executed.length
        ? `Applied ${executed.length} migration(s): ${executed.map((m) => m.name).join(', ')}`
        : 'Database migrations are up to date',
    );
  } else {
    bootstrapLogger.log(
      'SKIP_DB_MIGRATIONS=true — skipping database migrations on boot',
    );
  }

  if (!skipSeed) {
    bootstrapLogger.log('Upserting source catalog…');
    const count = await upsertSourceSeeds(dataSource);
    bootstrapLogger.log(`Source catalog upserted (${count} sources)`);
  } else {
    bootstrapLogger.log('SKIP_SOURCE_SEED=true — skipping source seed on boot');
  }

  await dataSource.destroy();
}

async function bootstrap() {
  await runDatabaseBootstrap();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
