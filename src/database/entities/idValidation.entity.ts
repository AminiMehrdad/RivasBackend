import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { RequestsEntity } from './requests.entity';
import { IdRecordsEntity } from './idCardRecords.entity';

export enum TranscriptionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('id_validation')
export class IdValidationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: "unique_id", type: "varchar" })
  uniqueId: string

  @Column({ name: 'input_url', type: 'varchar' })
  inputUrl: string;

  @Column({ type: 'int', nullable: true })
  imageSize: number;

  @Column({
    type: 'enum',
    enum: TranscriptionStatus,
    default: TranscriptionStatus.PENDING,
  })
  status: TranscriptionStatus;

  @Column({ name: "id_code_card", type: "int", unique: true, nullable: true })
  idCodeCard: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => RequestsEntity, (request) => request.idValidation, {
    nullable: false,
  })
  request: RequestsEntity;

  @OneToOne(() => IdRecordsEntity, (idRecord) => idRecord.request)
  @JoinColumn({ name: 'id_record_id', referencedColumnName: 'uniqueId' })
  requestByUniqueId: RequestsEntity;  
}
