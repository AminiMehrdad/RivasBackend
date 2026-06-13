import { PartialType } from '@nestjs/swagger';
import { CreateIdcardDto } from './create-idcard.dto';

export class UpdateIdcardDto extends PartialType(CreateIdcardDto) {}
