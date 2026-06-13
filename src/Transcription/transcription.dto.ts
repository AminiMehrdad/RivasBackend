import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TranscriptionStatus } from 'src/database/entities/transcribe.entity';

// ─── Response DTOs ────────────────────────────────────────────────────────────

export class TranscriptionResponseDto {
  @ApiProperty({ example: 42 })
  id: number;

  @ApiProperty({ example: 'transcribe-uuid' })
  uniqueId: string;

  @ApiProperty({ example: 'pending', enum: TranscriptionStatus })
  status: TranscriptionStatus;

  @ApiProperty({ example: 'uploads/audio/2024-06-08_uuid.mp3' })
  inputUrl: string;

  @ApiPropertyOptional({
    example: 'uploads/text/2024-06-08_uuid.txt',
    description: 'Available once the transcription job completes',
  })
  outputUrl: string | null;

  @ApiPropertyOptional({ example: 120 })
  duration: number | null;

  @ApiProperty({ example: 'request-uuid' })
  requestId: string;

  @ApiPropertyOptional({ description: 'Set only when status = failed' })
  errorMessage: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class UploadAudioResponseDto {
  @ApiProperty({ description: 'The created transcription job' })
  transcription: TranscriptionResponseDto;

  @ApiProperty({
    example: 'Audio uploaded successfully. Transcription is being processed.',
  })
  message: string;
}
