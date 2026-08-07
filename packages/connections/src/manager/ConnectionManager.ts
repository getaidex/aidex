import { DuplicateRegistrationError, type Metadata, type Provider } from '@aidex/core';
import type { Connection } from '../types/Connection.js';
import type { ProviderFactory } from '../types/ProviderFactory.js';
import type { RegisterConnectionInput } from '../types/RegisterConnectionInput.js';
import { ConnectionNotFoundError } from '../errors/ConnectionNotFoundError.js';
import { DisabledConnectionError } from '../errors/DisabledConnectionError.js';
import { InvalidConnectionConfigError } from '../errors/InvalidConnectionConfigError.js';
import { ProviderFactoryNotFoundError } from '../errors/ProviderFactoryNotFoundError.js';

interface StoredConnection {
  connection: Connection;
  config: Record<string, unknown>;
}

export interface UpdateConnectionInput {
  config?: Record<string, unknown>;
  enabled?: boolean;
  metadata?: Metadata;
}

export interface ResolveOptions {
  executionId?: string;
}

/**
 * Manages named AI-provider connection configurations. Deliberately outside
 * @aidex/core — see docs/roadmap/roadmap.md's "What deliberately stays out,
 * and why": a kernel-level provider registry is explicitly rejected, so
 * this lives at the application-composition layer instead, the same
 * relationship @aidex/engines has with the kernel.
 *
 * `config` (which may hold secrets) is stored internally only. get()/list()
 * return Connection, which has no config field at all — a structural
 * guarantee, not a redaction pass.
 */
export class ConnectionManager {
  // # (true private field, not TS "private") — connections' config values
  // may contain secrets, and TS "private" is compile-time-only: it would
  // still show up via console.log/util.inspect on the manager instance.
  readonly #connections = new Map<string, StoredConnection>();
  private readonly factories = new Map<string, ProviderFactory>();

  registerProviderFactory(providerType: string, factory: ProviderFactory): void {
    this.factories.set(providerType, factory);
  }

  register(input: RegisterConnectionInput): Connection {
    this.validateRegistration(input);

    if (this.#connections.has(input.id)) {
      throw new DuplicateRegistrationError('Connection', input.id);
    }

    const connection: Connection = {
      id: input.id,
      providerType: input.providerType,
      enabled: input.enabled ?? true,
      metadata: input.metadata,
    };
    this.#connections.set(input.id, { connection, config: input.config });
    return connection;
  }

  get(id: string): Connection | undefined {
    return this.#connections.get(id)?.connection;
  }

  list(): Connection[] {
    return Array.from(this.#connections.values(), (stored) => stored.connection);
  }

  has(id: string): boolean {
    return this.#connections.has(id);
  }

  update(id: string, updates: UpdateConnectionInput): Connection {
    const stored = this.#connections.get(id);
    if (!stored) {
      throw new ConnectionNotFoundError(id);
    }

    if (updates.config !== undefined) {
      this.validateConfigShape(id, updates.config);
    }

    const nextConnection: Connection = {
      ...stored.connection,
      enabled: updates.enabled ?? stored.connection.enabled,
      metadata: updates.metadata ?? stored.connection.metadata,
    };
    const nextConfig = updates.config ?? stored.config;

    this.#connections.set(id, { connection: nextConnection, config: nextConfig });
    return nextConnection;
  }

  remove(id: string): boolean {
    return this.#connections.delete(id);
  }

  enable(id: string): Connection {
    return this.update(id, { enabled: true });
  }

  disable(id: string): Connection {
    return this.update(id, { enabled: false });
  }

  resolve(id: string, options: ResolveOptions = {}): Provider {
    const stored = this.#connections.get(id);
    if (!stored) {
      throw new ConnectionNotFoundError(id, options.executionId);
    }
    if (!stored.connection.enabled) {
      throw new DisabledConnectionError(id, options.executionId);
    }

    const factory = this.factories.get(stored.connection.providerType);
    if (!factory) {
      throw new ProviderFactoryNotFoundError(stored.connection.providerType, options.executionId);
    }

    return factory(stored.config);
  }

  private validateRegistration(input: RegisterConnectionInput): void {
    if (typeof input.id !== 'string' || input.id.length === 0) {
      throw new InvalidConnectionConfigError(String(input.id), 'id must be a non-empty string');
    }
    if (typeof input.providerType !== 'string' || input.providerType.length === 0) {
      throw new InvalidConnectionConfigError(input.id, 'providerType must be a non-empty string');
    }
    this.validateConfigShape(input.id, input.config);
  }

  private validateConfigShape(id: string, config: unknown): void {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      throw new InvalidConnectionConfigError(id, 'config must be a non-null object');
    }
  }
}
