import {
  CallHandler,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { GUARDS_METADATA, INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { ModuleRef } from '@nestjs/core';
import { defer, firstValueFrom, from, isObservable, Observable, of } from 'rxjs';

import { McpExecutionContext, McpRequestContext } from './mcp-execution-context';

export interface McpPipelineRunInit {
  handler: (...args: unknown[]) => unknown;
  providerClass: Type;
  methodName?: string;
  instance: object;
  request: McpRequestContext;
}

type GuardRef = CanActivate | Type<CanActivate>;
type InterceptorRef = NestInterceptor | Type<NestInterceptor>;

@Injectable()
export class McpPipelineRunner {
  constructor(private readonly moduleRef: ModuleRef) {}

  async run(init: McpPipelineRunInit): Promise<unknown> {
    const context = new McpExecutionContext(init);
    const guards = this.collect<GuardRef>(GUARDS_METADATA, init);
    for (const guard of guards) {
      const instance = await this.resolve<CanActivate>(guard);
      const allowed = await instance.canActivate(context);
      if (!allowed) {
        throw new ForbiddenException(`Access denied for MCP ${init.request.kind} "${init.request.name}"`);
      }
    }
    const interceptors = this.collect<InterceptorRef>(INTERCEPTORS_METADATA, init);
    const invokeHandler = (): Observable<unknown> =>
      defer(() => {
        const result = init.handler(...context.getArgs());
        if (isObservable(result)) return result;
        if (result instanceof Promise) return from(result);
        return of(result);
      });
    const chain = await this.composeInterceptors(interceptors, context, invokeHandler);
    return firstValueFrom(chain);
  }

  private collect<TRef>(metadataKey: string, init: McpPipelineRunInit): TRef[] {
    const classRefs = (Reflect.getMetadata(metadataKey, init.providerClass) as TRef[] | undefined) ?? [];
    const methodRefs = this.collectMethodMetadata<TRef>(metadataKey, init);
    return [...classRefs, ...methodRefs];
  }

  private collectMethodMetadata<TRef>(metadataKey: string, init: McpPipelineRunInit): TRef[] {
    const prototype = init.providerClass.prototype as Record<string, unknown> | undefined;
    const methodKey = init.methodName;
    if (methodKey && prototype) {
      const original = prototype[methodKey];
      if (typeof original === 'function') {
        return (Reflect.getMetadata(metadataKey, original) as TRef[] | undefined) ?? [];
      }
    }
    return (Reflect.getMetadata(metadataKey, init.handler) as TRef[] | undefined) ?? [];
  }

  private async composeInterceptors(
    interceptors: InterceptorRef[],
    context: ExecutionContext,
    terminal: () => Observable<unknown>,
  ): Promise<Observable<unknown>> {
    let next: () => Observable<unknown> = terminal;
    for (let i = interceptors.length - 1; i >= 0; i--) {
      const ref = interceptors[i];
      const instance = await this.resolve<NestInterceptor>(ref);
      const downstream = next;
      next = () => {
        const handle: CallHandler = { handle: () => downstream() };
        const result = instance.intercept(context, handle);
        return result instanceof Promise ? from(result).pipe() : result;
      };
    }
    return next();
  }

  private async resolve<T>(ref: T | Type<T>): Promise<T> {
    if (typeof ref !== 'function') return ref as T;
    try {
      return await this.moduleRef.resolve<T>(ref as Type<T>, undefined, {
        strict: false,
      });
    } catch {
      return this.moduleRef.get<T>(ref as Type<T>, { strict: false });
    }
  }
}
