import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1764000000000 implements MigrationInterface {
  name = 'InitialSchema1764000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TYPE "public"."sources_provider_enum" AS ENUM('ashby', 'greenhouse')
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "licenseKey" character varying NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sources" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "provider" "public"."sources_provider_enum" NOT NULL,
        "externalId" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastSyncedAt" TIMESTAMP WITH TIME ZONE,
        "syncStatus" character varying NOT NULL DEFAULT 'idle',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_13653c2f051f44dd0f3cf766312" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_d3d5a0abcaecac6a4f8f05cc4fb" UNIQUE ("provider", "externalId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "jobs" (
        "id" character varying NOT NULL,
        "externalId" character varying NOT NULL,
        "provider" character varying NOT NULL,
        "title" character varying NOT NULL,
        "company" character varying NOT NULL,
        "location" character varying NOT NULL,
        "isRemote" boolean NOT NULL DEFAULT false,
        "stack" text array NOT NULL DEFAULT '{}',
        "seniority" character varying,
        "postedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "url" character varying NOT NULL,
        "hash" character varying NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_98ab1c14ff8d1cf80d18703b92f" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_d72ea127f30e21753c9e229891f" UNIQUE ("hash")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "jobs"`);
    await queryRunner.query(`DROP TABLE "sources"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."sources_provider_enum"`);
  }
}
