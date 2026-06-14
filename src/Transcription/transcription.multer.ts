import { BadRequestException } from '@nestjs/common';
import { mkdirSync } from 'fs';
import { diskStorage, Options } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export const ACCEPTED_AUDIO_FORMATS = [
  'mp3',
  'wav',
  'ogg',
  'webm',
  'm4a',
  'aac',
  'flac',
  'amr',
] as const;

export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/flac',
  'audio/x-flac',
  'audio/amr',
  'video/webm',
]);

export const MAX_AUDIO_SIZE_BYTES = 50 * 1024 * 1024;
export const AUDIO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'audio');
export const TEXT_OUTPUT_DIR = join(process.cwd(), 'uploads', 'text');

export const audioMulterOptions: Options = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });
      cb(null, AUDIO_UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const date = new Date().toISOString().slice(0, 10);
      const unique = uuidv4();
      const ext = extname(file.originalname).toLowerCase() || '.audio';

      cb(null, `${date}_${unique}${ext}`);
    },
  }),
  limits: {
    fileSize: MAX_AUDIO_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AUDIO_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(
      new BadRequestException(
        `Unsupported file type "${file.mimetype}". ` +
          `Accepted formats: ${ACCEPTED_AUDIO_FORMATS.join(', ')}.`,
      ),
      false,
    );
  },
};
