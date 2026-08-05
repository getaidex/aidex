/**
 * 19 — MCP Engine Bridge (Bonus)
 *
 * @aidex/mcp-aidex is the bridge between Aidex Engines and MCP Tools:
 * EngineRegistryToMCPAdapter bulk-exposes every Engine already sitting
 * in an EngineRegistry as a real, callable MCP tool on an MCPServer —
 * no manual per-engine wiring, and calling registerAll() again later
 * only picks up what's new. This reuses 18's server/transport pattern,
 * but drives a custom Engine (the same shape taught in 14-custom-engine)
 * through the full Engine -> MCPTool -> JSON-RPC pipeline.
 */
import { PassThrough } from 'node:stream';
import { createInterface } from 'node:readline';
import { EngineRegistry } from '@aidex/engines';
import type { Engine } from '@aidex/engines';
import { MCPServer, StdioTransport } from '@aidex/mcp';
import { EngineRegistryToMCPAdapter } from '@aidex/mcp-aidex';
import { StubProvider } from '@aidex/providers';
import type { ExecutionContext } from '@aidex/core';

const wordCountEngine: Engine<{ wordCount: number }> = {
  id: 'text.word-count',
  name: 'Word Count',
  description: 'Counts words in the given text',
  version: '1.0.0',
  async execute(context) {
    const input = context.request?.input as { text: string };
    return { wordCount: input.text.trim().split(/\s+/).filter(Boolean).length };
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
  const engineRegistry = new EngineRegistry();
  engineRegistry.register(wordCountEngine);

  // This engine never calls the provider, but ExecutionContext still
  // requires one — the same "every AI instance needs a Provider, not
  // every engine uses one" point 14-custom-engine makes.
  const provider = new StubProvider();
  const context: ExecutionContext = { config: { provider }, provider };

  const server = new MCPServer({
    name: 'aidex-engine-bridge-example',
    version: '1.0.0',
    transport: new StdioTransport({ input: clientToServer, output: serverToClient }),
  });

  const bridge = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer: server, context });
  bridge.registerAll();

  console.log(
    'Engines exposed as MCP tools:',
    bridge.listRegisteredEngines().map((engine) => engine.id)
  );

  const responseLines = createInterface({ input: serverToClient });
  responseLines.on('line', (line) => console.log('Response:', line));

  await server.start();

  sendRequest(1, 'tools/list');
  sendRequest(2, 'tools/call', {
    name: 'text.word-count',
    arguments: { text: 'Aidex bridges engines into MCP tools automatically.' },
  });

  await new Promise((resolve) => setTimeout(resolve, 50));

  await server.stop();
  responseLines.close();
  console.log('\nServer stopped.');
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
