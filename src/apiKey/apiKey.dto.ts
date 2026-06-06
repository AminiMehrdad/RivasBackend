 import { ApiProperty } from '@nestjs/swagger';
 import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
 import { Type } from 'class-transformer';
 
 export class CreateApiKeyDto {
   @ApiProperty({ example: 'My Production API Key', required: false })
   @IsOptional()
   @IsString()
   name?: string;
 
   @ApiProperty({ example: 90, description: 'Expiry in days', required: false })
   @IsOptional()
   @IsNumber()
   @Min(1)
   @Type(() => Number)
   expiresInDays?: number;
 }
 
 export class CreateApiKeyResponseDto {
   @ApiProperty({ example: 'sk_live_1234567890abcdef...', description: 'API key shown only once' })
   apiKey: string;
 
   @ApiProperty({ example: 'uuid-123' })
   id: string;
 
   @ApiProperty({ example: 'abcd', description: 'Last 4 characters for identification' })
   hint: string;
 
   @ApiProperty({ example: '2024-09-01T00:00:00.000Z', required: false })
   expiresAt?: Date;
 
   @ApiProperty({ example: '2024-06-01T00:00:00.000Z' })
   createdAt: Date;
 }
 
 export class ApiKeyListItemDto {
   @ApiProperty({ example: 'uuid-123' })
   id: string;
 
   @ApiProperty({ example: 'unique-id-123' })
   uniqueId: string;
 
   @ApiProperty({ example: 'My Production API Key' })
   name: string;
 
   @ApiProperty({ example: 'abcd', description: 'Last 4 characters' })
   apiKeyPreview: string;
 
   @ApiProperty({ example: '2024-06-01T00:00:00.000Z', required: false })
   deletedAt?: Date;
 
   @ApiProperty({ example: '2024-06-01T00:00:00.000Z' })
   createdAt: Date;
 }
 
 export class ApiKeyListResponseDto {
   @ApiProperty({ type: [ApiKeyListItemDto] })
   keys: ApiKeyListItemDto[];
 }
 
 export class RevokeApiKeyResponseDto {
   @ApiProperty({ example: true })
   success: boolean;
 
   @ApiProperty({ example: 'API key revoked successfully' })
   message: string;
 }
