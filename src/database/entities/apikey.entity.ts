import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import {UserEntity } from './user.entity';

@Entity('api_keys')
export class ApiKeyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'unique_id', type: 'varchar' })
  uniqueId: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'api_key_preview', type: 'varchar' })
  apiKeyPreview: string;

  @Column({ name: 'api_key_hash', type: 'varchar', unique: true })
  apiKeyHash: string;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.apikeys)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'uniqueId' })
  user: UserEntity;
}
