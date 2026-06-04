import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { RequestsEntity } from './requests.entity';

@Entity('transcribes')
export class TranscribeEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'input_url', type: 'varchar' })
  inputUrl: string;

  @Column({ name: 'output_url', type: 'varchar', nullable: true })
  outputUrl: string;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @OneToOne(() => RequestsEntity, (requst) => requst.Transcribe)
  requst: RequestsEntity;
}
