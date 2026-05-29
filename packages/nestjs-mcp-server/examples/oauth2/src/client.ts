import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function call(label: string, token: string | undefined) {
  console.log(`\n— ${label} —`);
  const url = new URL(process.env['MCP_URL'] ?? 'http://localhost:3001/mcp');
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: token ? { headers: { authorization: `Bearer ${token}` } } : undefined,
  });
  const client = new Client({ name: 'oauth2-demo', version: '1.0.0' });
  await client.connect(transport);
  try {
    const write = await client.callTool({
      name: 'write-record',
      arguments: { id: 'first', value: 'hello' },
    });
    console.log('write-record:', summarize(write));

    const list = await client.callTool({
      name: 'list-records',
      arguments: {},
    });
    console.log('list-records:', summarize(list));
  } finally {
    await client.close();
  }
}

function summarize(result: {
  structuredContent?: unknown;
  isError?: boolean;
  content?: Array<{ type?: string; text?: string }>;
}) {
  if (result.isError) {
    const text = result.content?.[0]?.text ?? '(no message)';
    return { isError: true, text };
  }
  return result.structuredContent;
}

async function main() {
  await call('admin token (records:write + records:read)', 'admin-token');
  await call('reader token (records:read only)', 'reader-token');
  await call('no token', undefined);
}

void main();
