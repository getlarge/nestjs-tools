import { rule as returnClassInstance, RULE_NAME as returnClassInstanceName } from './lib/return-class-instance';

module.exports = {
  rules: { [returnClassInstanceName]: returnClassInstance },
};
