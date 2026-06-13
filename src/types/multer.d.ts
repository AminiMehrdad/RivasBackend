declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    }
  }
}

declare module 'multer' {
  import { Request } from 'express';

  export interface Options {
    storage?: StorageEngine;
    limits?: {
      fileSize?: number;
    };
    fileFilter?: (
      req: Request,
      file: Express.Multer.File,
      callback: FileFilterCallback,
    ) => void;
  }

  export interface StorageEngine {
    _handleFile(
      req: Request,
      file: Express.Multer.File,
      callback: (error?: unknown, info?: Partial<Express.Multer.File>) => void,
    ): void;
    _removeFile(
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null) => void,
    ): void;
  }

  export type FileFilterCallback = (
    error: Error | null,
    acceptFile: boolean,
  ) => void;

  export interface DiskStorageOptions {
    destination?:
      | string
      | ((
          req: Request,
          file: Express.Multer.File,
          callback: (error: Error | null, destination: string) => void,
        ) => void);
    filename?: (
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, filename: string) => void,
    ) => void;
  }

  export function diskStorage(options: DiskStorageOptions): StorageEngine;
}
