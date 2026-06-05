import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, OneToMany, JoinColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { WalletTransactionEntity } from './walletTransaction.entity';

export enum WalletType {
  MAIN = 'MAIN',
}

@Entity('wallets')
export class WalletEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({unique: true})
  @Column({ name: "unique_id", type: "varchar"})
  uniqueId: string

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: WalletType, default: WalletType.MAIN })
  type: WalletType;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  balance: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => UserEntity, (user) => user.wallets)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'uniqueId' })
  user: UserEntity;

  @OneToMany(() => WalletTransactionEntity, (tx) => tx.wallet)
  @JoinColumn({ name: 'unique_id', referencedColumnName: 'walletId' })
  transactions: WalletTransactionEntity[];
}
