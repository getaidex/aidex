import { createInterface, type Interface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { MCPTransport } from '../types/MCPTransport.js';
import { MCPTransportError } from '../errors/MCPTransportError.js';

/** Defaults to `process.stdin`/`process.stdout`; injectable for tests (any `Readable`/`Writable` pair, e.g. a `PassThrough`) — the same "accept a config object, default the real thing" shape every Provider/Engine config in this platform uses. */
export interface StdioTransportConfig {
  readonly input?: Readable;
  readonly output?: Writable;
}

/**
 * The one newline-delimited-JSON transport this foundation ships. Each
 * line on `input` is parsed as one `MCPMessage`; each `send()` writes one
 * message as a line on `output`. No JSON-RPC method routing, no framing
 * beyond newlines — `MCPServer` never wires this to its registries in
 * this phase (see `MCPTransport`'s own doc comment for why).
 */
export class StdioTransport implements MCPTransport {
  readonly name = 'stdio';

  private readonly input: Readable;
  private readonly output: Writable;
  private rl: Interface | undefined;

  constructor(config: StdioTransportConfig = {}) {
    this.input = config.input ?? process.stdin;
    this.output = config.output ?? process.stdout;
  }

  start(onMessage: (message: unknown) => void | Promise<void>, onError?: (error: Error) => void): void {
    this.rl = createInterface({ input: this.input });
    this.rl.on('line', (line) => {
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        onError?.(new MCPTransportError(`Failed to parse incoming message as JSON (${reason}): ${trimmed}`));
        return;
      }

      // onMessage may be async; this listener can't await it, so any
      // rejection is routed to onError instead of becoming an unhandled
      // promise rejection.
      void Promise.resolve(onMessage(parsed)).catch((error) => {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  send(message: unknown): void {
    this.output.write(`${JSON.stringify(message)}\n`);
  }

  close(): void {
    this.rl?.close();
  }
}
