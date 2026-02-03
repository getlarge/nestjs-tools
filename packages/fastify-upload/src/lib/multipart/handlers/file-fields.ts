import { BadRequestException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { from } from 'rxjs';

import type { Storage, StorageFile } from '../../storage/storage';
import { removeStorageFiles } from '../file';
import { filterUpload } from '../filter';
import type { TransformedUploadOptions } from '../options';
import { getParts } from '../request';
import { accumulateField } from './body-accumulator';
import { HandlerResponse } from './types';

export interface UploadField {
  /**
   * Field name
   */
  name: string;
  /**
   * Max number of files in this field
   */
  maxCount?: number;
}

export type UploadFieldMapEntry = Required<Pick<UploadField, 'maxCount'>>;

export const uploadFieldsToMap = (uploadFields: UploadField[]): Map<string, UploadFieldMapEntry> => {
  const map = new Map<string, UploadFieldMapEntry>();

  uploadFields.forEach(({ name, ...opts }) => {
    map.set(name, { maxCount: 1, ...opts });
  });

  return map;
};

const removeFiles = async (files: Record<string, StorageFile[]>, storage?: Storage, error?: boolean): Promise<void> => {
  if (!storage) return;
  const allFiles = ([] as StorageFile[]).concat(...Object.values(files));
  await removeStorageFiles(storage, allFiles, error);
};

export const handleMultipartFileFields = async <
  S extends Storage extends Storage<infer U> ? Storage<U> : Storage<StorageFile>,
>(
  req: FastifyRequest,
  fieldsMap: Map<string, UploadFieldMapEntry>,
  options: TransformedUploadOptions<S>,
): Promise<HandlerResponse & { files: Record<string, StorageFile[]> }> => {
  const parts = getParts<S>(req, options);
  const body: Record<string, unknown> = {};
  const files: Record<string, StorageFile[]> = {};
  try {
    for await (const part of parts) {
      if (part.file) {
        const fieldOptions = fieldsMap.get(part.fieldname);
        if (fieldOptions == null) {
          throw new BadRequestException(`Field ${part.fieldname} doesn't accept files`);
        }
        files[part.fieldname] ??= [];
        if (files[part.fieldname].length + 1 > fieldOptions.maxCount) {
          throw new BadRequestException(`Field ${part.fieldname} accepts max ${fieldOptions.maxCount} files`);
        }

        const file = await options.storage.handleFile(part, req);
        if (await filterUpload(options, req, file)) {
          files[part.fieldname].push(file);
        }
      } else {
        accumulateField(body, part.fieldname, part.value);
      }
    }
  } catch (error) {
    await removeFiles(files, options.storage, true);
    throw error;
  }

  return {
    body,
    files,
    remove: () => from(removeFiles(files, options.storage)),
  };
};
