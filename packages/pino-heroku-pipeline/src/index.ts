import build from 'pino-abstract-transport';
import { pipeline } from 'stream';

import { HEROKU_LOG_REGEX } from './constants';
import { DynoType, herokuLogTransformer, parseHerokuAppLogLine } from './utils';

const pinoHerokuStream = async (options: { regex?: RegExp; dyno?: DynoType } = {}) => {
  const { regex = HEROKU_LOG_REGEX, dyno = 'web' } = options;
  return build(
    (source) => {
      pipeline(source, herokuLogTransformer, () => {
        //? herokuLogTransformer.push(error);
      });
      return herokuLogTransformer;
    },
    {
      // This is needed to be able to pipeline transports.
      enablePipelining: true,
      parseLine: (line) => parseHerokuAppLogLine(line, regex, dyno),
    },
  );
};

module.exports = pinoHerokuStream;
export default pinoHerokuStream;
