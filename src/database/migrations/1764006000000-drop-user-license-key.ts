import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUserLicenseKey1764006000000 implements MigrationInterface {
  name = 'DropUserLicenseKey1764006000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "licenseKey"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD "licenseKey" character varying NOT NULL DEFAULT ''
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "licenseKey" DROP DEFAULT
    `);
  }
}
