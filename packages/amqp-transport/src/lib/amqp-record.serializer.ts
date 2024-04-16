/* eslint-disable @typescript-eslint/no-explicit-any */
import { isObject } from '@nestjs/common/utils/shared.utils';
import { ReadPacket, RmqRecord, Serializer } from '@nestjs/microservices';

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
