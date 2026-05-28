import 'reflect-metadata';

import { z } from 'zod';

import { MCP_TOOL_METADATA, McpTool, McpToolMetadata } from '../../src';

const inputSchema = z.object({ city: z.string() });
const outputSchema = z.object({ tempC: z.number() });

class WeatherTools {
  @McpTool({
    name: 'get-forecast',
    description: 'Return a forecast for a city',
    inputSchema,
    outputSchema,
  })
  getForecast(): unknown {
    return { tempC: 21 };
  }

  untaggedMethod(): boolean {
    return false;
  }
}

function getToolMetadata(method: string): McpToolMetadata | undefined {
  return Reflect.getMetadata(MCP_TOOL_METADATA, WeatherTools.prototype, method);
}

describe('@McpTool decorator', () => {
  it('writes the tool metadata under MCP_TOOL_METADATA on the decorated method', () => {
    const meta = getToolMetadata('getForecast');
    expect(meta).toBeDefined();
    expect(meta?.name).toBe('get-forecast');
    expect(meta?.description).toBe('Return a forecast for a city');
    expect(meta?.inputSchema).toBe(inputSchema);
    expect(meta?.outputSchema).toBe(outputSchema);
  });

  it('leaves undecorated methods without metadata', () => {
    expect(getToolMetadata('untaggedMethod')).toBeUndefined();
  });

  it('requires a non-empty tool name', () => {
    expect(() => McpTool({ name: '', inputSchema })).toThrow(/name/i);
  });
});
