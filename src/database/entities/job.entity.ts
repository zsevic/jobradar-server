import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { SourceProvider } from './source.entity';

@Entity('jobs')
@Unique(['provider', 'externalId'])
export class Job {
  @PrimaryColumn({ type: 'varchar' })
  id!: string;

  @Column({ type: 'varchar' })
  externalId!: string;

  @Column({
    type: 'enum',
    enum: SourceProvider,
  })
  provider!: SourceProvider;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'varchar' })
  company!: string;

  @Column({ type: 'varchar' })
  location!: string;

  @Column({ type: 'boolean', default: false })
  isRemote!: boolean;

  @Column({ type: 'varchar', nullable: true })
  role!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  stack!: string[];

  @Column({ type: 'varchar', nullable: true })
  seniority!: string | null;

  @Column({ type: 'timestamptz' })
  postedAt!: Date;

  @Column({ type: 'varchar' })
  url!: string;

  @Column({ type: 'varchar', unique: true })
  hash!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
