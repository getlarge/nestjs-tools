## 0.7.0 (2025-01-31)

### 🚀 Features

- enhance AMQP transport with event handling and connection status management ([5145719](https://github.com/getlarge/nestjs-tools/commit/5145719))

### 🩹 Fixes

- update SonarCloud scan action to version v4.2.1 ([62fa32b](https://github.com/getlarge/nestjs-tools/commit/62fa32b))
- update SonarCloud GitHub action to use SonarQube scan action version 4 ([69992ae](https://github.com/getlarge/nestjs-tools/commit/69992ae))
- update RabbitMQ Docker image to version 4-management-alpine ([021d6e8](https://github.com/getlarge/nestjs-tools/commit/021d6e8))
- update peer dependencies for NestJS to version 11 and disable legacy cache ([69c5701](https://github.com/getlarge/nestjs-tools/commit/69c5701))
- update AmqpClient to use string type for RmqStatus ([46f1528](https://github.com/getlarge/nestjs-tools/commit/46f1528))
- update NestJS and related package versions to latest ([c041cd5](https://github.com/getlarge/nestjs-tools/commit/c041cd5))
- update peer dependencies for NestJS and TypeScript packages ([3fe6045](https://github.com/getlarge/nestjs-tools/commit/3fe6045))
- **eslint-plugin-nestjs-tools:** follow eslint plugin recommendations ([45dc0a0](https://github.com/getlarge/nestjs-tools/commit/45dc0a0))

### 🧱 Updated Dependencies

- Updated typed-event-emitter to 0.2.1

### ❤️ Thank You

- getlarge

## 0.6.0 (2024-06-07)

### 🚀 Features

- **nestjs-tools-amqp-transport:** add custom event handler ([ea215d5](https://github.com/getlarge/nestjs-tools/commit/ea215d5))

### 🩹 Fixes

- **nestjs-tools-amqp-transport:** create custom default deserializer to handle empty pattern ([8a4eaed](https://github.com/getlarge/nestjs-tools/commit/8a4eaed))

- **nestjs-tools-amqp-transport:** evaluate default options correctly ([077a2d2](https://github.com/getlarge/nestjs-tools/commit/077a2d2))

### ❤️ Thank You

- getlarge @getlarge

## 0.5.2 (2024-04-16)

### 🩹 Fixes

- **amqp-transport:** solve type issues and improve reconnection handling ([faf027c](https://github.com/getlarge/nestjs-tools/commit/faf027c))

### ❤️ Thank You

- getlarge @getlarge

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.5.1](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-amqp-transport@0.5.0...@s1seven/nestjs-tools-amqp-transport@0.5.1) (2023-09-04)

**Note:** Version bump only for package @s1seven/nestjs-tools-amqp-transport

# [0.5.0](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-amqp-transport@0.4.3...@s1seven/nestjs-tools-amqp-transport@0.5.0) (2023-01-05)

### Bug Fixes

- **amqp-transport:** wait for channel to be connected to set reply queue consumer ([d8346d3](https://github.com/s1seven/nestjs-tools/commit/d8346d3f7cea197251f49e203c2e90dbad3214c8))

### Features

- **amqp-transport:** add options to selectively enable amqp assertions ([b8b36c6](https://github.com/s1seven/nestjs-tools/commit/b8b36c6a15886e5a736649f2e0211051e2c88f5d))

## [0.4.3](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-amqp-transport@0.4.2...@s1seven/nestjs-tools-amqp-transport@0.4.3) (2022-12-21)

**Note:** Version bump only for package @s1seven/nestjs-tools-amqp-transport

## [0.4.2](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-amqp-transport@0.4.1...@s1seven/nestjs-tools-amqp-transport@0.4.2) (2022-12-07)

### Bug Fixes

- **amqp-transport:** set proper types for AmqpOptions.socketOptions ([f57a0d1](https://github.com/s1seven/nestjs-tools/commit/f57a0d152421347d3fa23f6f4b72792cc18a0f2e))

## [0.4.1](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-amqp-transport@0.4.0...@s1seven/nestjs-tools-amqp-transport@0.4.1) (2022-11-30)

### Bug Fixes

- **amqp-transport:** improve channel and reply queue handling in producer ([717c08d](https://github.com/s1seven/nestjs-tools/commit/717c08d70d99326d6893635de47d9c9d622229ff))
- **amqp-transport:** improve channel error handling in consumer ([e0eb127](https://github.com/s1seven/nestjs-tools/commit/e0eb127d0319c8259d46177860b4ddbf3068ce24))
- **amqp-transport:** wait for channel readiness ([b43a667](https://github.com/s1seven/nestjs-tools/commit/b43a667a853a9ebed75e80549fd2b24d2a9889ab))

# [0.4.0](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-amqp-transport@0.3.2...@s1seven/nestjs-tools-amqp-transport@0.4.0) (2022-09-14)

### Bug Fixes

- **amqp-transport:** handle channel setup errors ([cafa1df](https://github.com/s1seven/nestjs-tools/commit/cafa1df5492e18b97c9333b8955c9fe06ff8df70))

### Features

- **amqp-transport:** apply latest changes from NestJS RMQ ([357bb9e](https://github.com/s1seven/nestjs-tools/commit/357bb9ee369d3849666e627da01c48a1134e03b0))

## [0.3.2](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-amqp-transport@0.3.1...@s1seven/nestjs-tools-amqp-transport@0.3.2) (2022-08-09)

**Note:** Version bump only for package @s1seven/nestjs-tools-amqp-transport

## [0.3.1](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-amqp-transport@0.3.0...@s1seven/nestjs-tools-amqp-transport@0.3.1) (2022-08-03)

### Bug Fixes

- **amqp-transport:** add missing callback ([036c1e6](https://github.com/s1seven/nestjs-tools/commit/036c1e6a50e5abc3602d94d6a907399d4364c10c))

# [0.3.0](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-amqp-transport@0.2.2...@s1seven/nestjs-tools-amqp-transport@0.3.0) (2022-06-14)

### Bug Fixes

- **amqp-transport:** improve message and errors handling ([db8d334](https://github.com/s1seven/nestjs-tools/commit/db8d33497d6c54f04ab16657bd1f0ab2bbf38ac5))

### Features

- **amqp-transport:** add AMQP record serializer ([edc4b7e](https://github.com/s1seven/nestjs-tools/commit/edc4b7eec751145c989ef4e2321e29f6c8dd45d9))

## [0.2.2](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-amqp-transport@0.2.1...@s1seven/nestjs-tools-amqp-transport@0.2.2) (2022-06-02)

**Note:** Version bump only for package @s1seven/nestjs-tools-amqp-transport

## 0.2.1 (2022-03-17)

**Note:** Version bump only for package @s1seven/nestjs-tools-amqp-transport

# [0.2.0](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-amqp-transport@0.1.3...@s1seven/microservices-amqp-transport@0.2.0) (2022-02-10)

### Features

- **amqp-transport:** integrate new `connectFailed` event ([37a7fcb](https://github.com/s1seven/microservices-common/commit/37a7fcba2f31a97aeeffd630aff497d8e9e68ef2))

## [0.1.3](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-amqp-transport@0.1.2...@s1seven/microservices-amqp-transport@0.1.3) (2021-11-22)

**Note:** Version bump only for package @s1seven/microservices-amqp-transport

## [0.1.2](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-amqp-transport@0.1.1...@s1seven/microservices-amqp-transport@0.1.2) (2021-10-29)

**Note:** Version bump only for package @s1seven/microservices-amqp-transport

## [0.1.1](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-amqp-transport@0.1.0...@s1seven/microservices-amqp-transport@0.1.1) (2021-10-08)

**Note:** Version bump only for package @s1seven/microservices-amqp-transport

# 0.1.0 (2021-09-20)

### Bug Fixes

- allow deserialize to be a promise ([f958f1d](https://github.com/s1seven/microservices-common/commit/f958f1db10c2455165017c463af4d50533e09cca))

### Features

- create amqp-transport package ([c26c394](https://github.com/s1seven/microservices-common/commit/c26c394512c599357f45930a8a5c6af3d17ca296))
