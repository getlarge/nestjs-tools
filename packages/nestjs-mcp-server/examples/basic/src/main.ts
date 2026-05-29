import 'reflect-metadata';

import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { McpModule, McpPrompt, McpResource, McpTool } from '@getlarge/nestjs-mcp-server';
import { z } from 'zod';

@Injectable()
class WeatherTools {
  @McpTool({
    name: 'forecast',
    description: 'Return a forecast for a city',
    inputSchema: z.object({ city: z.string() }),
    outputSchema: z.object({
      city: z.string(),
      tempC: z.number(),
      summary: z.string(),
    }),
  })
  async forecast(input: { city: string }) {
    return { city: input.city, tempC: 21, summary: 'Sunny with a light breeze' };
  }

  @McpResource({
    uri: 'app:///docs/about',
    name: 'about',
    description: 'A short description of this MCP server',
    mimeType: 'text/plain',
  })
  async about() {
    return {
      contents: [
        {
          uri: 'app:///docs/about',
          mimeType: 'text/plain',
          text: 'Demo weather MCP server — exposes a forecast tool, an about resource, and a greet-city prompt.',
        },
      ],
    };
  }

  @McpPrompt({
    name: 'greet-city',
    description: 'Greet a city by name',
    argsSchema: z.object({ city: z.string() }),
  })
  greetCity(args: { city: string }) {
    return {
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: `Hello, ${args.city}!` },
        },
      ],
    };
  }
}

@Module({
  imports: [
    McpModule.forRoot({
      serverInfo: { name: 'weather-mcp', version: '1.0.0' },
      transport: { type: 'http', path: '/mcp' },
    }),
  ],
  providers: [WeatherTools],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = Number(process.env['PORT'] ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`MCP server listening on http://localhost:${port}/mcp`);
}

void bootstrap();
