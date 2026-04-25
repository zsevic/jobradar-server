import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFiltersAndNotifications1764002000000 implements MigrationInterface {
  name = 'AddFiltersAndNotifications1764002000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "filter_presets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "role" character varying NOT NULL,
        "stack" text array NOT NULL DEFAULT '{}',
        "seniority" character varying NOT NULL,
        "locations" text array NOT NULL DEFAULT '{}',
        "alertsEnabled" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_7fc157005eb3f151fdac5f2d3f4" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ef64f8f6433e036fd9d2d1c3e88" UNIQUE ("userId"),
        CONSTRAINT "FK_ef64f8f6433e036fd9d2d1c3e88" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications_sent" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "jobId" character varying NOT NULL,
        "sentAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_b436f4103a6f8866b1880f019d4" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_5f204845644fb7ce3cf4e267f5f" UNIQUE ("userId", "jobId"),
        CONSTRAINT "FK_5f204845644fb7ce3cf4e267f5f_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_5f204845644fb7ce3cf4e267f5f_job" FOREIGN KEY ("jobId")
          REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications_sent"`);
    await queryRunner.query(`DROP TABLE "filter_presets"`);
  }
}
