import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNormalizedLocationFields1764005000000 implements MigrationInterface {
  name = 'AddNormalizedLocationFields1764005000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD COLUMN "locationRaw" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD COLUMN "locationTokens" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD COLUMN "locationCountries" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD COLUMN "locationRegions" text array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "locationRegions"`);
    await queryRunner.query(
      `ALTER TABLE "jobs" DROP COLUMN "locationCountries"`,
    );
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "locationTokens"`);
    await queryRunner.query(`ALTER TABLE "jobs" DROP COLUMN "locationRaw"`);
  }
}
