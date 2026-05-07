import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { FilterPreset } from './filter-preset.entity';
import { Job } from './job.entity';
import { User } from './user.entity';

@Entity('pending_match_emails')
@Unique(['userId', 'jobId'])
export class PendingMatchEmail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar' })
  jobId!: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job!: Job;

  @Column({ type: 'int' })
  score!: number;

  @Column({ type: 'uuid' })
  presetId!: string;

  @ManyToOne(() => FilterPreset, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'presetId' })
  preset!: FilterPreset;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
