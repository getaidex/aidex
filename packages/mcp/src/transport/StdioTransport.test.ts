import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { MCPTransportError } from '../errors/MCPTransportError.js';
import { StdioTransport } from './StdioTransport.js';

function makeStreams(): { input: PassThrough; output: PassThrough } {
  return { input: new PassThrough(), output: new PassThrough() };
}

describe('StdioTransport', () => {
  it('exposes its name', () => {
    const transport = new StdioTransport();
    expect(transport.name).toBe('stdio');
  });

  it('defaults to process.stdin/process.stdout when no streams are supplied', () => {
    expect(() => new StdioTransport()).not.toThrow();
  });

  it('parses each newline-delimited line as one MCPMessage', async () => {
    const { input, output } = makeStreams();
    const transport = new StdioTransport({ input, output });
    const received: unknown[] = [];

    transport.start((message) => received.push(message));
    input.write('{"jsonrpc":"2.0","method":"ping"}\n');
    input.write('{"jsonrpc":"2.0","method":"pong"}\n');
    await new Promise((resolve) => setImmediate(resolve));

    expect(received).toEqual([
      { jsonrpc: '2.0', method: 'ping' },
      { jsonrpc: '2.0', method: 'pong' },
    ]);
  });

  it('ignores blank lines', async () => {
    const { input, output } = makeStreams();
    const transport = new StdioTransport({ input, output });
    const received: unknown[] = [];

    transport.start((message) => received.push(message));
    input.write('\n');
    input.write('   \n');
    input.write('{"jsonrpc":"2.0","method":"ping"}\n');
    await new Promise((resolve) => setImmediate(resolve));

    expect(received).toEqual([{ jsonrpc: '2.0', method: 'ping' }]);
  });

  it('routes a malformed line to onError as MCPTransportError instead of throwing or calling onMessage', async () => {
    const { input, output } = makeStreams();
    const transport = new StdioTransport({ input, output });
    const received: unknown[] = [];
    const errors: Error[] = [];

    transport.start(
      (message) => received.push(message),
      (error) => errors.push(error)
    );
    input.write('not json\n');
    await new Promise((resolve) => setImmediate(resolve));

    expect(received).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(MCPTransportError);
  });

  it('send() writes one JSON line to output', () => {
    const { input, output } = makeStreams();
    const transport = new StdioTransport({ input, output });
    let written = '';
    output.on('data', (chunk) => { written += chunk.toString(); });

    transport.send({ jsonrpc: '2.0', result: 'ok' });

    expect(written).toBe('{"jsonrpc":"2.0","result":"ok"}\n');
  });

  it('close() stops delivering further messages', async () => {
    const { input, output } = makeStreams();
    const transport = new StdioTransport({ input, output });
    const received: unknown[] = [];

    transport.start((message) => received.push(message));
    input.write('{"jsonrpc":"2.0","method":"before-close"}\n');
    await new Promise((resolve) => setImmediate(resolve));
    transport.close();
    input.write('{"jsonrpc":"2.0","method":"after-close"}\n');
    await new Promise((resolve) => setImmediate(resolve));

    expect(received).toEqual([{ jsonrpc: '2.0', method: 'before-close' }]);
  });
});
