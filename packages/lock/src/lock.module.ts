import { Abstract, DynamicModule, Module, ModuleMetadata, Provider, Type } from '@nestjs/common';

import { LOCK_SERVICE_OPTIONS } from './constants';
import { LockService, LockServiceOptions } from './lock.service';

// eslint-disable-next-line @typescript-eslint/ban-types
export type Injection = (Type<unknown> | string | symbol | Abstract<unknown> | Function)[];
export interface LockModuleModuleAsyncOptions extends Pick<ModuleMetadata, 'imports' | 'providers'> {
  name?: string;
  useClass?: Type;
  useFactory?: (...args: any[]) => LockServiceOptions;
  inject?: Injection;
}

@Module({})
export class LockModule {
  public static forRoot(options?: LockServiceOptions, isGlobal = false): DynamicModule {
    const providers = [
      {
        provide: LOCK_SERVICE_OPTIONS,
        useValue: options,
      },
      LockService,
    ];
    return {
      global: isGlobal,
      module: LockModule,
      providers,
      exports: providers,
    };
  }

  public static forRootAsync(options: LockModuleModuleAsyncOptions, isGlobal = false): DynamicModule {
    const { inject = [], imports = [], useFactory, useClass } = options;
    let provider: Provider = {
      provide: LOCK_SERVICE_OPTIONS,
      useFactory,
      inject,
    };

    if (useClass) {
      provider = { ...provider, useClass };
    }
    const providers = [provider, LockService];
    return {
      global: isGlobal,
      module: LockModule,
      imports,
      providers,
      exports: providers,
    };
  }
}
