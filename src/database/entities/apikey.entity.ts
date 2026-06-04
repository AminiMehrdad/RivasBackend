import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import {UserEntity } from './user.entity';

@Entity('api_keys')
export class ApiKeyEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'api_key_preview', type: 'varchar' })
  apiKeyPreview: string;

  @Column({ name: 'api_key_hash', type: 'varchar', unique: true })
  apiKeyHash: string;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.apikeys)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
