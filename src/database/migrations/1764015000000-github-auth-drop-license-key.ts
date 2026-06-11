import { MigrationInterface, QueryRunner } from 'typeorm';

export class GithubAuthDropLicenseKey1764015000000 implements MigrationInterface {
  name = 'GithubAuthDropLicenseKey1764015000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "licenseKey"`,
    );
    await queryRunner.query(`
      ALTER TABLE "users" ADD "githubId" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD "githubLogin" character varying
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_users_githubId" ON "users" ("githubId")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_users_githubLogin" ON "users" ("githubLogin")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_githubLogin"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_githubId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "githubLogin"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "githubId"`);
    await queryRunner.query(`
      ALTER TABLE "users" ADD "licenseKey" character varying
    `);
  }
}
