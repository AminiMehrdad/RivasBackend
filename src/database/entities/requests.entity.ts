import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { TranscribeEntity } from './transcribe.entity';
import { WalletTransactionEntity } from './walletTransaction.entity';
import { IdValidationEntity } from './idValidation.entity';

export enum RequestStatus {
  PROCESSING = 'PROCESSING',
  FAILED = 'FAILED',
  SUCCEED = 'SUCCEED',
}

export enum ModuleType {
  WALLET_TOP_UP = 'WALLET_TOP_UP',
  TRANSCRIPTION = 'TRANSCRIPTION',
  ID_VALIDATION = 'ID_VALIDATION',
}

@Entity('requests')
export class RequestsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'unique_id', type: 'varchar', unique: true })
  uniqueId: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  cost: number;

  @Column({ type: 'enum', enum: ModuleType })
  moduleType: ModuleType;

  @Column({ name: 'module_id', type: 'varchar', nullable: true })
  moduleId: string | null;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PROCESSING,
  })
  status: RequestStatus;

  @Column({ name: 'succeed_at', type: 'datetime', nullable: true })
  succeedAt: Date | null;

  @Column({ name: 'failed_at', type: 'datetime', nullable: true })
  failedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'transcribe_id', type: 'varchar', nullable: true })
  transcribeId: string | null;

  @Column({ name: 'id_validation_id', type: 'varchar', nullable: true })
  idValidationId: string | null;

  @Column({ name: 'wallet_transaction_id', type: 'varchar', nullable: true })
  walletTransactionId: string | null;

  @ManyToOne(() => UserEntity, (user) => user.requests)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'uniqueId' })
  user: UserEntity;

  @OneToOne(() => TranscribeEntity, (transcribe) => transcribe.request)
  transcribe: TranscribeEntity;

  @OneToOne(
    () => WalletTransactionEntity,
    (walletTransaction) => walletTransaction.request,
  )
  walletTransaction: WalletTransactionEntity;

  @OneToOne(() => IdValidationEntity, (idValidation) => idValidation.request)
  idValidation: IdValidationEntity;
}
