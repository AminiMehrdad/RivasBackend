import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, Index} from 'typeorm';
import { RequestsEntity } from './requests.entity';

@Entity('transcribes')
export class TranscribeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: "unique_id", type: "varchar" })
  uniqueId: string

  @Column({ name: 'input_url', type: 'varchar' })
  inputUrl: string;

  @Column({ name: 'output_url', type: 'varchar', nullable: true })
  outputUrl: string;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @Column({ type: 'varchar', nullable: true })
  status: string;

  @Column({ name: 'request_id', type: 'varchar' })
  requestId: string;

  @OneToOne(() => RequestsEntity, (request) => request.Transcribe)
  @JoinColumn({ name: 'request_id', referencedColumnName: 'unique_id' })
  request: RequestsEntity;
}
