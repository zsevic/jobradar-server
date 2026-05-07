import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRetrievalIndexes1764011000000 implements MigrationInterface {
  name = 'AddRetrievalIndexes1764011000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_postedAt"
      ON "jobs" ("postedAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_role_postedAt"
      ON "jobs" ("role", "postedAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_locationCountries_gin"
      ON "jobs" USING GIN ("locationCountries")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_stack_gin"
      ON "jobs" USING GIN ("stack")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_jobs_seniorities_gin"
      ON "jobs" USING GIN ("seniorities")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pending_match_emails_userId_score_createdAt"
      ON "pending_match_emails" ("userId", "score" DESC, "createdAt" ASC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_clicks_userId_clickedAt"
      ON "notification_clicks" ("userId", "clickedAt" DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_sources_provider_isActive_name"
      ON "sources" ("provider", "isActive", "name")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_sources_provider_isActive_name"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_clicks_userId_clickedAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pending_match_emails_userId_score_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_seniorities_gin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_stack_gin"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_jobs_locationCountries_gin"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_role_postedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_postedAt"`);
  }
}
