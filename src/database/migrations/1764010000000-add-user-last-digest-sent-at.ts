import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLastDigestSentAt1764010000000 implements MigrationInterface {
  name = 'AddUserLastDigestSentAt1764010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "lastDigestSentAt" TIMESTAMP WITH TIME ZONE NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "lastDigestSentAt"
    `);
  }
}
