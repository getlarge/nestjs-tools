import 'reflect-metadata';

import { Injectable, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { McpApp, McpModule, McpTool } from '@getlarge/nestjs-mcp-server';
import { z } from 'zod';

const BUDGET_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Budget Allocator</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 1rem; }
      .row { display: flex; align-items: center; gap: 1rem; margin-bottom: .5rem; }
      label { width: 8rem; }
      input { flex: 1; }
      output { width: 5rem; text-align: right; font-variant-numeric: tabular-nums; }
    </style>
  </head>
  <body>
    <h1>Budget allocator</h1>
    <p>Drag the sliders to allocate your monthly budget. Total adjusts automatically.</p>
    <div id="rows"></div>
    <p><strong>Total:</strong> <span id="total">0</span></p>
    <script>
      const categories = ['housing', 'food', 'transport', 'leisure', 'savings'];
      const root = document.getElementById('rows');
      const total = document.getElementById('total');
      const sliders = categories.map((name) => {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML =
          '<label>' + name + '</label>' +
          '<input type="range" min="0" max="2000" value="200" />' +
          '<output>200</output>';
        const slider = row.querySelector('input');
        const out = row.querySelector('output');
        slider.addEventListener('input', () => {
          out.textContent = slider.value;
          total.textContent = sliders.reduce((a, s) => a + Number(s.value), 0);
        });
        root.appendChild(row);
        return slider;
      });
      total.textContent = sliders.reduce((a, s) => a + Number(s.value), 0);
    </script>
  </body>
</html>`;

@Injectable()
class BudgetTools {
  @McpTool({
    name: 'budget',
    description: 'Open the interactive budget allocator',
    inputSchema: z.object({
      monthlyIncome: z.number().min(0).optional(),
    }),
    outputSchema: z.object({
      message: z.string(),
    }),
  })
  @McpApp({
    uri: 'ui://budget/widget',
    html: BUDGET_HTML,
  })
  async budget(input: { monthlyIncome?: number }) {
    return {
      message: input.monthlyIncome
        ? `Let's allocate $${input.monthlyIncome}/month.`
        : 'Allocate your monthly budget below.',
    };
  }
}

@Module({
  imports: [
    McpModule.forRoot({
      serverInfo: { name: 'budget-mcp', version: '1.0.0' },
      transport: { type: 'http', path: '/mcp' },
    }),
  ],
  providers: [BudgetTools],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  const port = Number(process.env['PORT'] ?? 3002);
  await app.listen(port, '0.0.0.0');
  console.log(`MCP server listening on http://localhost:${port}/mcp`);
}

void bootstrap();
