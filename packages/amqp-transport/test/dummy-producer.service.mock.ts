import { Inject, Injectable } from '@nestjs/common/decorators';
import { ClientProxy } from '@nestjs/microservices';
import { RQM_DEFAULT_NOACK } from '@nestjs/microservices/constants';
import { lastValueFrom, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

import {
  DUMMY_CLIENT,
  DUMMY_TOPIC_ACK,
  DUMMY_TOPIC_NOACK,
  DUMMY_WORKER_ID_ACK,
  DUMMY_WORKER_ID_NOACK,
} from './dummy.constants';

@Injectable()
export class DummyProducerService {
  private timeToTimeout = 1500; // ms
  constructor(
    @Inject(DUMMY_CLIENT) private readonly client: ClientProxy,
    @Inject('WORKER_ID') private readonly workerId = 0,
  ) {}

  test(msg: Record<string, unknown>, noAck = RQM_DEFAULT_NOACK) {
    const topic = noAck ? DUMMY_TOPIC_NOACK : DUMMY_TOPIC_ACK;
    const response$ = this.client.send(topic, { ...msg, producerId: this.workerId }).pipe(
      catchError((err) => {
        console.error(err);
        return throwError(() => err);
      }),
      timeout(this.timeToTimeout),
      catchError(() => {
        return throwError(() => 'TimeoutError');
      }),
    );

    return lastValueFrom(response$);
  }

  getConsumerWorkerId(noAck = RQM_DEFAULT_NOACK) {
    const topic = noAck ? DUMMY_WORKER_ID_NOACK : DUMMY_WORKER_ID_ACK;
    const response$ = this.client.send(topic, {}).pipe(
      catchError((err) => {
        console.error(err);
        return throwError(() => err);
      }),
    );

    return lastValueFrom(response$);
  }

  testAck(msg: Record<string, unknown>) {
    const response$ = this.client.send(DUMMY_TOPIC_ACK, msg).pipe(
      catchError((err) => {
        console.error(err);
        return throwError(() => err);
      }),
    );

    return lastValueFrom(response$);
  }

  testNoAck(msg: Record<string, unknown>) {
    const response$ = this.client.send(DUMMY_TOPIC_NOACK, msg).pipe(
      catchError((err) => {
        console.error(err);
        return throwError(() => err);
      }),
    );

    return lastValueFrom(response$);
  }
}
