/* eslint-disable @typescript-eslint/no-var-requires */
const build = require('pino-abstract-transport');
const { pipeline, Transform } = require('stream');

const herokuLogPrefix = '2022-01-01T01:01:01.000000+00:00 app[web.1]: ';
const herokuSyslogDrainPrefix = '2022-01-01T01:01:01.000000+00:00 d.9173ea1f-6f14-4976-9cf0-7cd0dafdcdbc app[web.1] ';
const herokuHttpsDrainPrefix = '83 <40>1 2022-01-01T01:01:01+00:00 host app web.3 - ';

const types = ['basic', 'syslog-drain', 'https-drain'];

const getPrefix = (type) => {
  switch (type) {
    case 'basic':
      return herokuLogPrefix;
    case 'syslog-drain':
      return herokuSyslogDrainPrefix;
    case 'https-drain':
      return herokuHttpsDrainPrefix;
  }
};

const pinoStream = async ({ type = types[0] }) => {
  return build(
    function (source) {
      const herokuPrepend = new Transform({
        autoDestroy: true,
        objectMode: true,
        transform(chunk, encoding, callback) {
          const prefix = getPrefix(type);
          const res = `${prefix} ${JSON.stringify(chunk)}\n`;
          this.push(res);
          callback();
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      pipeline(source, herokuPrepend, () => {});
      return herokuPrepend;
    },
    { enablePipelining: true },
  );
};

module.exports = pinoStream;
