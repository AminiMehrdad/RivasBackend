import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RequestsEntity } from './requests.entity';
import { WalletEntity } from './wallet.entity';
import { ApiKeyEntity } from './apikey.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({unique: true})
  @Column({ name: "unique_id", type: "varchar"})
  uniqueId: string

  @Index({ unique: true })
  @Column({ name: 'phone_number', type: 'varchar', length: 20 })
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'last_seen_at' })
  lastSeenAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;



  @OneToMany(() => RequestsEntity, (requests) => requests.user)
  @JoinColumn({ name: 'unique_id', referencedColumnName: 'userId' })
  requests: RequestsEntity[];

  @OneToMany(() => ApiKeyEntity, (apikey) => apikey.user)
  @JoinColumn({ name: 'unique_id', referencedColumnName: 'userId' })
  apikeys: ApiKeyEntity[];

  @OneToOne(() => WalletEntity, (wallet) => wallet.user)
  @JoinColumn({ name: 'unique_id', referencedColumnName: 'userId' })
  wallets: WalletEntity;
}
