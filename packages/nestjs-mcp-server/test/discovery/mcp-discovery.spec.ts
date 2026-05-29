import 'reflect-metadata';

import { Injectable } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { z } from 'zod';

import { McpDiscoveryService, McpTool, McpToolDescriptor } from '../../src';

const inputSchema = z.object({ city: z.string() });

@Injectable()
class WeatherTools {
  callCount = 0;

  @McpTool({
    name: 'get-forecast',
    description: 'Forecast a city',
    inputSchema,
  })
  async getForecast(input: { city: string }): Promise<{ city: string }> {
    this.callCount++;
    return { city: input.city };
  }

  plain(): string {
    return 'plain';
  }
}

@Injectable()
class UnrelatedProvider {
  helper(): number {
    return 42;
  }
}

describe('McpDiscoveryService', () => {
  let moduleRef: TestingModule;
  let discovery: McpDiscoveryService;
  let tools: WeatherTools;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [DiscoveryModule],
      providers: [McpDiscoveryService, WeatherTools, UnrelatedProvider],
    }).compile();
    discovery = moduleRef.get(McpDiscoveryService);
    tools = moduleRef.get(WeatherTools);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('discovers methods annotated with @McpTool', () => {
    const descriptors = discovery.discoverTools();
    expect(descriptors).toHaveLength(1);
    const [tool] = descriptors as McpToolDescriptor[];
    expect(tool.metadata.name).toBe('get-forecast');
    expect(tool.metadata.description).toBe('Forecast a city');
    expect(tool.metadata.inputSchema).toBe(inputSchema);
    expect(tool.methodName).toBe('getForecast');
    expect(tool.instance).toBe(tools);
  });

  it('returns a bound handler that calls the original method on the discovered instance', async () => {
    const [tool] = discovery.discoverTools();
    const result = await tool.handler({ city: 'Paris' });
    expect(result).toEqual({ city: 'Paris' });
    expect(tools.callCount).toBe(1);
  });

  it('ignores providers without @McpTool methods', () => {
    const descriptors = discovery.discoverTools();
    expect(descriptors.find((d) => d.methodName === 'helper')).toBeUndefined();
    expect(descriptors.find((d) => d.methodName === 'plain')).toBeUndefined();
  });
});
