import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import path from 'path';

const pinoLogs = [
  { value: 'hello world' },
  {
    value: {
      msg: 'Users request',
      source: 'development',
      service: 'AuthService',
      host: '172.172.172.172',
      status: 'debug',
      appVersion: '1.8.0',
      context: 'UsersService',
      requestId: 'ffef9b36-584f-4fd4-a07b-f9a8cc22f9b6',
    },
  },
  {
    value: {
      msg: 'Invalid token : jwt malformed',
      source: 'development',
      service: 'AuthService',
      host: '172.172.172.172',
      status: 'error',
      appVersion: '1.8.0',
      context: 'UsersService',
      requestId: 'ffef9b36-584f-4fd4-a07b-f9a8cc22f9b6',
      err: {
        type: 'HttpCustomException',
        message: 'Invalid token : jwt malformed',
        status: 401,
        name: 'UnauthorizedException',
      },
    },
  },
];

describe('Transform Heroku logs in : ', () => {
  // requires to build `src` first
  const loggerPath = path.resolve('test/logger.ts');
  const expectedMsg = (value: unknown) => (typeof value !== 'string' && value['msg'] ? value['msg'] : value);
  const initLogger = (value: unknown, type: string) => spawn('ts-node', [loggerPath, JSON.stringify(value), type]);

  function assert(logger: ChildProcessWithoutNullStreams, value: unknown) {
    logger.stdout.setEncoding('utf-8');

    return new Promise((resolve, reject) => {
      logger.stdout
        .on('error', (error) => {
          reject(error);
        })
        .on('data', (data) => {
          try {
            const stdoutData = JSON.parse(data);
            expect(stdoutData.msg).toBe(expectedMsg(value));
            logger.kill('SIGINT');
            resolve(null);
          } catch (error) {
            reject(error);
          }
        });
    });
  }

  for (const { value } of pinoLogs) {
    describe(JSON.stringify(value), () => {
      it('should transform Heroku log and remove prefix', async () => {
        const logger = initLogger(value, 'basic');
        await assert(logger, value);
      });

      it('should transform Heroku Syslog drain and remove prefix', async () => {
        const logger = initLogger(value, 'syslog-drain');
        await assert(logger, value);
      });

      it('should transform Heroku HTTPS drain and remove prefix', async () => {
        const logger = initLogger(value, 'https-drain');
        await assert(logger, value);
      });
    });
  }
});
