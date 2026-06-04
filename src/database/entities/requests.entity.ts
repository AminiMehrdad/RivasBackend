import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn,
  OneToOne,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { TranscribeEntity } from './transcribe.entity';
import { transcode } from 'buffer';
import { WalletTransactionEntity } from './walletTransaction.entity';

export enum RequestStatus {
  PROCESSING = 'PROCESSING',
  FAILED     = 'FAILED',
  SUCCEED    = 'SUCCEED',
}

@Entity('requests')
export class RequestsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'unique_id', type: 'varchar', unique: true })
  uniqueId: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  cost: number;

  @Column({ name: 'module_type', type: 'varchar' })
  moduleType: string;

  @Column({ name: 'module_id' })
  moduleId: number;

  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.PROCESSING })
  status: RequestStatus;

  @Column({ name: 'succeed_at', type: 'timestamp', nullable: true })
  succeedAt: Date;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.requests)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToOne(() => TranscribeEntity, (Transcribe) => Transcribe.requst)
  @JoinColumn( {name: "module_id"})
  Transcribe: TranscribeEntity

  @OneToOne(() => WalletTransactionEntity, (walletTranscription) => walletTranscription.requst)
  walletTranscription:WalletTransactionEntity
}
