import {
  catchError,
  concatWith,
  EMPTY,
  ignoreElements,
  MonoTypeOperatorFunction,
  Observable,
  tap,
  throwError,
} from 'rxjs';

import type { Storage, StorageFile } from '../storage';

export type RemoveStorageFiles = (force?: boolean) => Observable<void>;

/**
 * Clean up files after the request handler has finished using them.
 *
 * Successful handlers may return a stream backed by an uploaded file. Cleanup
 * therefore starts without delaying the handler's value and waits for the
 * storage implementation to decide when the file is safe to remove. On an
 * error there is no response stream to preserve, so cleanup is forced and
 * awaited before the original error is propagated.
 */
export const cleanupStorageFiles =
  <T>(remove: RemoveStorageFiles): MonoTypeOperatorFunction<T> =>
  (source) =>
    source.pipe(
      tap(() => {
        remove().subscribe({
          // Cleanup is deliberately detached from a successful response. If a
          // response stream fails, retry with force so its temporary file and
          // descriptor are not left behind.
          error: () => remove(true).subscribe({ error: () => undefined }),
        });
      }),
      catchError((error: unknown) =>
        remove(true).pipe(
          // Preserve the handler error if cleanup itself also fails.
          catchError(() => EMPTY),
          ignoreElements(),
          concatWith(throwError(() => error)),
        ),
      ),
    );

export const removeStorageFiles = async <
  S extends Storage<StorageFile> extends Storage<infer U> ? Storage<U> : Storage<StorageFile>,
  T extends StorageFile extends Storage<infer U> ? U : StorageFile = StorageFile extends Storage<infer U>
    ? U
    : StorageFile,
>(
  storage: S,
  files?: (T | undefined)[],
  force?: boolean,
): Promise<void> => {
  if (files == null) return;
  await Promise.all(files.map((file) => file && storage.removeFile(file, force)));
};
