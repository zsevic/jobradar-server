import { MigrationInterface, QueryRunner } from 'typeorm';

export class LicenseKeyAndPendingMatchEmails1764008000000 implements MigrationInterface {
  name = 'LicenseKeyAndPendingMatchEmails1764008000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD "licenseKey" character varying
    `);

    await queryRunner.query(`
      CREATE TABLE "pending_match_emails" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "jobId" character varying NOT NULL,
        "score" integer NOT NULL,
        "presetId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pending_match_emails" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pending_match_emails_user_job" UNIQUE ("userId", "jobId"),
        CONSTRAINT "FK_pending_match_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_pending_match_job" FOREIGN KEY ("jobId")
          REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_pending_match_preset" FOREIGN KEY ("presetId")
          REFERENCES "filter_presets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_pending_match_emails_userId"
      ON "pending_match_emails" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_pending_match_emails_userId"`,
    );
    await queryRunner.query(`DROP TABLE "pending_match_emails"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "licenseKey"`);
  }
}
