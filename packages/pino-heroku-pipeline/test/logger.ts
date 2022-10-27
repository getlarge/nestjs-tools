import pino from 'pino';

import { HEROKU_HTTPS_DRAIN_REGEX, HEROKU_LOG_REGEX, HEROKU_SYSLOG_DRAIN_REGEX } from '../src/constants';

const types: ['basic', 'syslog-drain', 'https-drain'] = ['basic', 'syslog-drain', 'https-drain'];

const getRegex = (type: string) => {
  switch (type) {
    case 'basic':
      return HEROKU_LOG_REGEX;
    case 'syslog-drain':
      return HEROKU_SYSLOG_DRAIN_REGEX;
    case 'https-drain':
      return HEROKU_HTTPS_DRAIN_REGEX;
  }
};

(function (args) {
  let msg: any;
  try {
    msg = JSON.parse(args[2]);
  } catch (e) {
    msg = args[2];
  }
  const type = args[3] || types[0];
  const regex = getRegex(type);
  const logger = pino({
    transport: {
      pipeline: [
        {
          // simulate content prepended by Heroku dynos built-in logger
          target: './heroku-prepend.js',
          options: { type },
        },
        {
          // cleanup logs
          target: '../dist/index.js',
          options: { regex },
        },
        // output logs with default pino format
        { target: 'pino/file' },
      ],
    },
  });

  logger.info(msg);
})(process.argv);
