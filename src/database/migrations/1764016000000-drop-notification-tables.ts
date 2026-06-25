import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropNotificationTables1764016000000 implements MigrationInterface {
  name = 'DropNotificationTables1764016000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_clicks_jobId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_clicks_userId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_clicks_userId_clickedAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_clicks"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pending_match_emails_userId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pending_match_emails_userId_score_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "pending_match_emails"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "notifications_sent"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "filter_presets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "githubId" character varying,
        "githubLogin" character varying,
        "lastDigestSentAt" TIMESTAMP,
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_users_githubLogin" ON "users" ("githubLogin")
    `);

    await queryRunner.query(`
      CREATE TABLE "filter_presets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "role" character varying NOT NULL,
        "stack" text array NOT NULL DEFAULT '{}',
        "seniority" character varying NOT NULL,
        "locations" text array NOT NULL DEFAULT '{}',
        "alertsEnabled" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_filter_presets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ef64f8f6433e036fd9d1c3e88" UNIQUE ("userId"),
        CONSTRAINT "FK_ef64f8f6433e036fd9d1c3e88" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications_sent" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "jobId" character varying NOT NULL,
        "sentAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_sent" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_5f204845644fb7ce3cf4e267f5f" UNIQUE ("userId", "jobId"),
        CONSTRAINT "FK_5f204845644fb7ce3cf4e267f5f_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_5f204845644fb7ce3cf4e267f5f_job" FOREIGN KEY ("jobId")
          REFERENCES "jobs"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "pending_match_emails" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "jobId" character varying NOT NULL,
        "presetId" uuid NOT NULL,
        "score" integer NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pending_match_emails" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pending_match_emails_user_job" UNIQUE ("userId", "jobId"),
        CONSTRAINT "FK_pending_match_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pending_match_job" FOREIGN KEY ("jobId")
          REFERENCES "jobs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_pending_match_preset" FOREIGN KEY ("presetId")
          REFERENCES "filter_presets"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pending_match_emails_userId"
      ON "pending_match_emails" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pending_match_emails_userId_score_createdAt"
      ON "pending_match_emails" ("userId", "score" DESC, "createdAt" ASC)
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_clicks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "jobId" character varying NOT NULL,
        "clickedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_clicks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_clicks_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_notification_clicks_job" FOREIGN KEY ("jobId")
          REFERENCES "jobs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_clicks_userId"
      ON "notification_clicks" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notification_clicks_jobId"
      ON "notification_clicks" ("jobId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_clicks_userId_clickedAt"
      ON "notification_clicks" ("userId", "clickedAt" DESC)
    `);
  }
}
