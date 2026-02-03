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

// const isUndefined = (value: string) => {
//   return value === 'undefined';
// };

// const isNull = (value: string) => {
//   return value === 'null';
// };

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

const getClassName = (expression: TSESTree.Expression): string | null => {
  if (expression.type === 'NewExpression' && expression.callee?.type === 'Identifier') {
    return expression.callee.name;
  }
  return null;
};

const getClassNameFromArray = (expression: TSESTree.Expression): string | null => {
  if (
    expression.type === 'ArrayExpression' &&
    expression.elements[0]?.type === 'NewExpression' &&
    expression.elements[0].callee?.type === 'Identifier'
  ) {
    return expression.elements[0].callee.name;
  }
  return null;
};

const getClassNameFromMap = (expression: TSESTree.Expression): string | null => {
  if (
    expression.type === 'CallExpression' &&
    expression.callee?.type === 'MemberExpression' &&
    expression.callee.property.type === 'Identifier' &&
    expression.callee.property.name === 'map' &&
    expression.arguments[0]?.type === 'ArrowFunctionExpression' &&
    expression.arguments[0].body.type === 'NewExpression' &&
    expression.arguments[0].body.callee?.type === 'Identifier'
  ) {
    return expression.arguments[0].body.callee.name;
  }
  return null;
};

const getClassNameFromPromiseResolve = (expression: TSESTree.Expression): string | null => {
  if (
    expression.type === 'CallExpression' &&
    expression.callee.type === 'MemberExpression' &&
    expression.callee.object.type === 'Identifier' &&
    expression.callee.object.name === 'Promise' &&
    expression.callee.property.type === 'Identifier' &&
    expression.callee.property.name === 'resolve' &&
    expression.arguments[0].type === 'NewExpression' &&
    expression.arguments[0].callee?.type === 'Identifier'
  ) {
    return expression.arguments[0].callee.name;
  }
  return null;
};

const getClassNameFromThisServiceMethod = (expression: TSESTree.Expression): string | null => {
  if (
    expression.type === 'CallExpression' &&
    expression.callee.type === 'MemberExpression' &&
    expression.callee.object.type === 'MemberExpression' &&
    expression.callee.object.object.type === 'ThisExpression' &&
    expression.callee.object.property.type === 'Identifier'
  ) {
    return expression.callee.object.property.name;
  }
  return null;
};

const doesReturnClassInstance = (expression: TSESTree.Expression, typeName: string, extractedTypes: string[]) => {
  // Handle class instance
  if (getClassName(expression) === typeName) {
    return true;
  }
  // Handle array of class instances
  if (getClassNameFromArray(expression) === typeName) {
    return true;
  }
  if (getClassNameFromMap(expression) === typeName) {
    return true;
  }
  if (getClassNameFromPromiseResolve(expression) === typeName) {
    return true;
  }
  if (getClassNameFromThisServiceMethod(expression)) {
    return true;
  }

  // Handle literal types and null/undefined
  if (expression?.type === 'Literal' || expression === null) {
    return expression?.value?.toString()
      ? extractedTypes.includes(expression.value.toString())
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

          const returnStatements = node.value?.body?.body?.filter((node) => node.type === 'ReturnStatement');
          const methodReturnsClassInstance = returnStatements
            ? returnStatements.every((returnStatement) =>
                returnStatement.argument
                  ? doesReturnClassInstance(returnStatement.argument, typeName, extractedTypes)
                  : false,
              )
            : false;

          if (!methodReturnsClassInstance) {
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
