import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationClicks1764009000000 implements MigrationInterface {
  name = 'AddNotificationClicks1764009000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notification_clicks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "jobId" character varying NOT NULL,
        "userAgent" character varying,
        "ipAddress" character varying,
        "clickedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_clicks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notification_clicks_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_notification_clicks_job" FOREIGN KEY ("jobId")
          REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_clicks_jobId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_clicks_userId"`,
    );
    await queryRunner.query(`DROP TABLE "notification_clicks"`);
  }
}
