import { ArgumentsHost, ContextType, ExecutionContext, Type } from '@nestjs/common';

export type McpRequestKind = 'tool' | 'resource' | 'prompt' | 'completion';

export interface McpAuthInfo {
  token?: string;
  scopes?: string[];
  subject?: string;
  claims?: Record<string, unknown>;
}

export interface McpRawHttp {
  req: unknown;
  res: unknown;
}

export interface McpRequestContext {
  kind: McpRequestKind;
  name: string;
  input?: unknown;
  auth?: McpAuthInfo;
  rawHttp?: McpRawHttp;
  meta?: Record<string, unknown>;
}

export interface McpExecutionContextInit {
  handler: (...args: unknown[]) => unknown;
  providerClass: Type;
  instance: object;
  request: McpRequestContext;
}

export class McpExecutionContext implements ExecutionContext, ArgumentsHost {
  private readonly args: unknown[];

  constructor(private readonly init: McpExecutionContextInit) {
    this.args = [init.request.input, init.request.auth, init.request];
  }

  getType<TContext extends string = ContextType>(): TContext {
    return 'mcp' as TContext;
  }

  getHandler(): (...args: unknown[]) => unknown {
    return this.init.handler;
  }

  getClass<T = unknown>(): Type<T> {
    return this.init.providerClass as Type<T>;
  }

  getArgs<T extends Array<unknown> = unknown[]>(): T {
    return this.args as T;
  }

  getArgByIndex<T = unknown>(index: number): T {
    return this.args[index] as T;
  }

  getMcpRequest(): McpRequestContext {
    return this.init.request;
  }

  getInstance(): object {
    return this.init.instance;
  }

  switchToHttp(): {
    getRequest<T = unknown>(): T;
    getResponse<T = unknown>(): T;
    getNext<T = unknown>(): T;
  } {
    const raw = this.init.request.rawHttp;
    return {
      getRequest: <T = unknown>() => raw?.req as T,
      getResponse: <T = unknown>() => raw?.res as T,
      getNext: <T = unknown>() => undefined as T,
    };
  }

  switchToRpc(): never {
    throw new Error('McpExecutionContext does not expose an RPC host');
  }

  switchToWs(): never {
    throw new Error('McpExecutionContext does not expose a WebSocket host');
  }
}
