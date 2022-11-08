import { Inject, Injectable } from '@nestjs/common/decorators';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

import { DUMMY_CLIENT, DUMMY_TOPIC } from './dummy.constants';

@Injectable()
export class DummyProducerService {
  constructor(@Inject(DUMMY_CLIENT) private readonly client: ClientProxy) {}

  test() {
    const response$ = this.client.send(DUMMY_TOPIC, {}).pipe();
    // catchError((err) => {
    //   this.logger.error(ctx, err);
    //   return throwError(() => errorFactory(err));
    // })
    return lastValueFrom(response$);
  }
}
