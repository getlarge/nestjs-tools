import { Logger } from '@nestjs/common';

const logger = new Logger('FileStorage');

export function loadPackage<T = unknown, R = T | Promise<T>>(
  packageName: string,
  context: string,
  loaderFn?: () => R,
): R {
  try {
    return loaderFn ? loaderFn() : require(packageName);
  } catch (e) {
    logger.error(
      `The "${packageName}" package is missing. Please, make sure to install it to take advantage of ${context}.`,
    );
    Logger.flush();
    process.exit(1);
  }
}
