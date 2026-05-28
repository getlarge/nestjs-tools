import 'reflect-metadata';

import {
  CallHandler,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { map, Observable } from 'rxjs';

import { McpPipelineRunner, McpRequestContext, McpTool } from '../../src';

const order: string[] = [];

@Injectable()
class AllowAllGuard implements CanActivate {
  canActivate(): boolean {
    order.push('guard:allow');
    return true;
  }
}

@Injectable()
class DenyGuard implements CanActivate {
  canActivate(): boolean {
    order.push('guard:deny');
    return false;
  }
}

@Injectable()
class WrapInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    order.push('interceptor:before');
    return next.handle().pipe(
      map((value) => {
        order.push('interceptor:after');
        return { wrapped: value };
      })
    );
  }
}

@Injectable()
class GreetTools {
  @McpTool({ name: 'greet' })
  @UseGuards(AllowAllGuard)
  @UseInterceptors(WrapInterceptor)
  async greet(input: { name: string }): Promise<string> {
    order.push('handler');
    return `hi ${input.name}`;
  }

  @McpTool({ name: 'denied' })
  @UseGuards(DenyGuard)
  async denied(): Promise<string> {
    order.push('handler:denied');
    return 'should-not-reach';
  }
}

let moduleRef: TestingModule;
let runner: McpPipelineRunner;
let tools: GreetTools;

beforeAll(async () => {
  moduleRef = await Test.createTestingModule({
    imports: [DiscoveryModule],
    providers: [
      Reflector,
      McpPipelineRunner,
      GreetTools,
      AllowAllGuard,
      DenyGuard,
      WrapInterceptor,
    ],
  }).compile();
  runner = moduleRef.get(McpPipelineRunner);
  tools = moduleRef.get(GreetTools);
});

afterAll(async () => {
  await moduleRef.close();
});

beforeEach(() => {
  order.length = 0;
});

describe('McpPipelineRunner happy path', () => {
  it('runs guards then interceptors then handler in order, wrapping the result', async () => {
    const request: McpRequestContext = {
      kind: 'tool',
      name: 'greet',
      input: { name: 'Ada' },
    };
    const result = await runner.run({
      handler: tools.greet.bind(tools) as (...args: unknown[]) => unknown,
      providerClass: GreetTools,
      methodName: 'greet',
      instance: tools,
      request,
    });
    expect(order).toEqual([
      'guard:allow',
      'interceptor:before',
      'handler',
      'interceptor:after',
    ]);
    expect(result).toEqual({ wrapped: 'hi Ada' });
  });
});

describe('McpPipelineRunner denial', () => {
  it('rejects when a guard returns false', async () => {
    await expect(
      runner.run({
        handler: tools.denied.bind(tools) as (...args: unknown[]) => unknown,
        providerClass: GreetTools,
        methodName: 'denied',
        instance: tools,
        request: { kind: 'tool', name: 'denied' },
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(order).toEqual(['guard:deny']);
  });
});
