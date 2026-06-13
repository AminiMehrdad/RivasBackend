import { BadRequestException } from '@nestjs/common';
import { diskStorage, Options } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

/** Allowed audio MIME types */
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/mpeg',       // .mp3
  'audio/mp4',        // .m4a / .mp4 audio
  'audio/wav',        // .wav
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',        // .ogg
  'audio/webm',       // .webm audio
  'audio/aac',        // .aac
  'audio/flac',       // .flac
  'audio/x-flac',
  'audio/amr',        // .amr (common in mobile recordings)
  'video/webm',       // browsers sometimes tag audio recordings as video/webm
]);

/** Maximum audio file size: 50 MB */
export const MAX_AUDIO_SIZE_BYTES = 50 * 1024 * 1024;

/** Folder on disk where audio files are stored */
export const AUDIO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'audio');

/** Folder on disk where generated text files are stored */
export const TEXT_OUTPUT_DIR = join(process.cwd(), 'uploads', 'text');

export const audioMulterOptions: Options = {
  storage: diskStorage({
    destination: AUDIO_UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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
    } else {
      cb(
        new BadRequestException(
          `Unsupported file type "${file.mimetype}". ` +
            `Accepted formats: mp3, wav, ogg, webm, m4a, aac, flac, amr.`,
        ),
        false,
      );
    }
  },
};
