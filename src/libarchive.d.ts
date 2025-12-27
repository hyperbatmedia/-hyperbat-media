// libarchive.d.ts - Type declarations for libarchive.js

declare module 'libarchive.js' {
  export interface ArchiveFile {
    file: {
      name: string;
      size: number;
      lastModified: Date;
      extract(): Promise<Uint8Array>;
    };
  }

  export interface ArchiveReader {
    getFilesArray(): Promise<ArchiveFile[]>;
    close(): void;
  }

  export class Archive {
    static init(options?: any): Promise<void>;
    static open(data: Uint8Array, password?: string): Promise<ArchiveReader>;
  }
}