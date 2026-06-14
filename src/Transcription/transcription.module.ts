import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { INJECTION_TOKENS } from 'src/common/constants/injection-tokens';
import { TypeOrmRequestRepository } from 'src/database/Repos/requests.repo';
import { TypeOrmTranscribeRepository } from 'src/database/Repos/transcribe.repo';
import { TypeOrmWalletRepository } from 'src/database/Repos/wallet.repo';
import { TypeOrmWalletTransactionRepository } from 'src/database/Repos/walletTransaction.repo';
import { RequestsEntity } from 'src/database/entities/requests.entity';
import { TranscribeEntity } from 'src/database/entities/transcribe.entity';
import { WalletEntity } from 'src/database/entities/wallet.entity';
import { WalletTransactionEntity } from 'src/database/entities/walletTransaction.entity';
import { SpeechToTextService } from './speech-to-text.service';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionService } from './transcription.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TranscribeEntity,
      RequestsEntity,
      WalletEntity,
      WalletTransactionEntity,
    ]),
  ],
  controllers: [TranscriptionController],
  providers: [
    TranscriptionService,
    SpeechToTextService,
    {
      provide: INJECTION_TOKENS.TRANSCRIBE_REPOSITORY,
      useClass: TypeOrmTranscribeRepository,
    },
    {
      provide: INJECTION_TOKENS.REQUEST_REPOSITORY,
      useClass: TypeOrmRequestRepository,
    },
    {
      provide: INJECTION_TOKENS.WALLET_REPOSITORY,
      useClass: TypeOrmWalletRepository,
    },
    {
      provide: INJECTION_TOKENS.WALLET_TRANSACTION_REPOSITORY,
      useClass: TypeOrmWalletTransactionRepository,
    },
  ],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
