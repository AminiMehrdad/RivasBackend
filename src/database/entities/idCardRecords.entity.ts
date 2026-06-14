import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { IdValidationEntity } from './idValidation.entity';

@Entity('id_card_records')
export class IdCardRecordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'unique_id', type: 'varchar' })
  uniqueId: string;

  @Column({ name: 'id_code_card', type: 'varchar', unique: true })
  idCodeCard: string;

  @Column({ name: 'image_url', type: 'varchar' })
  imageUrl: string;

  @Column({ name: 'first_name', type: 'varchar' })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar' })
  lastName: string;

  @Column({ name: 'birth_date', type: 'varchar' })
  birthDate: string;

  @Column({ name: 'fathers_name', type: 'varchar' })
  fathersName: string;

  @Column({ name: 'expiration_date', type: 'varchar' })
  expirationDate: string;

  @Column({ name: 'id_validation_id', type: 'varchar' })
  idValidationId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToOne(
    () => IdValidationEntity,
    (idValidation) => idValidation.idCardRecord,
    {
      nullable: false,
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'id_validation_id', referencedColumnName: 'uniqueId' })
  idValidation: IdValidationEntity;
}
