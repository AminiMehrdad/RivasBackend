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
import { IdCardRecordEntity } from './idCardRecords.entity';

export enum IdValidationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('id_validations')
export class IdValidationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'unique_id', type: 'varchar' })
  uniqueId: string;

  @Column({ name: 'input_url', type: 'varchar' })
  inputUrl: string;

  @Column({ type: 'int', nullable: true })
  imageSize: number;

  @Column({
    type: 'enum',
    enum: IdValidationStatus,
    default: IdValidationStatus.PENDING,
  })
  status: IdValidationStatus;

  @Column({ name: 'request_id', type: 'varchar' })
  requestId: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => RequestsEntity, (request) => request.idValidation, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id', referencedColumnName: 'uniqueId' })
  request: RequestsEntity;

  @OneToOne(
    () => IdCardRecordEntity,
    (idCardRecord) => idCardRecord.idValidation,
  )
  idCardRecord: IdCardRecordEntity | null;
}
