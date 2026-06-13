import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { IdcardService } from './idcard.service';
import { CreateIdcardDto } from './dto/create-idcard.dto';
import { UpdateIdcardDto } from './dto/update-idcard.dto';

@Controller('idcard')
export class IdcardController {
  constructor(private readonly idcardService: IdcardService) {}

  @Post()
  create(@Body() createIdcardDto: CreateIdcardDto) {
    return this.idcardService.create(createIdcardDto);
  }

  @Get()
  findAll() {
    return this.idcardService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.idcardService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateIdcardDto: UpdateIdcardDto) {
    return this.idcardService.update(+id, updateIdcardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.idcardService.remove(+id);
  }
}
