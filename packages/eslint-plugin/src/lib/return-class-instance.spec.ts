import { RuleTester } from '@typescript-eslint/rule-tester';

import { rule, RULE_NAME } from './return-class-instance';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts*'],
      },
    },
  },
});

const basicTestCase = `
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
    return new Test({ message: 'Hello API' });
  }
}`;

const arrayTestCase1 = `
import { Injectable } from '@nestjs/common';
class Test {
  constructor(params) {
    Object.assign(this, params);
  }
  message: string;
}
@Injectable()
export class AppService {
  getData(): Test[] {
    return [new Test({ message: 'Hello API' })]
  }
}`;

const arrayTestCase2 = `
import { Injectable } from '@nestjs/common';
class Test {
  constructor(params) {
    Object.assign(this, params);
  }
  message: string;
}
@Injectable()
export class AppService {
  getData(): Test[] {
    const tests = { message: 'Hello API' };
    return tests.map(t => new Test(t));
  }
}`;

const promiseTestCase = `
import { Injectable } from '@nestjs/common';
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
    }`;

const constructorTestCase = `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      constructor() {}
    }`;

const memberMethodTestCase = `import { Injectable } from '@nestjs/common';
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
    }`;

const lifecycleMethodTestCase = `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      onModuleInit() {
        console.log('Module initialized.');
      }
    }`;

const getterTestCase = `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      get data() {
        return { message: 'Hello API' };
      }
    }`;

const primnitveReturnType = `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      getData(): string {
        return 'Hello API';
      }
    }`;

const bufferReturnType = `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      getData(): Buffer {
        return Buffer.from('Hello API');
      }
    }`;

const primitiveUnionReturnType = `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      getData(): 'OK' | 'ERROR' {
        return 'OK';
      }
    }`;

const primitiveUnionResolvedReturnType = `import { Injectable } from '@nestjs/common';
    @Injectable()
    export class AppService {
      getData(): Promise<'OK' | 'ERROR'> {
        return Promise.resolve('OK');
      }
    }`;

const unionWithNullReturnType = `import { Injectable } from '@nestjs/common';
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
    }`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const modifiedClassInstance = `import { Injectable } from '@nestjs/common';
      class Test {
        constructor(params) {
          Object.assign(this, params);
        }
        message: string;
      }
      @Injectable()
      export class AppService {
        getData(): Test {
          const test = new Test({ message: 'Hello API' });
          test.message = 'Hello API';
          return test;
        }
      }`;

ruleTester.run(RULE_NAME, rule, {
  valid: [
    basicTestCase,
    arrayTestCase1,
    arrayTestCase2,
    promiseTestCase,
    constructorTestCase,
    memberMethodTestCase,
    lifecycleMethodTestCase,
    getterTestCase,
    primnitveReturnType,
    bufferReturnType,
    primitiveUnionReturnType,
    primitiveUnionResolvedReturnType,
    unionWithNullReturnType,
    // TODO: modifiedClassInstance
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
              return new Test().toJSON();
            }
          }`,
    },
  ],
});
