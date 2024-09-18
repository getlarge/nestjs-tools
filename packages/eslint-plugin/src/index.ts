import type { Linter } from '@typescript-eslint/utils/dist/ts-eslint';

import { rule as returnClassInstance, RULE_NAME as returnClassInstanceName } from './lib/return-class-instance';

// note - cannot migrate this to an import statement because it will make TSC copy the package.json to the dist folder
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { name, version } = require('../package.json') as {
  name: string;
  version: string;
};

export = {
  meta: {
    name,
    version,
  },
  rules: { [returnClassInstanceName]: returnClassInstance },
  configs: {
    recommended: {
      parser: '@typescript-eslint/parser',
      plugins: ['@getlarge/nestjs-tools'],
      rules: {
        [`@getlarge/nestjs-tools/${returnClassInstanceName}`]: 'error',
      },
    },
  },
} satisfies Linter.Plugin;
