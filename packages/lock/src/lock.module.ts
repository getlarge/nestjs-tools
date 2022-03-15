import { Abstract, DynamicModule, Module, ModuleMetadata, Provider, Type } from '@nestjs/common';
import type { ClientOpts } from 'redis';

import { LOCK_SERVICE_OPTIONS } from './constants';

// eslint-disable-next-line @typescript-eslint/ban-types
export type Injection = (Type<unknown> | string | symbol | Abstract<unknown> | Function)[];
export interface LockModuleModuleAsyncOptions extends Pick<ModuleMetadata, 'imports' | 'providers'> {
  name?: string;
  useClass?: Type;
  useFactory?: (...args: any[]) => ClientOpts;
  inject?: Injection;
}

@Module({})
export class LockModule {
  public static forRoot(options?: ClientOpts): DynamicModule {
    return {
      module: LockModule,
      providers: [
        {
          provide: LOCK_SERVICE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [
        {
          provide: LOCK_SERVICE_OPTIONS,
          useValue: options,
        },
      ],
    };
  }

  public static forRootAsync(options: LockModuleModuleAsyncOptions): DynamicModule {
    const { inject = [], imports = [], useFactory, useClass } = options;
    let provider: Provider = {
      provide: LOCK_SERVICE_OPTIONS,
      useFactory,
      inject,
    };

    if (useClass) {
      provider = { ...provider, useClass };
    }

    return {
      module: LockModule,
      imports,
      providers: [provider],
      exports: [provider],
    };
  }
}
