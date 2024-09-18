# eslint-plugin

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@getlarge/eslint-plugin-nestjs-tools.svg?style=flat
[npm-url]: https://npmjs.org/package/@getlarge/eslint-plugin-nestjs-tools

This set of ESLint rules is provided to enforce a consistent patterns and practices across all NestJS projects.

## Installation

```bash
npm install --save @getlarge/eslint-plugin-nestjs-tools
```

## Usage

### return-class-instance

This rule enforces that all public Service methods return a class instance of the same return type.
The purpose of this rule is to ensure you return class instances instead of plain objects, which is essentials when using the [`ClassSerializerInterceptor`](https://docs.nestjs.com/techniques/serialization#class-serializer-interceptor).

In order to use this rule, add it to your ESLint configuration file:

```json
{
  "files": ["*.ts", "*.tsx"],
  "plugins": ["@getlarge/nestjs-tools"],
  "rules": {
    "@getlarge/nestjs-tools/return-class-instance": "error"
  }
}
```
