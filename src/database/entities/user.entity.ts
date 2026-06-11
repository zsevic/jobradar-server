import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  githubId!: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  githubLogin!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  /** Set after each successful digest email; used with createdAt to filter jobs by postedAt. */
  @Column({ type: 'timestamptz', nullable: true })
  lastDigestSentAt!: Date | null;
}
