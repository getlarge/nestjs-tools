import { TSESLint } from '@typescript-eslint/utils';

import { rule, RULE_NAME } from './return-class-instance';

const ruleTester = new TSESLint.RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
});

ruleTester.run(RULE_NAME, rule, {
  valid: [
    // basic test case
    `import { Injectable } from '@nestjs/common';
    class Test {
      constructor(params) {
        Object.assign(this, params);
      }
      message: string;
    }
    @Injectable()
    export class AppService {
      getData(): Test {
        return new Test({ message: 'Hello API' });
      }
    }`,
    // promise test case
    `import { Injectable } from '@nestjs/common';
    class Test {
      constructor(params) {
        Object.assign(this, params);
      }
      message: string;
    }
    @Injectable()
    export class AppService {
      getData(): Promise<Test> {
        return Promise.resolve(new Test({ message: 'Hello API' }));
      }
    }`,
    // constructor are not checked
    `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      constructor() {}
    }`,
    // check when return statement is coming from another service method
    `import { Injectable } from '@nestjs/common';
    class Test {
      constructor(params) {
        Object.assign(this, params);
      }
      message: string;
    }
    @Injectable()
    export class InternalService {
      getData(): Test {
        return new Test({ message: 'Hello API' });
      }
    }
    @Injectable()
    export class AppService {
      constructor(private readonly internalService: InternalService = new InternalService()) {}
      getData(): Test {
        return this.internalService.getData();
      }
    }`,
    // lifecycle methods are ignored
    `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      onModuleInit() {
        console.log('Module initialized.');
      }
    }`,
    // getter return type
    `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      get data() {
        return { message: 'Hello API' };
      }
    }`,
    // primitive return type
    `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      getData(): string {
        return 'Hello API';
      }
    }`,
    // primitive union return type
    `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      getData(): 'OK' | 'ERROR' {
        return 'OK';
      }
    }`,
    // union with null return type
    `import { Injectable } from '@nestjs/common';
    class Test {
      constructor(params) {
        Object.assign(this, params);
      }
      message: string;
    }
    @Injectable()
    export class AppService {
      getData(doIt: boolean): Test | null {
        if (doIt) {
          return new Test({ message: 'Hello API' });
        }
        return null;
      }
    }`,
    // TODO: class instance is modified before being returned
    // `import { Injectable } from '@nestjs/common';
    // class Test {
    //   constructor(params) {
    //     Object.assign(this, params);
    //   }
    //   message: string;
    // }
    // @Injectable()
    // export class AppService {
    //   getData(): Test {
    //     const test = new Test({ message: 'Hello API' });
    //     test.message = 'Hello API';
    //     return test;
    //   }
    // }`,
  ],
  invalid: [
    {
      errors: [{ messageId: 'missingReturnType' }],
      code: `
          import { Injectable } from '@nestjs/common';
          @Injectable()
          export class AppService {
            getData() {
              return { message: 'Hello API' };
            }
          }`,
    },
    {
      errors: [{ messageId: 'returnClassInstance' }],
      code: `
          import { Injectable } from '@nestjs/common';
          class Test {
            constructor(params) {
              Object.assign(this, params);
            }
            message: string;
          }
          @Injectable()
          export class AppService {
            getData(): Test {
              return { message: 'Hello API' };
            }
          }`,
    },
  ],
});
