import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

export enum SourceProvider {
  ASHBY = 'ashby',
  GREENHOUSE = 'greenhouse',
  WORKABLE = 'workable',
  LEVER = 'lever',
}

@Entity('sources')
@Unique(['provider', 'externalId'])
export class Source {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({
    type: 'enum',
    enum: SourceProvider,
  })
  provider!: SourceProvider;

  @Column({ type: 'varchar' })
  externalId!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastSyncedAt!: Date | null;

  @Column({ type: 'varchar', default: 'idle' })
  syncStatus!: string;

  /** Optional ATS API region (e.g. Lever EU host when `eu`). Null = provider default. */
  @Column({ type: 'varchar', nullable: true, name: 'api_region' })
  apiRegion!: 'eu' | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
