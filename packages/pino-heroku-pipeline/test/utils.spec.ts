/* eslint-disable max-nested-callbacks */
/* eslint-disable sonarjs/cognitive-complexity */
import { HEROKU_HTTPS_DRAIN_REGEX, HEROKU_LOG_REGEX, HEROKU_SYSLOG_DRAIN_REGEX } from '../src/constants';
import { cleanHerokuLogLine, isHerokuAppLogLine, isHerokuLogLine, parseHerokuAppLogLine } from '../src/utils';

const validHerokuAppMsg = {
  level: 30,
  time: 1666793410319,
  pid: 4,
  hostname: 'a0745752-75df-43bd-a0aa-25584851af71',
  source: 'development',
  service: 'AuthService',
  host: '172.172.172.1724',
  status: 'info',
  appVersion: '1.8.0',
  context: 'RmqGuard',
  msg: '54.54.54.54',
};

const herokuLogLines = [
  {
    line: `2022-01-01T01:01:01.000000+00:00 app[web.1]: ${JSON.stringify(validHerokuAppMsg)}`,
    isHerokuLog: true,
    isHerokuAppLog: true,
  },
  {
    line: '2022-01-01T01:01:01.000000+00:00 heroku[router]: at=info method=POST path="/api/users" host=auth.s1seven.com request_id=ffef9b36-584f-4fd4-a07b-f9a8cc22f9b6 fwd="54.54.54.54" dyno=web.1 connect=0ms service=7ms status=201 bytes=997 protocol=https',
    isHerokuLog: true,
    isHerokuAppLog: false,
  },
  {
    line: '2022-01-01T01:01:01.000000+00:00 app[heroku-redis]: source=REDIS addon=redis-vertical-666666 sample#active-connections=5 sample#load-avg-1m=0.065 sample#load-avg-5m=0.08 sample#load-avg-15m=0.105 sample#read-iops=0 sample#write-iops=32.716 sample#memory-total=16084924kB sample#memory-free=7236288kB sample#memory-cached=5959560kB sample#memory-redis=1837160bytes sample#hit-rate=0.47756 sample#evicted-keys=0',
    isHerokuLog: true,
    isHerokuAppLog: false,
  },
  {
    line: 'hello world 0',
    isHerokuLog: false,
    isHerokuAppLog: false,
  },
];

const herokuSyslogDrainLines = [
  {
    line: `2022-01-01T01:01:01.000000+00:00 d.9173ea1f-6f14-4976-9cf0-7cd0dafdcdbc app[web.1] ${JSON.stringify(
      validHerokuAppMsg,
    )}`,
    isHerokuLog: true,
    isHerokuAppLog: true,
  },
  {
    line: '2022-01-01T01:01:01.000000+00:00 d.9173ea1f-6f14-4976-9cf0-7cd0dafdcdbc heroku[router] at=info method=POST path="/api/users" host=auth.s1seven.com request_id=ffef9b36-584f-4fd4-a07b-f9a8cc22f9b6 fwd="54.54.54.54" dyno=web.1 connect=0ms service=7ms status=201 bytes=997 protocol=https',
    isHerokuLog: true,
    isHerokuAppLog: false,
  },
  {
    line: '2022-01-01T01:01:01.000000+00:00 d.9173ea1f-6f14-4976-9cf0-7cd0dafdcdbc app[heroku-redis] source=REDIS addon=redis-vertical-666666 sample#active-connections=5 sample#load-avg-1m=0.065 sample#load-avg-5m=0.08 sample#load-avg-15m=0.105 sample#read-iops=0 sample#write-iops=32.716 sample#memory-total=16084924kB sample#memory-free=7236288kB sample#memory-cached=5959560kB sample#memory-redis=1837160bytes sample#hit-rate=0.47756 sample#evicted-keys=0',
    isHerokuLog: true,
    isHerokuAppLog: false,
  },
  {
    line: 'hello world 1',
    isHerokuLog: false,
    isHerokuAppLog: false,
  },
];

const herokuHttpsDrainLines = [
  {
    line: `83 <40>1 2022-01-01T01:01:01+00:00 host app web.3 - ${JSON.stringify(validHerokuAppMsg)}`,
    isHerokuLog: true,
    isHerokuAppLog: true,
  },
  {
    line: '119 <40>1 2022-01-01T01:01:01+00:00 host heroku router - at=info method=POST path="/api/users" host=auth.s1seven.com request_id=ffef9b36-584f-4fd4-a07b-f9a8cc22f9b6 fwd="54.54.54.54" dyno=web.1 connect=0ms service=7ms status=201 bytes=997 protocol=https',
    isHerokuLog: true,
    isHerokuAppLog: false,
  },
  {
    line: '83 <40>1 2022-01-01T01:01:01+00:00 host app heroku-redis - source=REDIS addon=redis-vertical-666666 sample#active-connections=5 sample#load-avg-1m=0.065 sample#load-avg-5m=0.08 sample#load-avg-15m=0.105 sample#read-iops=0 sample#write-iops=32.716 sample#memory-total=16084924kB sample#memory-free=7236288kB sample#memory-cached=5959560kB sample#memory-redis=1837160bytes sample#hit-rate=0.47756 sample#evicted-keys=0',
    isHerokuLog: true,
    isHerokuAppLog: false,
  },
  {
    line: 'hello world 2',
    isHerokuLog: false,
    isHerokuAppLog: false,
  },
];

const herokuLogsMap = {
  basic: {
    regex: HEROKU_LOG_REGEX,
    lines: herokuLogLines,
  },
  'syslog-drain': {
    regex: HEROKU_SYSLOG_DRAIN_REGEX,
    lines: herokuSyslogDrainLines,
  },
  'https-drain': {
    regex: HEROKU_HTTPS_DRAIN_REGEX,
    lines: herokuHttpsDrainLines,
  },
};

describe('Detect Heroku logs in : ', () => {
  for (const [key, value] of Object.entries(herokuLogsMap)) {
    describe(key.toUpperCase(), () => {
      const { regex, lines } = value;
      for (const { line, isHerokuAppLog, isHerokuLog } of lines) {
        describe(line, () => {
          it('should detect heroku application log line', () => {
            expect(isHerokuLogLine(line, regex)).toBe(isHerokuLog);
            expect(isHerokuAppLogLine(line, regex)).toBe(isHerokuAppLog);
          });
        });
      }
    });
  }
});

describe('Clean Heroku logs in : ', () => {
  for (const [key, value] of Object.entries(herokuLogsMap)) {
    describe(key.toUpperCase(), () => {
      const { regex, lines } = value;
      for (const { line, isHerokuLog, isHerokuAppLog } of lines) {
        describe(line, () => {
          it('should clean heroku application log line', () => {
            if (isHerokuLog) {
              const cleanLine = cleanHerokuLogLine(line, regex);
              expect(new RegExp(regex).test(cleanLine)).toBeFalsy();
            }
          });

          it('should parse heroku application log line', () => {
            if (isHerokuLog) {
              if (isHerokuAppLog) {
                const obj = parseHerokuAppLogLine(line, regex);
                expect(obj).toEqual(validHerokuAppMsg);
              } else {
                const obj = parseHerokuAppLogLine(line, regex);
                expect(obj).toBeNull();
              }
            }
          });
        });
      }
    });
  }
});
