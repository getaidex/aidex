import { describe, expect, it } from 'vitest';
import type { MCPServerConfig } from '../types/MCPServerConfig.js';
import type { MCPTransport } from '../types/MCPTransport.js';
import { MCP_PROTOCOL_VERSION } from '../protocol/MCPProtocolVersion.js';
import { buildServerMetadata } from './buildServerMetadata.js';

function makeTransport(): MCPTransport {
  return { name: 'noop', start() {}, send() {}, close() {} };
}

describe('buildServerMetadata', () => {
  it('builds metadata from name/version, with all three capabilities true and the one MCP_PROTOCOL_VERSION', () => {
    const config: MCPServerConfig = { name: 'my-server', version: '1.0.0', transport: makeTransport() };

    expect(buildServerMetadata(config)).toEqual({
      name: 'my-server',
      version: '1.0.0',
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: true, resources: true, prompts: true },
    });
  });

  it('includes description when supplied, omits it when not', () => {
    const withDescription = buildServerMetadata({
      name: 'my-server',
      version: '1.0.0',
      description: 'A test server',
      transport: makeTransport(),
    });
    const withoutDescription = buildServerMetadata({
      name: 'my-server',
      version: '1.0.0',
      transport: makeTransport(),
    });

    expect(withDescription.description).toBe('A test server');
    expect(withoutDescription).not.toHaveProperty('description');
  });

  it('is a pure function: the same config produces an identical result', () => {
    const config: MCPServerConfig = { name: 'x', version: '1', transport: makeTransport() };

    expect(buildServerMetadata(config)).toEqual(buildServerMetadata(config));
  });
});
