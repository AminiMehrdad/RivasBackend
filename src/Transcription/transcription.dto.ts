import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TranscriptionStatus } from 'src/database/entities/transcribe.entity';

export class TranscriptionResponseDto {
  @ApiProperty({ example: 42 })
  id: number;

  @ApiProperty({ example: '4d5655a1-fbcf-4d30-9c75-35f0335c0154' })
  uniqueId: string;

  @ApiProperty({ example: 'completed', enum: TranscriptionStatus })
  status: TranscriptionStatus;

  @ApiProperty({ example: 'uploads/audio/2026-06-13_file.mp3' })
  inputUrl: string;

  @ApiPropertyOptional({
    example: 'uploads/text/2026-06-13_transcript.txt',
    description: 'Available after transcription completes.',
  })
  outputUrl: string | null;

  @ApiPropertyOptional({ example: 120 })
  duration: number | null;

  @ApiProperty({ example: '7b0cff59-568a-4cad-bc19-e10837913a77' })
  requestId: string;

  @ApiPropertyOptional({ description: 'Set only when status is failed.' })
  errorMessage: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class UploadAudioResponseDto {
  @ApiProperty({
    example: 'Audio uploaded and transcribed successfully.',
  })
  message: string;

  @ApiProperty({ description: 'The completed transcription record.' })
  transcription: TranscriptionResponseDto;
}
