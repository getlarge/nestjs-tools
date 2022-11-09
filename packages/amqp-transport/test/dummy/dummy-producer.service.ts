import { Inject, Injectable } from '@nestjs/common/decorators';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { DUMMY_CLIENT, DUMMY_TOPIC } from './dummy.constants';

@Injectable()
export class DummyProducerService {
  constructor(@Inject(DUMMY_CLIENT) private readonly client: ClientProxy) {}

  test(msg: Record<string, any>) {
    const response$ = this.client.send(DUMMY_TOPIC, msg).pipe(
      catchError((err) => {
        console.error(err);
        return throwError(() => err);
      }),
    );

    return lastValueFrom(response$);
  }
}
