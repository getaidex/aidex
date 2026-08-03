import { Memory } from '../memory/Memory.js';

/**
 * A thin, named wrapper around one Memory instance — represents a single
 * logical memory (e.g. "conversation", "workflow", "cache", "session").
 * Composition only: it holds a Memory, it does not extend one, and it adds
 * no behavior beyond exposing the name and the instance.
 */
export class MemoryStore<TValue = unknown> {
  readonly name: string;
  private readonly memory: Memory<TValue>;

  constructor(name: string, memory: Memory<TValue> = new Memory<TValue>()) {
    this.name = name;
    this.memory = memory;
  }

  getMemory(): Memory<TValue> {
    return this.memory;
  }
}
