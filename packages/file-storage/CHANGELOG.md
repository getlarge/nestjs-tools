## 1.4.2 (2025-01-31)

### 🩹 Fixes

- update SonarCloud scan action to version v4.2.1 ([62fa32b](https://github.com/getlarge/nestjs-tools/commit/62fa32b))
- update SonarCloud GitHub action to use SonarQube scan action version 4 ([69992ae](https://github.com/getlarge/nestjs-tools/commit/69992ae))
- update RabbitMQ Docker image to version 4-management-alpine ([021d6e8](https://github.com/getlarge/nestjs-tools/commit/021d6e8))
- update peer dependencies for NestJS to version 11 and disable legacy cache ([69c5701](https://github.com/getlarge/nestjs-tools/commit/69c5701))
- update NestJS and related package versions to latest ([c041cd5](https://github.com/getlarge/nestjs-tools/commit/c041cd5))
- update peer dependencies for NestJS and TypeScript packages ([3fe6045](https://github.com/getlarge/nestjs-tools/commit/3fe6045))
- **eslint-plugin-nestjs-tools:** follow eslint plugin recommendations ([45dc0a0](https://github.com/getlarge/nestjs-tools/commit/45dc0a0))

### ❤️ Thank You

- getlarge

## 1.4.1 (2024-09-13)


### 🩹 Fixes

- **nestjs-tools-file-storage:** improve directory handling in write method ([1659eca](https://github.com/getlarge/nestjs-tools/commit/1659eca))


### ❤️  Thank You

- getlarge

## 1.4.0 (2024-08-07)


### 🚀 Features

- **nestjs-tools-file-storage:** implement `getFileMeta` methods ([f7266eb](https://github.com/getlarge/nestjs-tools/commit/f7266eb))

- **nestjs-tools-file-storage:** update FileStorageService ([5ff2500](https://github.com/getlarge/nestjs-tools/commit/5ff2500))


### 🩹 Fixes

- **nestjs-tools-file-storage:** restore GC serializer ([e78b1c1](https://github.com/getlarge/nestjs-tools/commit/e78b1c1))


### ❤️  Thank You

- getlarge

## 1.3.0 (2024-08-03)

### 🚀 Features

- **nestjs-tools-file-storage:** enable to serialize `readDir` output ([a80febb](https://github.com/getlarge/nestjs-tools/commit/a80febb))

### 🩹 Fixes

- **nestjs-tools-file-storage:** add missing exports ([720c1ad](https://github.com/getlarge/nestjs-tools/commit/720c1ad))

### ❤️ Thank You

- getlarge

## 1.2.0 (2024-08-02)

### 🚀 Features

- **nestjs-tools-file-storage:** create moveFile interfaces and methods ([b33bc32](https://github.com/getlarge/nestjs-tools/commit/b33bc32))

### ❤️ Thank You

- getlarge

## 1.1.0 (2024-07-12)

### 🚀 Features

- **nestjs-tools-file-storage:** integrate Google storage API ([ff2aa79](https://github.com/getlarge/nestjs-tools/commit/ff2aa79))

- **nestjs-tools-file-storage:** add Google File storage strategy ([126af14](https://github.com/getlarge/nestjs-tools/commit/126af14))

- **nestjs-tools-file-storage:** add projectId option to GC file storage ([d901552](https://github.com/getlarge/nestjs-tools/commit/d901552))

- **nestjs-tools-file-storage:** resolve boolean for fileExists ([6bad25f](https://github.com/getlarge/nestjs-tools/commit/6bad25f))

### 🩹 Fixes

- **nestjs-tools-file-storage:** prevent path traversal in default filePath factory ([975e483](https://github.com/getlarge/nestjs-tools/commit/975e483))

- **nestjs-tools-file-storage:** fix path traversal check in file storage class ([bec11ec](https://github.com/getlarge/nestjs-tools/commit/bec11ec))

### ❤️ Thank You

- getlarge @getlarge

# 1.0.0 (2024-04-16)

### 🚀 Features

- **file-storage:** create `FileStorageModule` ([07237e1](https://github.com/getlarge/nestjs-tools/commit/07237e1))

- **file-storage:** emit 'done' event once file is fully written ([f8b1a02](https://github.com/getlarge/nestjs-tools/commit/f8b1a02))

### 🩹 Fixes

- **file-storage:** correctly spread credentials propetry ([f26ed81](https://github.com/getlarge/nestjs-tools/commit/f26ed81))

### ❤️ Thank You

- Eamon
- Edouard @getlarge
- getlarge @getlarge

# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.8.0](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-file-storage@0.7.0...@s1seven/nestjs-tools-file-storage@0.8.0) (2023-10-11)

### Features

- **file-storage:** create FileStorageWritable type with `done` event ([6eed261](https://github.com/s1seven/nestjs-tools/commit/6eed261c06f147f5bddd2b9e643da2c52fcd32af))
- **file-storage:** emit 'done' event once file is fully written ([f8b1a02](https://github.com/s1seven/nestjs-tools/commit/f8b1a02eef9924f51da3105315cb476d643865d7))

# [0.7.0](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-file-storage@0.6.3...@s1seven/nestjs-tools-file-storage@0.7.0) (2023-09-04)

### Bug Fixes

- **file-storage:** correctly spread credentials propetry ([f26ed81](https://github.com/s1seven/nestjs-tools/commit/f26ed8130cf14eb25fc5dcc57b92b6e7391c0857))
- **file-storage:** update types and imports ([fe68063](https://github.com/s1seven/nestjs-tools/commit/fe680630c9392f85d6920f243ceb6eec65ba5596))

### Features

- **file-storage:** allow custom S3 logger and make config readonly ([2a09f02](https://github.com/s1seven/nestjs-tools/commit/2a09f0238ea26bf057e6df1c5b301cf22a6ea07f))

## [0.6.3](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-file-storage@0.6.2...@s1seven/nestjs-tools-file-storage@0.6.3) (2023-04-05)

**Note:** Version bump only for package @s1seven/nestjs-tools-file-storage

## [0.6.2](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-file-storage@0.6.1...@s1seven/nestjs-tools-file-storage@0.6.2) (2023-04-04)

### BREAKING CHANGES

Use AWS SDK v3:

- `accessKeyId` and `secretAccessKey` should be passed to `FileStorageS3Setup` as properties of a `credentials` object.
- The `s3BucketEndpoint` property has been removed.
- In AWS SDK v3, the `endpoint` property has been replaced by `region`. For compatibility, we currently extract the region from an `endpoint` url if it is present and the `region` property is not, but you should update to `region` as this may change in future updates.

### Bug Fixes

- return folders and filenames from readDir S3 ([d6437fa](https://github.com/s1seven/nestjs-tools/commit/d6437fa5155177baf7ed13dfafaa527e82731256))

## [0.6.1](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-file-storage@0.6.0...@s1seven/nestjs-tools-file-storage@0.6.1) (2022-11-30)

### Bug Fixes

- **file-storage:** update invalid type check ([397f877](https://github.com/s1seven/nestjs-tools/commit/397f8776766aec97c96cfe70067935c03b6496bf))

### Reverts

- **file-storage:** come back to computed property ([76f6680](https://github.com/s1seven/nestjs-tools/commit/76f6680bb1e1157aea5b8ac168c05a846d498751))

# [0.6.0](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-file-storage@0.5.0...@s1seven/nestjs-tools-file-storage@0.6.0) (2022-10-31)

### Bug Fixes

- **file-storage:** update stream methods return type ([4de6fc8](https://github.com/s1seven/nestjs-tools/commit/4de6fc8c45a6189dc6348fa540928c0181f42c84))
- **file-storage:** use S3 managed upload to make writeStream work ([8f9a314](https://github.com/s1seven/nestjs-tools/commit/8f9a31425e367f4a1d8a3921a820ba9291b5090e))

### Features

- **file-storage:** create and apply internal MethodType ([b77fdc0](https://github.com/s1seven/nestjs-tools/commit/b77fdc0071521415ce7afc7270cf281d365fc1bb))

# [0.5.0](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-file-storage@0.4.8...@s1seven/nestjs-tools-file-storage@0.5.0) (2022-10-27)

### Bug Fixes

- **file-storage:** remove `toLowerCase` ([4245d45](https://github.com/s1seven/nestjs-tools/commit/4245d450a9159e75337db9131c9c6c9e8ba01d67))

### Features

- add deleteDir and readDir methods to FileStorageLocal ([f32db73](https://github.com/s1seven/nestjs-tools/commit/f32db730d058e0f9597cdd85b2490961fb932e1d))
- add deleteDir and readDir methods to FileStorageS3 ([1f9d517](https://github.com/s1seven/nestjs-tools/commit/1f9d5178960996adf68562ef75c9f19029a6f26e))
- **file-storage:** create `FileStorageModule` ([07237e1](https://github.com/s1seven/nestjs-tools/commit/07237e1321468ba167fd5b5957e5c24a590d0f5f))
- **file-storage:** create `FileStorageService` ([e332a0e](https://github.com/s1seven/nestjs-tools/commit/e332a0ecfa4d91253c01c9d2ff0c0dd7b4fbd885))

## [0.4.8](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-file-storage@0.4.7...@s1seven/nestjs-tools-file-storage@0.4.8) (2022-08-09)

**Note:** Version bump only for package @s1seven/nestjs-tools-file-storage

## [0.4.7](https://github.com/s1seven/nestjs-tools/compare/@s1seven/nestjs-tools-file-storage@0.4.6...@s1seven/nestjs-tools-file-storage@0.4.7) (2022-06-02)

**Note:** Version bump only for package @s1seven/nestjs-tools-file-storage

## 0.4.6 (2022-03-17)

**Note:** Version bump only for package @s1seven/nestjs-tools-file-storage

## [0.4.5](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.4.4...@s1seven/microservices-file-storage@0.4.5) (2022-02-10)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.4.4](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.4.3...@s1seven/microservices-file-storage@0.4.4) (2021-11-22)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.4.3](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.4.2...@s1seven/microservices-file-storage@0.4.3) (2021-10-29)

### Bug Fixes

- **file-storage:** update FS type ([ee7f693](https://github.com/s1seven/microservices-common/commit/ee7f693036995340ce39bd2fb45c8ab5caa06348))

## [0.4.2](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.4.1...@s1seven/microservices-file-storage@0.4.2) (2021-10-08)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.4.1](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.4.0...@s1seven/microservices-file-storage@0.4.1) (2021-10-07)

**Note:** Version bump only for package @s1seven/microservices-file-storage

# [0.4.0](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.32...@s1seven/microservices-file-storage@0.4.0) (2021-09-28)

### Features

- add extra common class in FileStorage ([1deb63f](https://github.com/s1seven/microservices-common/commit/1deb63f2289b194cee260e928be3ebb7a73e198b))

## [0.3.32](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.31...@s1seven/microservices-file-storage@0.3.32) (2021-09-24)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.31](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.30...@s1seven/microservices-file-storage@0.3.31) (2021-09-20)

### Bug Fixes

- update setup types ([2dd0e10](https://github.com/s1seven/microservices-common/commit/2dd0e10b8209444b4cb3fd5a30e4c7b63246f5b3))

## [0.3.30](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.29...@s1seven/microservices-file-storage@0.3.30) (2021-09-02)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.29](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.28...@s1seven/microservices-file-storage@0.3.29) (2021-09-02)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.28](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.27...@s1seven/microservices-file-storage@0.3.28) (2021-09-01)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.27](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.26...@s1seven/microservices-file-storage@0.3.27) (2021-08-27)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.26](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.25...@s1seven/microservices-file-storage@0.3.26) (2021-08-27)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.25](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.24...@s1seven/microservices-file-storage@0.3.25) (2021-08-23)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.24](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.23...@s1seven/microservices-file-storage@0.3.24) (2021-08-23)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.23](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.22...@s1seven/microservices-file-storage@0.3.23) (2021-08-06)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.22](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.21...@s1seven/microservices-file-storage@0.3.22) (2021-07-28)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.21](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.20...@s1seven/microservices-file-storage@0.3.21) (2021-07-26)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.20](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.19...@s1seven/microservices-file-storage@0.3.20) (2021-07-26)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.19](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.18...@s1seven/microservices-file-storage@0.3.19) (2021-07-20)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.18](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.17...@s1seven/microservices-file-storage@0.3.18) (2021-07-15)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.17](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.16...@s1seven/microservices-file-storage@0.3.17) (2021-07-12)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.16](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.15...@s1seven/microservices-file-storage@0.3.16) (2021-07-09)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.15](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.14...@s1seven/microservices-file-storage@0.3.15) (2021-07-08)

### Bug Fixes

- add config to lint command ([c9e099e](https://github.com/s1seven/microservices-common/commit/c9e099e5f85e916e6700f8caa2a3385c7e6193da))
- lint ([9a2e6ac](https://github.com/s1seven/microservices-common/commit/9a2e6ac0b6ca1404d2c3856394167e8b56d2e8c0))

## [0.3.14](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.13...@s1seven/microservices-file-storage@0.3.14) (2021-07-02)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.13](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.12...@s1seven/microservices-file-storage@0.3.13) (2021-06-29)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.12](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.11...@s1seven/microservices-file-storage@0.3.12) (2021-06-24)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.11](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.10...@s1seven/microservices-file-storage@0.3.11) (2021-06-24)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.10](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.9...@s1seven/microservices-file-storage@0.3.10) (2021-06-23)

### Bug Fixes

- update lock files ([ffdff97](https://github.com/s1seven/microservices-common/commit/ffdff976fcca3197189a9fb8bc2401783d165421))

## [0.3.9](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.8...@s1seven/microservices-file-storage@0.3.9) (2021-06-22)

### Bug Fixes

- update lock files ([809eca0](https://github.com/s1seven/microservices-common/commit/809eca0bdf2ea84b8d1fa5256c923b8859cf43dd))

## [0.3.8](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.7...@s1seven/microservices-file-storage@0.3.8) (2021-06-22)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.7](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.6...@s1seven/microservices-file-storage@0.3.7) (2021-06-18)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.6](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.5...@s1seven/microservices-file-storage@0.3.6) (2021-06-16)

### Bug Fixes

- update lock files ([a664b61](https://github.com/s1seven/microservices-common/commit/a664b6104585c383ce980c67dd3fbd5fe466f57b))

## [0.3.5](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.4...@s1seven/microservices-file-storage@0.3.5) (2021-06-15)

### Bug Fixes

- update lock files ([f85a710](https://github.com/s1seven/microservices-common/commit/f85a710a47a181de0195f61e30c926503706b0e8))

## [0.3.4](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.3...@s1seven/microservices-file-storage@0.3.4) (2021-06-14)

### Bug Fixes

- update lock files ([21e3749](https://github.com/s1seven/microservices-common/commit/21e37491ed509ff00bc4a82575600c13e83334fc))

## [0.3.3](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.2...@s1seven/microservices-file-storage@0.3.3) (2021-06-08)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.3.2](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.1...@s1seven/microservices-file-storage@0.3.2) (2021-06-01)

### Bug Fixes

- update lock files ([540bff7](https://github.com/s1seven/microservices-common/commit/540bff76269fd062d0e101e4efbe02b90068e251))

## [0.3.1](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.3.0...@s1seven/microservices-file-storage@0.3.1) (2021-05-28)

### Bug Fixes

- update lock files ([c72828f](https://github.com/s1seven/microservices-common/commit/c72828f5c6a5938db641b38dbb5a9e04f49bed6a))

# [0.3.0](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.41...@s1seven/microservices-file-storage@0.3.0) (2021-05-27)

### Features

- change return type of transformFilePath ([5ed73f0](https://github.com/s1seven/microservices-common/commit/5ed73f057bb2938f8a3a0c2240c6c65ab5017ed6))

## [0.2.41](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.40...@s1seven/microservices-file-storage@0.2.41) (2021-05-25)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.40](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.39...@s1seven/microservices-file-storage@0.2.40) (2021-05-20)

### Bug Fixes

- cleanup code ([aea0191](https://github.com/s1seven/microservices-common/commit/aea0191371577031ef9816809aafa646f497ecf6))
- remove duplicate strings ([460f68e](https://github.com/s1seven/microservices-common/commit/460f68e1b6a7b18f9d08d0eda1011bbc44b6ebcb))
- update package lock ([e109680](https://github.com/s1seven/microservices-common/commit/e10968011e307b42020580418fa435f5c8e37632))

## [0.2.39](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.38...@s1seven/microservices-file-storage@0.2.39) (2021-05-06)

### Bug Fixes

- update package lock ([a463855](https://github.com/s1seven/microservices-common/commit/a4638552e2810e9b0e24bd684b67c90fa61a0519))

## [0.2.38](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.37...@s1seven/microservices-file-storage@0.2.38) (2021-05-03)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.37](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.36...@s1seven/microservices-file-storage@0.2.37) (2021-04-22)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.36](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.35...@s1seven/microservices-file-storage@0.2.36) (2021-04-21)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.35](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.34...@s1seven/microservices-file-storage@0.2.35) (2021-04-21)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.34](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.33...@s1seven/microservices-file-storage@0.2.34) (2021-04-20)

### Bug Fixes

- update package lock ([68e574b](https://github.com/s1seven/microservices-common/commit/68e574bc28349a41cbd9a94b9591601521918cb5))

## [0.2.33](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.32...@s1seven/microservices-file-storage@0.2.33) (2021-04-16)

### Bug Fixes

- update pkg lock ([cb8db23](https://github.com/s1seven/microservices-common/commit/cb8db233b03e9f47d9213854774da1748824087d))

## [0.2.32](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.31...@s1seven/microservices-file-storage@0.2.32) (2021-04-16)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.31](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.30...@s1seven/microservices-file-storage@0.2.31) (2021-04-16)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.30](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.29...@s1seven/microservices-file-storage@0.2.30) (2021-04-14)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.29](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.28...@s1seven/microservices-file-storage@0.2.29) (2021-04-13)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.28](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.27...@s1seven/microservices-file-storage@0.2.28) (2021-04-12)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.27](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.26...@s1seven/microservices-file-storage@0.2.27) (2021-04-09)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.26](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.25...@s1seven/microservices-file-storage@0.2.26) (2021-04-08)

### Bug Fixes

- update package lock ([bc06109](https://github.com/s1seven/microservices-common/commit/bc06109abaf4080ffe406998bc5b587554390460))

## [0.2.25](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.24...@s1seven/microservices-file-storage@0.2.25) (2021-04-07)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.24](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.23...@s1seven/microservices-file-storage@0.2.24) (2021-04-02)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.23](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.22...@s1seven/microservices-file-storage@0.2.23) (2021-04-02)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.22](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.21...@s1seven/microservices-file-storage@0.2.22) (2021-03-30)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.21](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.20...@s1seven/microservices-file-storage@0.2.21) (2021-03-29)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.20](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.19...@s1seven/microservices-file-storage@0.2.20) (2021-03-29)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.19](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.18...@s1seven/microservices-file-storage@0.2.19) (2021-03-24)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.18](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.17...@s1seven/microservices-file-storage@0.2.18) (2021-03-23)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.17](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.16...@s1seven/microservices-file-storage@0.2.17) (2021-03-23)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.16](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.15...@s1seven/microservices-file-storage@0.2.16) (2021-03-23)

### Bug Fixes

- package conf ([b459fcf](https://github.com/s1seven/microservices-common/commit/b459fcfb84e821751a76be51a3e7c3bd14b6b3e7))

## [0.2.15](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.14...@s1seven/microservices-file-storage@0.2.15) (2021-03-23)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.14](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.13...@s1seven/microservices-file-storage@0.2.14) (2021-03-22)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.13](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.12...@s1seven/microservices-file-storage@0.2.13) (2021-03-15)

### Bug Fixes

- update dependencies ([c4c5c20](https://github.com/s1seven/microservices-common/commit/c4c5c205f5a6c04ab24151a849ebb22652967ebd))

## [0.2.12](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.11...@s1seven/microservices-file-storage@0.2.12) (2021-03-11)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.11](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.10...@s1seven/microservices-file-storage@0.2.11) (2021-03-03)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.10](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.9...@s1seven/microservices-file-storage@0.2.10) (2021-03-03)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.9](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.8...@s1seven/microservices-file-storage@0.2.9) (2021-02-09)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.8](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.7...@s1seven/microservices-file-storage@0.2.8) (2021-02-08)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.7](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.6...@s1seven/microservices-file-storage@0.2.7) (2021-02-05)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.6](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.5...@s1seven/microservices-file-storage@0.2.6) (2021-02-05)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.5](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.4...@s1seven/microservices-file-storage@0.2.5) (2021-02-04)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.4](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.3...@s1seven/microservices-file-storage@0.2.4) (2021-02-04)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.3](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.2...@s1seven/microservices-file-storage@0.2.3) (2021-02-02)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.2](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.1...@s1seven/microservices-file-storage@0.2.2) (2021-02-01)

**Note:** Version bump only for package @s1seven/microservices-file-storage

## [0.2.1](https://github.com/s1seven/microservices-common/compare/@s1seven/microservices-file-storage@0.2.0...@s1seven/microservices-file-storage@0.2.1) (2021-02-01)

**Note:** Version bump only for package @s1seven/microservices-file-storage

# 0.2.0 (2021-01-27)

### Bug Fixes

- improve types and add fileExists methodÏ ([fd655f5](https://github.com/s1seven/microservices-common/commit/fd655f5bb95a74fb60963db7232471d1ff2593ca))

### Features

- migrate project to lerna ([fef948c](https://github.com/s1seven/microservices-common/commit/fef948c31e20e2f5b929a41a0ad09ae17bb3729f))
