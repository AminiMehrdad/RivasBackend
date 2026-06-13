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
import {
  TranscriptionResponseDto,
  UploadAudioResponseDto,
} from './transcription.dto';
import { audioMulterOptions } from './transcription.multer';
import { TranscriptionService } from './transcription.service';
import { AppValidationPipe } from 'src/common/pipes/validation.pipe';
import { AUTH_CONSTANTS } from 'src/common/constants/auth.constants';
import { AuthenticatedRequest } from 'src/common/guards/auth.guard';
import { UnauthorizedError } from 'src/common/errors/auth.errors';

/** Shape added to req by the JWT auth guard */

@ApiTags('Transcriptions')
@Controller(['transcriptions', 'Transcriptions'])
@UsePipes(AppValidationPipe)
export class TranscriptionController {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  // ─── POST /transcriptions ─────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiCookieAuth(AUTH_CONSTANTS.REFRESH_TOKEN_COOKIE)
  @ApiHeader({
    name: 'X-API-Key',
    required: false,
    description:
      'API key alternative to JWT auth for server-to-server transcription uploads.',
  })
  @UseInterceptors(FileInterceptor('audio', audioMulterOptions))
  @ApiOperation({
    summary: 'Upload an audio file for transcription',
    description:
      'Accepts an audio file (mp3, wav, ogg, webm, m4a, aac, flac, amr – max 50 MB). ' +
      'Calculates duration, creates a request, transcribes the audio, records a wallet transaction, ' +
      'debits the user wallet, and returns the completed transcription.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Audio file upload',
    schema: {
      type: 'object',
      required: ['audio'],
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: 'Audio file (mp3, wav, ogg, webm, m4a, aac, flac, amr)',
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
    description: 'Invalid or missing audio file.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid JWT/API key.',
  })
  async uploadAudio(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadAudioResponseDto> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }
    const record = await this.transcriptionService.uploadAndTranscribe(
      userId,
      file,
    );

    return {
      message: 'Audio uploaded and transcribed successfully.',
      transcription: record,
    };
  }

  // ─── GET /transcriptions ──────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: "List the authenticated user's transcriptions" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Array of transcription records, newest first.',
    type: [TranscriptionResponseDto],
  })
  listMine(
    @Req() req: AuthenticatedRequest,
  ): Promise<TranscriptionResponseDto[]> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }

    return this.transcriptionService.listByUser(userId);
  }

  // ─── GET /transcriptions/:id ──────────────────────────────────────────────

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
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError();
    }

    return this.transcriptionService.getById(id, userId);
  }
}
