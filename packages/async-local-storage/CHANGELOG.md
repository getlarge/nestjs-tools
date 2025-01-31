## 0.3.1 (2025-01-31)

### 🩹 Fixes

- update SonarCloud scan action to version v4.2.1 ([62fa32b](https://github.com/getlarge/nestjs-tools/commit/62fa32b))
- update SonarCloud GitHub action to use SonarQube scan action version 4 ([69992ae](https://github.com/getlarge/nestjs-tools/commit/69992ae))
- update RabbitMQ Docker image to version 4-management-alpine ([021d6e8](https://github.com/getlarge/nestjs-tools/commit/021d6e8))
- update peer dependencies for NestJS to version 11 and disable legacy cache ([69c5701](https://github.com/getlarge/nestjs-tools/commit/69c5701))
- update NestJS and related package versions to latest ([c041cd5](https://github.com/getlarge/nestjs-tools/commit/c041cd5))
- update peer dependencies for NestJS and TypeScript packages ([3fe6045](https://github.com/getlarge/nestjs-tools/commit/3fe6045))
- **eslint-plugin-nestjs-tools:** follow eslint plugin recommendations ([45dc0a0](https://github.com/getlarge/nestjs-tools/commit/45dc0a0))
- **nestjs-tools-amqp-transport:** evaluate default options correctly ([077a2d2](https://github.com/getlarge/nestjs-tools/commit/077a2d2))

### ❤️ Thank You

- getlarge

## 0.3.0 (2024-04-16)

### 🚀 Features

- add module implementation ([715e29d](https://github.com/getlarge/nestjs-tools/commit/715e29d))

### 🩹 Fixes

- remove default requestContext factory due to type issues ([f16b6a4](https://github.com/getlarge/nestjs-tools/commit/f16b6a4))

- throw errors before creating providers ([046fd4e](https://github.com/getlarge/nestjs-tools/commit/046fd4e))

- **nestjs-tools-async-local-storage:** use stricter typing ([e588371](https://github.com/getlarge/nestjs-tools/commit/e588371))

### ❤️ Thank You

- Edouard @getlarge
- getlarge @getlarge

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.2](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-async-local-storage@0.2.1...@s1seven/nestjs-tools-async-local-storage@0.2.2) (2023-09-04)

**Note:** Version bump only for package @s1seven/nestjs-tools-async-local-storage

## [0.2.1](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-async-local-storage@0.2.0...@s1seven/nestjs-tools-async-local-storage@0.2.1) (2023-02-06)

### Bug Fixes

- **async-local-storage:** make access to `AsyncLocalStorageService` static methods safe ([30c0770](https://github.com/s1seven/nestjs-tools/commit/30c07707945eaa06d45aa1d56c4cdf76b1fd5e19))

# [0.2.0](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-async-local-storage@0.1.0...@s1seven/nestjs-tools-async-local-storage@0.2.0) (2023-02-03)

### Bug Fixes

- remove default requestContext factory due to type issues ([f16b6a4](https://github.com/s1seven/nestjs-tools/commit/f16b6a40620fa2ade6ca77a11019d9f858fc1a30))
- throw errors before creating providers ([046fd4e](https://github.com/s1seven/nestjs-tools/commit/046fd4ef641bd9711be38b5dcb8ee459c6451800))

### Features

- add safety to store access via instance methods of `AsyncLocalStorageService` ([7c3db74](https://github.com/s1seven/nestjs-tools/commit/7c3db748a22fd96025b13397842a6f1bb3a3c394))
- **async-local-storage:** extends Map in `AsyncLocalStorageService` ([dbf9863](https://github.com/s1seven/nestjs-tools/commit/dbf9863fecde46dfa374e11a875fb75d0647d4af))

# 0.1.0 (2023-02-02)

### Features

- add module implementation ([715e29d](https://github.com/s1seven/nestjs-tools/commit/715e29d6f919fe88a0896fbf9a0bb7742d94bc6c))
