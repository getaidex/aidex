import { randomUUID } from 'node:crypto';
import type { AidexConfig } from './configuration/AidexConfig.js';
import type { AidexRequest } from '../types/AidexRequest.js';
import type { ExecutionContext } from '../types/ExecutionContext.js';
import type { Plugin } from '../types/Plugin.js';
import type { Strategy } from '../types/Strategy.js';
import { Lifecycle } from './lifecycle/Lifecycle.js';
import { PluginRegistry } from './registries/PluginRegistry.js';
import { StrategyRegistry } from './registries/StrategyRegistry.js';
import { StrategyNotFoundError } from './errors/StrategyNotFoundError.js';

export class Aidex {
  private readonly config: AidexConfig;
  private readonly lifecycle = new Lifecycle();
  private readonly strategyRegistry = new StrategyRegistry();
  private readonly pluginRegistry = new PluginRegistry();

  constructor(config: AidexConfig) {
    this.config = config;
    // Constructors can't be async; boot/ready hooks run fire-and-forget.
    // A synchronous hook still completes before this constructor returns
    // (its body runs up to the first await inside Lifecycle.emit's loop).
    void this.lifecycle.emit('boot', this.buildContext()).catch((err) => {
      this.config.logger?.error('boot hook failed', err);
    });
    for (const plugin of config.plugins ?? []) {
      this.use(plugin);
    }
    // A plugin's async onReady can reject; without a .catch() here that
    // becomes an unhandled promise rejection (the constructor has already
    // returned, so callers have no way to catch it), which crashes the
    // process on modern Node. Route it to the logger instead.
    void this.lifecycle.emit('ready', this.buildContext()).catch((err) => {
      this.config.logger?.error('ready hook failed', err);
    });
  }

  use(plugin: Plugin): void {
    this.pluginRegistry.register(plugin);
    if (plugin.onBoot) this.lifecycle.on('boot', plugin.onBoot.bind(plugin));
    if (plugin.onReady) this.lifecycle.on('ready', plugin.onReady.bind(plugin));
    if (plugin.beforeExecute) this.lifecycle.on('beforeExecute', plugin.beforeExecute.bind(plugin));
    if (plugin.afterExecute) this.lifecycle.on('afterExecute', plugin.afterExecute.bind(plugin));
    if (plugin.onShutdown) this.lifecycle.on('shutdown', plugin.onShutdown.bind(plugin));
  }

  registerStrategy(strategy: Strategy): void {
    this.strategyRegistry.register(strategy);
  }

  async execute<TResult = unknown, TContext = unknown>(
    request: AidexRequest<TContext>
  ): Promise<TResult> {
    const executionId = request.executionId ?? randomUUID();
    const normalizedRequest: AidexRequest<TContext> = {
      ...request,
      executionId,
      options: { ...request.options, executionId },
    };

    const context = this.buildContext(normalizedRequest);
    await this.lifecycle.emit('beforeExecute', context);

    const strategy = this.strategyRegistry.get(normalizedRequest.strategy) as
      | Strategy<TResult, TContext>
      | undefined;
    if (!strategy) {
      throw new StrategyNotFoundError(normalizedRequest.strategy, executionId);
    }

    const result = await strategy.execute(normalizedRequest, context);
    await this.lifecycle.emit('afterExecute', context);
    return result;
  }

  private buildContext<TContext = unknown>(
    request?: AidexRequest<TContext>
  ): ExecutionContext<TContext> {
    return {
      config: this.config,
      provider: this.config.provider,
      logger: this.config.logger,
      request,
      metadata: this.config.metadata,
      executionId: request?.executionId,
    };
  }
}
