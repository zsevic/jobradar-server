import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourcesLeverRegion1764013000000 implements MigrationInterface {
  name = 'AddSourcesLeverRegion1764013000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sources"
      ADD COLUMN IF NOT EXISTS "api_region" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "sources"
      ADD CONSTRAINT "CHK_sources_api_region"
      CHECK ("api_region" IS NULL OR "api_region" = 'eu')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "CHK_sources_api_region"
    `);
    await queryRunner.query(`
      ALTER TABLE "sources" DROP COLUMN IF EXISTS "api_region"
    `);
  }
}
