import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameLeverRegionToApiRegion1764014000000 implements MigrationInterface {
  name = 'RenameLeverRegionToApiRegion1764014000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "CHK_sources_lever_region"
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sources'
            AND column_name = 'lever_region'
        ) THEN
          ALTER TABLE "sources" RENAME COLUMN "lever_region" TO "api_region";
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sources'
            AND column_name = 'api_region'
        ) THEN
          ALTER TABLE "sources" ADD COLUMN "api_region" character varying;
        END IF;
      END $$;
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
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'sources'
            AND column_name = 'api_region'
        ) THEN
          ALTER TABLE "sources" RENAME COLUMN "api_region" TO "lever_region";
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "sources"
      ADD CONSTRAINT "CHK_sources_lever_region"
      CHECK ("lever_region" IS NULL OR "lever_region" = 'eu')
    `);
  }
}
