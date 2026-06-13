import { Module } from '@nestjs/common';
import { IdcardService } from './idcard.service';
import { IdcardController } from './idcard.controller';

@Module({
  controllers: [IdcardController],
  providers: [IdcardService],
})
export class IdcardModule {}
