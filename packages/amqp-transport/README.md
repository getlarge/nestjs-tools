# AMQP Transport

[![npm][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/@getlarge/nestjs-tools-amqp-transport.svg?style=flat
[npm-url]: https://npmjs.org/package/@getlarge/nestjs-tools-amqp-transport

A custom AMQP strategy for Nest microservice transport, which extends NestJS AMQP [producer](https://github.com/nestjs/nest/blob/master/packages/microservices/client/client-rmq.ts) and [consumer](https://github.com/nestjs/nest/blob/master/packages/microservices/server/server-rmq.ts) by adding support for:

- exchanges
- reply queue assertion

By enabling exchanges you can broadcast messages to multiple queues, and by asserting reply queue you can ensure that reply queue with static name exists.

## Example

The integration tests contain an [example consumer](./test/dummy-consumer.controller.mock.ts) and [example producer](./test/dummy-producer.service.mock.ts) that demonstrate how to use this library.
