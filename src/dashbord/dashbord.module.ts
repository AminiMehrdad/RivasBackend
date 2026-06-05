import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { INJECTION_TOKENS } from '../common/constants/injection-tokens';
import { EnvConfig } from '../config/env.schema';
import { RequestsEntity } from '../database/entities/requests.entity';
import { TranscribeEntity } from '../database/entities/transcribe.entity';
import { UserEntity } from '../database/entities/user.entity';
import { DashbordService } from './dashbord.service';
import { DashbordController } from './dashbord.controller';
import { TypeOrmDashbordRepository } from './dashbord.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RequestsEntity, TranscribeEntity]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => ({
        secret: configService.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [DashbordController],
  providers: [
    DashbordService,
    {
      provide: INJECTION_TOKENS.DASHBORD_REPOSITORY,
      useClass: TypeOrmDashbordRepository,
    }
  ],
})
export class DashboardModule  {

}
