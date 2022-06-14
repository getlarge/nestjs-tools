import { isObject } from '@nestjs/common/utils/shared.utils';
import { ReadPacket, RmqRecord, Serializer } from '@nestjs/microservices';

export class AmqpRecordSerializer implements Serializer<ReadPacket, ReadPacket & Partial<RmqRecord>> {
  serialize(packet: ReadPacket | any): ReadPacket & Partial<RmqRecord> {
    if (packet?.data && isObject(packet.data) && packet.data instanceof RmqRecord) {
      const record = packet.data as RmqRecord;
      return {
        ...packet,
        data: record.data,
        options: record.options,
      };
    }
    return packet;
  }
}
