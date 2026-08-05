/**
 * 18 — MCP Server (Bonus)
 *
 * @aidex/mcp is a real, hand-rolled Model Context Protocol server
 * foundation — three registries (tools/resources/prompts), a JSON-RPC
 * 2.0 protocol handler, and one newline-delimited-JSON transport
 * (StdioTransport). No AI logic anywhere in this package. This example
 * drives a full request/response cycle in-process, using two
 * node:stream PassThrough pipes in place of a real stdin/stdout pipe —
 * the transport only knows it has a Readable to read from and a
 * Writable to write to, so a real `node server.js` piped to a real MCP
 * client would use this exact same StdioTransport unchanged. No
 * external MCP client, no network, no GEMINI_API_KEY needed.
 */
import { PassThrough } from 'node:stream';
import { createInterface } from 'node:readline';
import { MCPServer, StdioTransport } from '@aidex/mcp';
import type { MCPTool, MCPResource } from '@aidex/mcp';

const echoTool: MCPTool<{ text: string }> = {
  name: 'echo',
  description: 'Echoes back whatever text you send it',
  inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  async execute(input) {
    return { content: [{ type: 'text', text: `You said: ${input.text}` }] };
  },
};

const readmeResource: MCPResource = {
  uri: 'aidex://readme',
  name: 'Aidex README excerpt',
  mimeType: 'text/plain',
  async read() {
    return {
      uri: 'aidex://readme',
      mimeType: 'text/plain',
      text: 'Aidex is a modular, provider-agnostic AI application platform.',
    };
  },
};

const clientToServer = new PassThrough();
const serverToClient = new PassThrough();

function sendRequest(id: number, method: string, params?: unknown): void {
  clientToServer.write(
    `${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params !== undefined ? { params } : {}) })}\n`
  );
}

async function main() {
  const server = new MCPServer({
    name: 'aidex-example-server',
    version: '1.0.0',
    transport: new StdioTransport({ input: clientToServer, output: serverToClient }),
  });

  server.tools.register(echoTool);
  server.resources.register(readmeResource);

  const responseLines = createInterface({ input: serverToClient });
  responseLines.on('line', (line) => console.log('Response:', line));

  await server.start();

  sendRequest(1, 'initialize');
  sendRequest(2, 'tools/list');
  sendRequest(3, 'tools/call', { name: 'echo', arguments: { text: 'hello from the client' } });
  sendRequest(4, 'resources/read', { uri: 'aidex://readme' });

  // Give the async message handlers a tick to run before shutting down —
  // StdioTransport processes each line as it's read, asynchronously.
  await new Promise((resolve) => setTimeout(resolve, 50));

  await server.stop();
  responseLines.close();
  console.log('\nServer stopped.');
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
