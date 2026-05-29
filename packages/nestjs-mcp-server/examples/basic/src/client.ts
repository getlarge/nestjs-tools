import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
  const url = new URL(process.env['MCP_URL'] ?? 'http://localhost:3000/mcp');
  const transport = new StreamableHTTPClientTransport(url);
  const client = new Client({ name: 'demo-client', version: '1.0.0' });
  await client.connect(transport);

  console.log('— tools/list —');
  const tools = await client.listTools();
  console.log(tools.tools.map((t) => t.name).join(', '));

  console.log('— tools/call: forecast(Paris) —');
  const forecast = await client.callTool({
    name: 'forecast',
    arguments: { city: 'Paris' },
  });
  console.log(forecast.structuredContent);

  console.log('— resources/list —');
  const resources = await client.listResources();
  console.log(resources.resources.map((r) => r.uri).join(', '));

  console.log('— resources/read: app:///docs/about —');
  const about = await client.readResource({ uri: 'app:///docs/about' });
  console.log((about.contents[0] as { text: string }).text);

  console.log('— prompts/get: greet-city(London) —');
  const prompt = await client.getPrompt({
    name: 'greet-city',
    arguments: { city: 'London' },
  });
  console.log(prompt.messages);

  await client.close();
}

void main();
