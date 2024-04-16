<p align="center">
  <a href="https://github.com/getlarge/nestjs-tools/" target="blank"><img src="https://ipfs.io/ipfs/QmQ6CMaraTMrv8byJfY64mDM6o7citx1pgEobMKWEJaSCB?filename=ory-nestjs-min.png" width="120" alt="NestOry Logo" /></a>
</p>

# NestJS Tools

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache-yellow.svg)](https://opensource.org/license/apache-2-0)
[![CI](https://github.com/getlarge/nestjs-tools/actions/workflows/node.yml/badge.svg)](https://github.com/getlarge/nestjs-tools/actions/workflows/node.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=getlarge_nestjs-tools&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=getlarge_nestjs-tools)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

This repository contains several helpful packages for NestJS that I have developed for NestJS applications running in production.

## List of packages

| Package                                                         | Description                                                                                               | Version                                                                                                                                                            |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [AMQP-Transport](./packages/amqp-transport/README.md)           | A NestJS microservice adapter around [AMQPlib](https://amqp-node.github.io/amqplib/) supporting exchanges | [![npm](https://img.shields.io/npm/v/@getlarge/nestjs-tools-amqp-transport.svg?style=flat)](https://npmjs.org/package/@getlarge/nestjs-tools-amqp-transport)       |
| [Async-Local-Storage](./packages/async-local-storage/README.md) | A NestJS module to provide async local storage for your application                                       | [![npm](https://img.shields.io/npm/v/@getlarge/nestjs-tools-async-local-storage?style=flat)](https://npmjs.org/package/@getlarge/nestjs-tools-async-local-storage) |
| [File-Storage](./packages/file-storage/README.md)               | A NestJS module supporting FS and S3 strategies                                                           | [![npm](https://img.shields.io/npm/v/@getlarge/nestjs-tools-file-storage?style=flat)](https://npmjs.org/package/@getlarge/nestjs-tools-file-storage)               |
| [Lock](./packages/lock/README.md)                               | A NestJS module to provide a distributed lock for your application                                        | [![npm](https://img.shields.io/npm/v/@getlarge/nestjs-tools-lock?style=flat)](https://npmjs.org/package/@getlarge/nestjs-tools-lock)                               |

## Installation and usage

Check the README of each package for more details.

## Examples

Check out the following projects for examples of using these packages:

- the [ticketing repository](https://github.com/getlarge/ticketing) is a real-world example of AMQP-Transport, File-Storage, Lock,
