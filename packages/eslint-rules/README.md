# eslint-rules

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@getlarge/nestjs-tools-eslint-rules.svg?style=flat
[npm-url]: https://npmjs.org/package/@getlarge/nestjs-tools-eslint-rules

This set of ESLint rules is provided to enforce a consistent patterns and practices across all NestJS projects.

## Installation

```bash
npm install --save @getlarge/nestjs-tools-eslint-rules
```

## Usage

### return-class-instance

This rule enforces that all public Service methods return a class instance of the same return type.
The purpose of this rule is to ensure you return class instances instead of plain objects, which is essentials when using the [`ClassSerializerInterceptor`](https://docs.nestjs.com/techniques/serialization#class-serializer-interceptor).

```json
{
  "rules": {
    "@getlarge/nestjs-tools-eslint-rules/return-class-instance": "error",
  }
}
```
