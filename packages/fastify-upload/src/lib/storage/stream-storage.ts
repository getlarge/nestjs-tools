import { PassThrough, Readable } from 'node:stream';
import { finished } from 'node:stream/promises';

import { MultipartFile, Storage, StorageFile } from './storage';

export interface StreamStorageFile extends StorageFile {
  stream: Readable;
}

export class StreamStorage extends Storage<StreamStorageFile> {
  handleFile(file: MultipartFile): Promise<StreamStorageFile> {
    const { encoding, mimetype, fieldname } = file;
    const stream = file.file.pipe(new PassThrough());

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
    }
    // ? should we still check whether the stream was being read in filter phase?
  }
}
