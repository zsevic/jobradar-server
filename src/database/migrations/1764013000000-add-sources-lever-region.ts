import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourcesLeverRegion1764013000000 implements MigrationInterface {
  name = 'AddSourcesLeverRegion1764013000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sources"
      ADD COLUMN IF NOT EXISTS "api_region" character varying
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          WHERE t.relname = 'sources'
            AND c.conname = 'CHK_sources_api_region'
        ) THEN
          ALTER TABLE "sources"
          ADD CONSTRAINT "CHK_sources_api_region"
          CHECK ("api_region" IS NULL OR "api_region" = 'eu');
        END IF;
      END $$;
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
