import { Transform } from 'stream';

import { ASCII_COLORS_REGEX, HEROKU_LOG_REGEX } from './constants';

export type DynoType = 'web' | 'worker';

export const isHerokuLogLine = (line: string, regex = HEROKU_LOG_REGEX): boolean => new RegExp(regex).test(line);

export const isHerokuAppLogLine = (line: string, regex = HEROKU_LOG_REGEX, dyno: DynoType = 'web'): boolean => {
  const result = new RegExp(regex).exec(line);
  const herokuPrefix = result?.length ? result[0] : '';
  return herokuPrefix.includes('app') && herokuPrefix.includes(dyno);
};

export const cleanHerokuLogLine = (line: string, regex = HEROKU_LOG_REGEX): string =>
  line.trim().replaceAll(ASCII_COLORS_REGEX, '').replaceAll(regex, '').trim();

export const parseHerokuAppLogLine = (
  line: string,
  regex = HEROKU_LOG_REGEX,
  dyno: DynoType = 'web',
): Record<string, unknown> | null => {
  const isHerokuLog = isHerokuLogLine(line, regex);
  if (!isHerokuLog) {
    return JSON.parse(line);
  }
  // ignore Heroku logs that are not apps and web process type
  const isHerokuAppLog = isHerokuAppLogLine(line, regex, dyno);
  const cleanLine = isHerokuAppLog ? cleanHerokuLogLine(line, regex) : null;
  return isHerokuAppLog ? JSON.parse(cleanLine) : null;
};

export const herokuLogTransformer = new Transform({
  // Make sure autoDestroy is set,
  // this is needed in Node v12 or when using the
  // readable-stream module.
  autoDestroy: true,
  objectMode: true,
  transform(chunk, encoding, callback) {
    this.push(`${JSON.stringify(chunk)}\n`);
    callback();
  },
});
