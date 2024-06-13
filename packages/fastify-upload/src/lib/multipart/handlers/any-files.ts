import type { FastifyRequest } from 'fastify';
import { from } from 'rxjs';

import type { Storage, StorageFile } from '../../storage';
import { removeStorageFiles } from '../file';
import { filterUpload } from '../filter';
import type { TransformedUploadOptions } from '../options';
import { getParts } from '../request';
import { HandlerResponse } from './types';

const removeFiles = async (files: StorageFile[], storage: Storage, error?: boolean): Promise<void> => {
  await removeStorageFiles(storage, files, error);
};

export const handleMultipartAnyFiles = async <S extends Storage>(
  req: FastifyRequest,
  options: TransformedUploadOptions<S>,
): Promise<HandlerResponse & { files: StorageFile[] }> => {
  const parts = getParts<S>(req, options);
  const body: Record<string, unknown> = {};
  const files: StorageFile[] = [];

  try {
    for await (const part of parts) {
      if (part.file) {
        const file = await options.storage.handleFile(part, req);
        if (await filterUpload(options, req, file)) {
          files.push(file);
        }
      } else {
        body[part.fieldname] = part.value;
      }
    }
  } catch (error) {
    await removeFiles(files, options.storage, true);
    throw error;
  }

  return { body, files, remove: () => from(removeFiles(files, options.storage)) };
};
