import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJobRoleColumn1764004000000 implements MigrationInterface {
  name = 'AddJobRoleColumn1764004000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN "role" character varying
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_jobs_role" ON "jobs" ("role")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_jobs_role"`);
    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN "role"
    `);
  }
}
