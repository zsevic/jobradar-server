import { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenJobProvider1764001000000 implements MigrationInterface {
  name = 'HardenJobProvider1764001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."jobs_provider_enum" AS ENUM('ashby', 'greenhouse')
    `);
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ALTER COLUMN "provider" TYPE "public"."jobs_provider_enum"
      USING "provider"::"public"."jobs_provider_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD CONSTRAINT "UQ_39d72e85341ca39e8a47be8dd64" UNIQUE ("provider", "externalId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "jobs" DROP CONSTRAINT "UQ_39d72e85341ca39e8a47be8dd64"
    `);
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ALTER COLUMN "provider" TYPE character varying
      USING "provider"::text
    `);
    await queryRunner.query(`DROP TYPE "public"."jobs_provider_enum"`);
  }
}
