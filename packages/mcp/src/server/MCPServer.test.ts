import { describe, expect, it } from 'vitest';
import type { MCPTransport } from '../types/MCPTransport.js';
import type { MCPTool } from '../types/MCPTool.js';
import type { MCPResource } from '../types/MCPResource.js';
import type { MCPPrompt } from '../types/MCPPrompt.js';
import { MCP_PROTOCOL_VERSION } from '../protocol/MCPProtocolVersion.js';
import { JsonRpcErrorCode } from '../protocol/JsonRpcErrorCode.js';
import { MCPServer } from './MCPServer.js';

function makeSpyTransport(): MCPTransport & {
  startCalls: number;
  closeCalls: number;
  sent: unknown[];
  capturedOnMessage?: (message: unknown) => void | Promise<void>;
  capturedOnError?: (error: Error) => void;
} {
  return {
    name: 'spy',
    startCalls: 0,
    closeCalls: 0,
    sent: [],
    start(onMessage, onError) {
      this.startCalls += 1;
      this.capturedOnMessage = onMessage;
      this.capturedOnError = onError;
    },
    send(message) {
      this.sent.push(message);
    },
    close() {
      this.closeCalls += 1;
    },
  };
}

describe('MCPServer', () => {
  it('exposes one MCPToolRegistry, MCPResourceRegistry, and MCPPromptRegistry, all empty at construction', () => {
    const server = new MCPServer({ name: 'test-server', version: '1.0.0', transport: makeSpyTransport() });

    expect(server.tools.list()).toEqual([]);
    expect(server.resources.list()).toEqual([]);
    expect(server.prompts.list()).toEqual([]);
  });

  it('registers a tool, a resource, and a prompt through the server-owned registries', async () => {
    const server = new MCPServer({ name: 'test-server', version: '1.0.0', transport: makeSpyTransport() });
    const tool: MCPTool = { name: 'search', async execute() { return { content: [] }; } };
    const resource: MCPResource = { uri: 'file:///x', name: 'x', async read() { return { uri: 'file:///x' }; } };
    const prompt: MCPPrompt = { name: 'greet', async get() { return []; } };

    server.tools.register(tool);
    server.resources.register(resource);
    server.prompts.register(prompt);

    expect(server.tools.has('search')).toBe(true);
    expect(server.resources.has('file:///x')).toBe(true);
    expect(server.prompts.has('greet')).toBe(true);
    await expect(server.tools.call('search', {})).resolves.toEqual({ content: [] });
  });

  it('getMetadata() reflects the server config, with all three capabilities always true and the one MCP_PROTOCOL_VERSION', () => {
    const server = new MCPServer({
      name: 'test-server',
      version: '2.1.0',
      description: 'A test MCP server',
      transport: makeSpyTransport(),
    });

    expect(server.getMetadata()).toEqual({
      name: 'test-server',
      version: '2.1.0',
      description: 'A test MCP server',
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: true, resources: true, prompts: true },
    });
  });

  it('is not started until start() is called', () => {
    const server = new MCPServer({ name: 'test-server', version: '1.0.0', transport: makeSpyTransport() });

    expect(server.isStarted()).toBe(false);
  });

  it('start() delegates to the configured transport and flips isStarted()', async () => {
    const transport = makeSpyTransport();
    const server = new MCPServer({ name: 'test-server', version: '1.0.0', transport });

    await server.start();

    expect(transport.startCalls).toBe(1);
    expect(server.isStarted()).toBe(true);
  });

  it('stop() delegates to the configured transport and flips isStarted() back', async () => {
    const transport = makeSpyTransport();
    const server = new MCPServer({ name: 'test-server', version: '1.0.0', transport });
    await server.start();

    await server.stop();

    expect(transport.closeCalls).toBe(1);
    expect(server.isStarted()).toBe(false);
  });

  it('routes an inbound tools/call message to the registered tool and sends the JSON-RPC response back over the transport', async () => {
    const transport = makeSpyTransport();
    const server = new MCPServer({ name: 'test-server', version: '1.0.0', transport });
    let toolCalled = false;
    server.tools.register({
      name: 'search',
      async execute() {
        toolCalled = true;
        return { content: [{ type: 'text', text: 'result' }] };
      },
    });

    await server.start();
    await transport.capturedOnMessage?.({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search' } });

    expect(toolCalled).toBe(true);
    expect(transport.sent).toEqual([
      { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'result' }] } },
    ]);
  });

  it('routes an inbound initialize message and responds using getMetadata()', async () => {
    const transport = makeSpyTransport();
    const server = new MCPServer({ name: 'test-server', version: '1.0.0', transport });

    await server.start();
    await transport.capturedOnMessage?.({ jsonrpc: '2.0', id: 'init-1', method: 'initialize' });

    expect(transport.sent).toEqual([
      {
        jsonrpc: '2.0',
        id: 'init-1',
        result: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: 'test-server', version: '1.0.0' },
        },
      },
    ]);
  });

  it('sends nothing back for a notification (no "id")', async () => {
    const transport = makeSpyTransport();
    const server = new MCPServer({ name: 'test-server', version: '1.0.0', transport });

    await server.start();
    await transport.capturedOnMessage?.({ jsonrpc: '2.0', method: 'tools/list' });

    expect(transport.sent).toEqual([]);
  });

  it('sends a JSON-RPC error response for an unknown method', async () => {
    const transport = makeSpyTransport();
    const server = new MCPServer({ name: 'test-server', version: '1.0.0', transport });

    await server.start();
    await transport.capturedOnMessage?.({ jsonrpc: '2.0', id: 1, method: 'not/a/real/method' });

    expect(transport.sent).toEqual([
      { jsonrpc: '2.0', id: 1, error: { code: JsonRpcErrorCode.MethodNotFound, message: expect.any(String) } },
    ]);
  });

  it('logs transport errors via the configured logger and sends a Parse Error response', async () => {
    const transport = makeSpyTransport();
    const errorCalls: unknown[][] = [];
    const server = new MCPServer({
      name: 'test-server',
      version: '1.0.0',
      transport,
      logger: { debug() {}, info() {}, warn() {}, error: (...args) => errorCalls.push(args) },
    });

    await server.start();
    const error = new Error('boom');
    await transport.capturedOnError?.(error);

    expect(errorCalls).toHaveLength(1);
    expect(errorCalls[0][1]).toBe(error);
    expect(transport.sent).toEqual([
      { jsonrpc: '2.0', id: null, error: { code: JsonRpcErrorCode.ParseError, message: 'Parse error: boom' } },
    ]);
  });

  it('works with no logger configured (message/error callbacks are safe)', async () => {
    const transport = makeSpyTransport();
    const server = new MCPServer({ name: 'test-server', version: '1.0.0', transport });

    await server.start();

    // Reaching the assertion below without the awaits above throwing is the test.
    await transport.capturedOnMessage?.({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
    await transport.capturedOnError?.(new Error('boom'));

    expect(transport.sent).toHaveLength(2);
  });
});
