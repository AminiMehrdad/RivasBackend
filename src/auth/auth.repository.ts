import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { randomUUID } from 'crypto';
import { WalletEntity, WalletType } from 'src/database/entities/wallet.entity';

export interface CreateUserInput {
  phoneNumber: string;
}

export interface AuthRepository {
  findByPhoneNumber(phoneNumber: string): Promise<UserEntity | null>;
  findById(uniqueId: string): Promise<UserEntity | null>;
  createUser(input: CreateUserInput): Promise<UserEntity>;
  update(uniqueId: string, data: Partial<UserEntity>): Promise<void>;
  createWallet(userId: string): Promise<void>;
}

@Injectable()
export class TypeOrmAuthRepository implements AuthRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
    @InjectRepository(WalletEntity)
    private readonly wallteRepo: Repository<WalletEntity>
  ) { }

  findByPhoneNumber(phoneNumber: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { phoneNumber } });
  }

  findById(uniqueId: string): Promise<UserEntity | null> {
    return this.repository.findOne({ where: { uniqueId } });
  }

  async createUser(input: CreateUserInput): Promise<UserEntity> {
    const id = randomUUID();
    const user = this.repository.create({
      uniqueId: id,
      phoneNumber: input.phoneNumber,
      lastSeenAt: new Date(),
    });

    return this.repository.save(user);
  }

  async update(uniqueId: string, data: Partial<UserEntity>): Promise<void> {
    await this.repository.update({ uniqueId }, data);
  }

  async createWallet(userId: string): Promise<void> {
    const user = await this.repository.findOne({ where: { uniqueId: userId } });

    if (!user) {
      throw new Error(`User with Id ${userId} not found.`);
    }

    const wallet = this.wallteRepo.create({
      uniqueId: randomUUID(),
      userId: user.uniqueId,
      user: user,
      balance: 0,
      type: WalletType.MAIN,
    });

    await this.wallteRepo.save(wallet);
  }
}
