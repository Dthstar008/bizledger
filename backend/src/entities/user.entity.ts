import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Business } from './business.entity';
import { Branch } from './branch.entity';

export enum Role {
  OWNER = 'owner',
  STAFF = 'staff',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  name?: string;

  /**
   * When the user confirmed they're 18+ at registration. Nullable because
   * accounts created before this field existed have no value — never
   * backfill this with a fabricated date, since the whole point is an
   * honest record of when consent was actually given. Every new
   * registration sets it; a self-attestation boolean rather than
   * collecting an actual birthdate, per data-minimization.
   */
  @Column({ type: 'timestamptz', nullable: true })
  ageConfirmedAt?: Date;

  @ManyToOne(() => Business, (business) => business.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column()
  businessId: string;

  @Column({ type: 'enum', enum: Role, default: Role.OWNER })
  role: Role;

  /** Staff are pinned to one branch; owners leave this null and pick per request. */
  @ManyToOne(() => Branch, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  @Column({ type: 'uuid', nullable: true })
  branchId?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
