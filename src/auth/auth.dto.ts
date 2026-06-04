import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsPhoneNumber, IsString, Length } from 'class-validator';
import { UserRole } from '../database/entities/user.entity';

export class RequestOtpDto {
  @ApiProperty({ example: '+989121234567' })
  @IsPhoneNumber()
  phoneNumber: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+989121234567' })
  @IsPhoneNumber()
  phoneNumber: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class RefreshTokenDto {
  @ApiProperty({ required: false, description: 'Opaque refresh token. If omitted, the httpOnly cookie is used.' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class LogoutDto {
  @ApiProperty({ required: false, description: 'Refresh token to revoke. If omitted, the httpOnly cookie is used.' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class OtpResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Verification code sent.' })
  message: string;
}

export class AuthUserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  phoneNumber: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;
}

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user: AuthUserResponseDto;

  @ApiProperty({ type: AuthTokensResponseDto })
  tokens: AuthTokensResponseDto;
}

export class RefreshResponseDto {
  @ApiProperty({ type: AuthTokensResponseDto })
  tokens: AuthTokensResponseDto;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}
