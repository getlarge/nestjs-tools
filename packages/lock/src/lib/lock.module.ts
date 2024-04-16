import { DynamicModule, InjectionToken, Module, ModuleMetadata, Provider, Type } from '@nestjs/common';

import { LOCK_SERVICE_OPTIONS } from './constants';
import { LockService, LockServiceOptions } from './lock.service';

export type Injection = InjectionToken[];
export interface LockModuleModuleAsyncOptions extends Pick<ModuleMetadata, 'imports' | 'providers'> {
  name?: string;
  useClass?: Type;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFactory?: (...args: any[]) => LockServiceOptions;
  inject?: Injection;
}

function getAsyncProviders(options: LockModuleModuleAsyncOptions): Provider[] {
  const { inject = [], useFactory, useClass } = options;
  if (useFactory && useClass) {
    throw new Error('Invalid configuration, useFactory and useClass should not be defined at the same time');
  }

  if (useFactory) {
    return [{ provide: LOCK_SERVICE_OPTIONS, useFactory, inject }, LockService];
  }
  if (useClass) {
    return [{ provide: LOCK_SERVICE_OPTIONS, useClass }, LockService];
  }
  throw new Error('Invalid configuration, useFactory or useClass should be defined');
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
    const { imports = [] } = options;
    const providers = getAsyncProviders(options);
    return {
      global: isGlobal,
      module: LockModule,
      imports,
      providers,
      exports: [LockService],
    };
  }
}
