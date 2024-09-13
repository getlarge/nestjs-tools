/* eslint-disable max-lines-per-function */
/**
 * This file sets you up with structure needed for an ESLint rule.
 *
 * It leverages utilities from @typescript-eslint to allow TypeScript to
 * provide autocompletions etc for the configuration.
 *
 * Your rule's custom logic will live within the create() method below
 * and you can learn more about writing ESLint rules on the official guide:
 *
 * https://eslint.org/docs/developer-guide/working-with-rules
 *
 * You can also view many examples of existing rules here:
 *
 * https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin/src/rules
 */

import { ESLintUtils } from '@typescript-eslint/utils';

// NOTE: The rule will be available in ESLint configs as "@nx/workspace/return-class-instance"
export const RULE_NAME = '@getlarge/nestjs-tools-eslint-rules/return-class-instance';

const getTypeNameFromReturnType = (rawReturnType: string) => {
  return rawReturnType.replaceAll(/Promise<([^<>]*)>/g, '$1').replace(': ', '');
};

const isPrimitive = (value: string) => {
  return value === 'string' || value === 'number' || value === 'boolean';
};

const isVoid = (value: string) => {
  return value === 'void';
};

const isLiteralType = (type: string) => {
  return /^'[^']*'$/.test(type) || /^"[^"]*"$/.test(type);
};

const isNullable = (type: string) => ['null', 'undefined'].includes(type);

const extractUnionTypes = (typeName: string) => typeName.split('|').map((type) => type.trim());

const isValidReturnType = (type: string) =>
  isPrimitive(type) || isVoid(type) || isLiteralType(type) || isNullable(type);

export const rule = ESLintUtils.RuleCreator(() => __filename)({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure service methods return class instances',
    },
    schema: [],
    messages: {
      missingReturnType:
        'Public service methods should explicitly declare a return type that is a class instance, a primitive or void.',
      returnClassInstance: 'Public service methods should return a class instance of the declared return type.',
    },
  },
  defaultOptions: [],
  create(context) {
    const ignoredKinds = new Set(['constructor', 'get', 'set']);
    const ignoredMethods = new Set([
      'onModuleInit',
      'onModuleDestroy',
      'onApplicationBootstrap',
      'beforeApplicationShutdown',
      'onApplicationShutdown',
    ]);

    return {
      MethodDefinition(node) {
        if (
          node.static === false &&
          node.type === 'MethodDefinition' &&
          node.key.type === 'Identifier' &&
          ignoredMethods.has(node.key.name) === false &&
          ignoredKinds.has(node.kind) === false &&
          node.computed === false &&
          node.accessibility !== 'private' &&
          node.accessibility !== 'protected' &&
          node.parent?.type === 'ClassBody' &&
          node.parent.parent.type === 'ClassDeclaration' &&
          node.parent.parent.decorators?.some(
            (decorator) =>
              decorator.expression.type === 'CallExpression' &&
              decorator.expression.callee.type === 'Identifier' &&
              decorator.expression.callee?.name === 'Injectable',
          )
        ) {
          const returnType = node.value.returnType;
          if (!returnType) {
            context.report({
              node,
              messageId: 'missingReturnType',
            });
          } else {
            const returnTypeText = context.sourceCode.getText(returnType);
            const typeName = getTypeNameFromReturnType(returnTypeText);
            const extractedTypes = extractUnionTypes(getTypeNameFromReturnType(returnTypeText));

            // If all union types are primitive, void, or literals, we return early
            if (extractedTypes.every(isValidReturnType)) {
              return;
            }
            const returnStatements = node.value?.body?.body?.filter((node) => node.type === 'ReturnStatement') ?? [];

            const returnClassInstance = returnStatements.every((returnStatement) => {
              const returnArgument = returnStatement.argument;

              if (returnArgument?.type === 'NewExpression' && returnArgument.callee?.type === 'Identifier') {
                return returnArgument.callee.name === typeName;
              }

              if (returnArgument?.type === 'CallExpression') {
                const calleeName =
                  returnArgument.callee?.type === 'Identifier'
                    ? returnArgument.callee.name
                    : returnArgument.callee.type === 'MemberExpression' &&
                        returnArgument.callee.property?.type === 'Identifier'
                      ? returnArgument.callee.property.name
                      : '';

                // Handle Promise.resolve cases
                if (
                  calleeName === 'Promise' &&
                  returnArgument.arguments[0].type === 'NewExpression' &&
                  returnArgument.arguments[0].callee?.type === 'Identifier'
                ) {
                  return returnArgument.arguments[0].callee.name === typeName;
                }
                return true;
              }
              // Handle literal types and null/undefined
              if (returnArgument?.type === 'Literal' || returnArgument === null) {
                return returnArgument?.value?.toString()
                  ? extractedTypes.includes(returnArgument.value.toString())
                  : extractedTypes.includes('null');
              }
              return false;
            });

            if (!returnClassInstance) {
              context.report({
                node,
                messageId: 'returnClassInstance',
              });
            }
          }
        }
      },
    };
  },
});
