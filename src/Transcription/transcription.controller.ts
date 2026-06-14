import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AUTH_CONSTANTS } from 'src/common/constants/auth.constants';
import { AuthenticatedRequest } from 'src/common/guards/auth.guard';
import { AppValidationPipe } from 'src/common/pipes/validation.pipe';
import { getAuthenticatedUserId } from 'src/common/utils/request-user.util';
import {
  TranscriptionResponseDto,
  UploadAudioResponseDto,
} from './transcription.dto';
import {
  ACCEPTED_AUDIO_FORMATS,
  audioMulterOptions,
  MAX_AUDIO_SIZE_BYTES,
} from './transcription.multer';
import { TranscriptionService } from './transcription.service';

@ApiTags('Transcriptions')
@ApiBearerAuth()
@ApiCookieAuth(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE)
@ApiHeader({
  name: 'X-API-Key',
  required: false,
  description: 'API key alternative to JWT auth for server-to-server requests.',
})
@Controller('transcriptions')
@UsePipes(AppValidationPipe)
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('audio', audioMulterOptions))
  @ApiOperation({
    summary: 'Upload an audio file for transcription',
    description:
      'Creates a request, runs speech-to-text, stores the transcript, debits the wallet, and records a wallet transaction.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: `Audio file upload. Max size: ${MAX_AUDIO_SIZE_BYTES / 1024 / 1024} MB.`,
    schema: {
      type: 'object',
      required: ['audio'],
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: `Accepted formats: ${ACCEPTED_AUDIO_FORMATS.join(', ')}`,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transcription completed and wallet charged.',
    type: UploadAudioResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file or insufficient wallet balance.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT/API key.',
  })
  async uploadAudio(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UploadAudioResponseDto> {
    const record = await this.transcriptionService.uploadAndTranscribe(
      getAuthenticatedUserId(req),
      file,
    );

    return {
      message: 'Audio uploaded and transcribed successfully.',
      transcription: record,
    };
  }

  @Get()
  @ApiOperation({ summary: "List the authenticated user's transcriptions" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transcription records, newest first.',
    type: [TranscriptionResponseDto],
  })
  listMine(
    @Req() req: AuthenticatedRequest,
  ): Promise<TranscriptionResponseDto[]> {
    return this.transcriptionService.listByUser(getAuthenticatedUserId(req));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single transcription by ID' })
  @ApiParam({
    name: 'id',
    description: 'Transcription unique ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transcription record.',
    type: TranscriptionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transcription not found.',
  })
  getOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<TranscriptionResponseDto> {
    return this.transcriptionService.getById(id, getAuthenticatedUserId(req));
  }
}
