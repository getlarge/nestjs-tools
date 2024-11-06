import { createReadStream, createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { normalize, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { finished, pipeline } from 'node:stream/promises';

import { MultipartFile, Storage, StorageFile } from './storage';

export interface StreamStorageFile extends StorageFile {
  stream: Readable;
}

const temporaryFileOutput = (filename: string) => {
  const safeFileName = normalize(filename).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = resolve(tmpdir(), safeFileName);
  // Ensure the resolved path starts with the intended storagePath to prevent path traversal
  if (!fullPath.startsWith(resolve(tmpdir() + sep))) {
    throw new Error('Invalid file path');
  }
  return fullPath;
};
export class StreamStorage extends Storage<StreamStorageFile> {
  async handleFile(file: MultipartFile): Promise<StreamStorageFile> {
    const { encoding, mimetype, fieldname } = file;
    /**
     * force the stream to be consumed as required by Fastify and Busboy
     * @see https://github.com/fastify/fastify-multipart?tab=readme-ov-file#usage
     *  */
    const output = temporaryFileOutput(file.filename);
    await pipeline(file.file, createWriteStream(output));
    const stream = createReadStream(output);
    return Promise.resolve({
      size: file.file.readableLength,
      stream,
      encoding,
      mimetype,
      fieldname,
      originalFilename: file.filename,
    });
  }

  async removeFile(file: StreamStorageFile, force?: boolean): Promise<void> {
    if (!force) {
      await finished(file.stream);
      file.stream.destroy();
    } else if (!file.stream.destroyed) {
      file.stream.destroy();
    }
    await rm(temporaryFileOutput(file.originalFilename)).catch(() => {
      // ignore
    });
  }
}
