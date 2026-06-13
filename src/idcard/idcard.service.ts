import { Injectable } from '@nestjs/common';
import { CreateIdcardDto } from './dto/create-idcard.dto';
import { UpdateIdcardDto } from './dto/update-idcard.dto';

@Injectable()
export class IdcardService {
  create(createIdcardDto: CreateIdcardDto) {
    return 'This action adds a new idcard';
  }

  findAll() {
    return `This action returns all idcard`;
  }

  findOne(id: number) {
    return `This action returns a #${id} idcard`;
  }

  update(id: number, updateIdcardDto: UpdateIdcardDto) {
    return `This action updates a #${id} idcard`;
  }

  remove(id: number) {
    return `This action removes a #${id} idcard`;
  }
}
