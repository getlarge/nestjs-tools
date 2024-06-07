/* eslint-disable @typescript-eslint/no-explicit-any */
import { isObject, isUndefined } from '@nestjs/common/utils/shared.utils';
import { ConsumerDeserializer, ReadPacket, RmqRecord, Serializer } from '@nestjs/microservices';
import type { ConsumeMessage } from 'amqplib';

export type SerializerOutput<T = any> = ReadPacket<T> & Partial<RmqRecord<T>>;

export class AmqpRecordSerializer<T = any> implements Serializer<ReadPacket<T>, SerializerOutput<T>> {
  serialize(packet: ReadPacket<T> | any): SerializerOutput<T> {
    if (packet?.data && isObject(packet.data) && packet.data instanceof RmqRecord) {
      const record: RmqRecord<T> = packet.data;
      return {
        ...packet,
        data: record.data,
        options: record.options,
      };
    }
    return packet;
  }
}

export class AmqpRecordConsumerDeserializer implements ConsumerDeserializer {
  deserialize(message: ConsumeMessage, options?: Record<string, any>) {
    const { content } = message;
    const rawMessage = this.parseMessageContent(content);
    return this.isExternal(rawMessage) ? this.mapToSchema(rawMessage, message, options) : rawMessage;
  }

  parseMessageContent(content: Buffer) {
    try {
      return JSON.parse(content.toString());
    } catch {
      return content.toString();
    }
  }

  isExternal(value: any): boolean {
    if (!value) {
      return true;
    }
    if (!isUndefined(value.pattern) || !isUndefined(value.data)) {
      return false;
    }
    return true;
  }
  //     //         packet.pattern ??= message.fields.routingKey;

  mapToSchema(value: any, message: ConsumeMessage, options?: Record<string, any>) {
    if (!options) {
      return {
        pattern: undefined,
        data: undefined,
      };
    }
    return {
      pattern: options['channel'] ?? message.fields.routingKey,
      data: value,
    };
  }
}
