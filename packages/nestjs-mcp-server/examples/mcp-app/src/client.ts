import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const url = new URL(process.env['MCP_URL'] ?? 'http://localhost:3002/mcp');
  const transport = new StreamableHTTPClientTransport(url);
  const client = new Client({ name: 'mcp-app-demo', version: '1.0.0' });
  await client.connect(transport);

  console.log('— tools/call: budget —');
  const result = await client.callTool({
    name: 'budget',
    arguments: { monthlyIncome: 4200 },
  });
  console.log('structuredContent:', result.structuredContent);
  console.log('_meta:', result._meta);

  console.log('\n— resources/list —');
  const resources = await client.listResources();
  console.log(resources.resources.map((r) => r.uri).join(', '));

  console.log('\n— resources/read: ui://budget/widget —');
  const ui = await client.readResource({ uri: 'ui://budget/widget' });
  const first = ui.contents[0] as { mimeType?: string; text?: string };
  console.log(`mimeType: ${first.mimeType}`);
  console.log(`HTML length: ${first.text?.length ?? 0} characters`);

  await client.close();
}

void main();
