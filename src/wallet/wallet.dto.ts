import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmpty, IsNumber, Min } from "class-validator";

export class TotalCreditResponseDto {
  @ApiProperty({ example: 999460 })
  total_credit: number;
}

export class CreditLogResponseDto {
  @ApiProperty({ example: "wallet-tx-123456" })
  unique_id: string;

  @ApiProperty({ example: 25000 })
  amount: number;

  @ApiProperty({ example: 999460 })
  balance_after: number;


  @ApiProperty({ example: "2026-06-03T09:16:00.000Z" })
  created_at: string;

  @ApiProperty({ example: "1405/03/13 09:16:00" })
  jalaali_create_at: string;
}

export class CreditLogsResponseDto {
  @ApiProperty({ type: CreditLogResponseDto, isArray: true })
  logs: CreditLogResponseDto[];
}

export class IncreaseWalletDto {
  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Value should not be empty' })
  @IsNumber({}, { message: 'Value must be a number' })
  @Min(500000, { message: 'Value must be at least 500,000'}) 
  value: number;
}

export class IncreaseWalletResponseDto {
  @ApiProperty({ example: "request-uuid" })
  request_id: string;

  @ApiProperty({ example: "wallet-tx-uuid" })
  transaction_id: string;

  @ApiProperty({ example: 1500000 })
  balance_after: number;
}
