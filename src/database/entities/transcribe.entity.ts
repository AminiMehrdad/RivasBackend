import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { RequestsEntity } from './requests.entity';

export enum TranscriptionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('transcribes')
export class TranscribeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'unique_id', type: 'varchar' })
  uniqueId: string;

  @Column({ name: 'input_url', type: 'varchar' })
  inputUrl: string;

  @Column({ name: 'output_url', type: 'varchar', nullable: true })
  outputUrl: string | null;

  @Column({ type: 'int', nullable: true })
  duration: number | null;

  @Column({
    type: 'enum',
    enum: TranscriptionStatus,
    default: TranscriptionStatus.PENDING,
  })
  status: TranscriptionStatus;

  @Column({ name: 'request_id', type: 'varchar' })
  requestId: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => RequestsEntity, (request) => request.transcribe, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id', referencedColumnName: 'uniqueId' })
  request: RequestsEntity;
}
