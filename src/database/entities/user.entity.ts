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

  /** Gumroad license key (for re-verification before sending digest emails). */
  @Column({ type: 'varchar', nullable: true })
  licenseKey!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
