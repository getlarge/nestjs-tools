import build from 'pino-abstract-transport';
import { pipeline } from 'stream';

import { HEROKU_LOG_REGEX } from './constants';
import { DynoType, herokuLogTransformer, parseHerokuAppLogLine } from './utils';

export interface PipelineOptions {
  regex?: RegExp;
  dyno?: DynoType;
}

const pinoHerokuPipeline = async (options: PipelineOptions = {}) => {
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

module.exports = pinoHerokuPipeline;
export default pinoHerokuPipeline;
