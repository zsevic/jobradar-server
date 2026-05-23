import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLeverProvider1764012000000 implements MigrationInterface {
  name = 'AddLeverProvider1764012000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."sources_provider_enum" ADD VALUE IF NOT EXISTS 'lever'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."jobs_provider_enum" ADD VALUE IF NOT EXISTS 'lever'
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values cannot be removed safely in down migrations.
  }
}
