import type { Linter } from '@typescript-eslint/utils/dist/ts-eslint';

import { rule as returnClassInstance, RULE_NAME as returnClassInstanceName } from './lib/return-class-instance';

// note - cannot migrate this to an import statement because it will make TSC copy the package.json to the dist folder
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { name, version } = require('../package.json') as {
  name: string;
  version: string;
};

export default {
  meta: {
    name,
    version,
  },
  rules: { [returnClassInstanceName]: returnClassInstance },
} satisfies Linter.Plugin;
