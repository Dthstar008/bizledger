import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Business } from './business.entity';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
