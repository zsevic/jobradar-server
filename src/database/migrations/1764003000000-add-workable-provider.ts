import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkableProvider1764003000000 implements MigrationInterface {
  name = 'AddWorkableProvider1764003000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."sources_provider_enum" ADD VALUE IF NOT EXISTS 'workable'
    `);
    await queryRunner.query(`
      ALTER TYPE "public"."jobs_provider_enum" ADD VALUE IF NOT EXISTS 'workable'
    `);
  }

  public async down(): Promise<void> {
    // PostgreSQL enum values cannot be removed safely in down migrations.
  }
}
