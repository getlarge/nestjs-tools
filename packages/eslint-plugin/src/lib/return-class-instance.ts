/* eslint-disable max-lines-per-function */
import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const RULE_NAME = 'return-class-instance';

const isNestServiceMethod = (node: TSESTree.MethodDefinition) => {
  const ignoredKinds = new Set(['constructor', 'get', 'set']);
  const ignoredMethods = new Set([
    'onModuleInit',
    'onModuleDestroy',
    'onApplicationBootstrap',
    'beforeApplicationShutdown',
    'onApplicationShutdown',
  ]);

  return (
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
        decorator.expression.callee.name === 'Injectable',
    )
  );
};

const getTypeNameFromReturnType = (rawReturnType: string) => {
  return rawReturnType
    .replaceAll(/Promise<([^<>]*)>/g, '$1')
    .replace(': ', '')
    .replaceAll('[]', '');
};

const isPrimitive = (value: string) => {
  return value === 'string' || value === 'number' || value === 'boolean';
};

const isBuffer = (value: string) => {
  return value === 'Buffer';
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
  isPrimitive(type) || isVoid(type) || isLiteralType(type) || isNullable(type) || isBuffer(type);

// eslint-disable-next-line complexity
const isReturnClassInstance = (
  returnStatement: TSESTree.ReturnStatement,
  typeName: string,
  extractedTypes: string[],
) => {
  const returnArgument = returnStatement.argument;

  // Handle class instance
  if (returnArgument?.type === 'NewExpression' && returnArgument.callee?.type === 'Identifier') {
    return returnArgument.callee.name === typeName;
  }

  // Handle array of class instances
  if (returnArgument?.type === 'ArrayExpression' && returnArgument.elements[0]?.type === 'NewExpression') {
    return (
      returnArgument.elements[0].callee?.type === 'Identifier' && returnArgument.elements[0].callee.name === typeName
    );
  }

  if (returnArgument?.type === 'CallExpression') {
    const calleeName =
      returnArgument.callee?.type === 'Identifier'
        ? returnArgument.callee.name
        : returnArgument.callee.type === 'MemberExpression' && returnArgument.callee.object.type === 'Identifier'
          ? returnArgument.callee.object.name
          : '';

    // Handle Promise.resolve cases
    if (
      calleeName === 'Promise' &&
      returnArgument.callee.type === 'MemberExpression' &&
      returnArgument.callee.property.type === 'Identifier' &&
      returnArgument.callee.property.name === 'resolve' &&
      returnArgument.arguments[0].type === 'NewExpression' &&
      returnArgument.arguments[0].callee?.type === 'Identifier'
    ) {
      return returnArgument.arguments[0].callee.name === typeName;
    }

    // Handle this.service.method() cases
    if (
      returnArgument.callee?.type === 'MemberExpression' &&
      returnArgument.callee.object.type === 'MemberExpression' &&
      returnArgument.callee.object.object.type === 'ThisExpression' &&
      returnArgument.callee.object.property.type === 'Identifier'
    ) {
      return true;
    }

    return false;
  }
  // Handle literal types and null/undefined
  if (returnArgument?.type === 'Literal' || returnArgument === null) {
    return returnArgument?.value?.toString()
      ? extractedTypes.includes(returnArgument.value.toString())
      : extractedTypes.includes('null');
  }
  return false;
};

export const rule = ESLintUtils.RuleCreator(() => __filename)({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce service methods return class instances',
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
    return {
      MethodDefinition(node) {
        if (!isNestServiceMethod(node)) {
          return;
        }
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

          const returnClassInstance = returnStatements.every((returnStatement) =>
            isReturnClassInstance(returnStatement, typeName, extractedTypes),
          );
          if (!returnClassInstance) {
            context.report({
              node,
              messageId: 'returnClassInstance',
            });
          }
        }
      },
    };
  },
});
