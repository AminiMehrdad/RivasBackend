import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
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

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;



  @OneToMany(() => RequestsEntity, (request) => request.user)
  requests: RequestsEntity[];

  @OneToMany(() => ApiKeyEntity, (apikey) => apikey.user)
  apikeys: ApiKeyEntity[];

  @OneToOne(() => WalletEntity, (wallet) => wallet.user)
  wallet: WalletEntity;
}
