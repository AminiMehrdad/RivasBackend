import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToOne,
} from 'typeorm';
import { WalletEntity } from './wallet.entity';
import { RequestsEntity } from './requests.entity';

export enum TransactionDirection {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum TransactionType {
  CONSUME = 'CONSUME',
  REFUND = 'REFUND',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
}

export enum TransactionReferenceType {
  REQUEST = 'REQUEST',
}

@Entity('wallet_transactions')
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'unique_id', type: 'varchar', unique: true })
  uniqueId: string;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @Column({ type: 'enum', enum: TransactionDirection })
  direction: TransactionDirection;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  amount: number;

  @Column({ name: 'balance_after', type: 'decimal', precision: 18, scale: 4 })
  balanceAfter: number;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({
    name: 'reference_type',
    type: 'enum',
    enum: TransactionReferenceType,
    default: TransactionReferenceType.REQUEST,
  })
  referenceType: TransactionReferenceType;

  @Column({ name: 'reference_id', type: 'varchar', nullable: true })
  referenceId: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => WalletEntity, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'wallet_id', referencedColumnName: 'uniqueId' })
  wallet: WalletEntity;

  @OneToOne(() => RequestsEntity, (request) => request.walletTransaction, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'reference_id', referencedColumnName: 'uniqueId' })
  request: RequestsEntity | null;
}
