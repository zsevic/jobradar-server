import { MigrationInterface, QueryRunner } from 'typeorm';

export class JobSenioritiesArray1764007000000 implements MigrationInterface {
  name = 'JobSenioritiesArray1764007000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN "seniorities" text array NOT NULL DEFAULT '{}'
    `);
    await queryRunner.query(`
      UPDATE "jobs"
      SET "seniorities" = ARRAY["seniority"]::text[]
      WHERE "seniority" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN "seniority"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN "seniority" character varying
    `);
    await queryRunner.query(`
      UPDATE "jobs"
      SET "seniority" = "seniorities"[1]
      WHERE cardinality("seniorities") > 0
    `);
    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN "seniorities"
    `);
  }
}
