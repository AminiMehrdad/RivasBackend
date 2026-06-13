import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, Index, CreateDateColumn } from 'typeorm';
import { RequestsEntity } from './requests.entity';
import { IdValidationEntity } from './idValidation.entity';

@Entity('id_records')
export class IdRecordsEntity     {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: "unique_id", type: "varchar" })
  uniqueId: string

  @Column({ name: 'id_code_card', type: 'int', unique: true })
  idCodeCard: number;

  @Column({ name: 'image_url', type: 'varchar' })
  imageUrl: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'lastname', type: 'varchar' })
  lastname: string;

  @Column({ name: 'birthday', type: 'varchar' })
  birthday: string;

  @Column({ name: 'fathers_name', type: 'varchar' })
  fathersName: string;

  @Column({ name: 'expirename', type: 'varchar' })
  expireName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(() => RequestsEntity, (request) => request.idValidation)
  @JoinColumn({ name: 'request_id', referencedColumnName: 'uniqueId' })
  request: RequestsEntity;

  @OneToOne(() => IdValidationEntity, (idValidation) => idValidation.requestByUniqueId)
  idValidation: IdValidationEntity;
}
