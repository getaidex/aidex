/**
 * A generic, synchronous key/value memory. Backed by a plain Map — no
 * persistence, no expiration, no serialization. Not tied to prompts, AI
 * chat history, or any vector representation; it's a reusable KV primitive.
 */
export class Memory<TValue = unknown> {
  private readonly entries = new Map<string, TValue>();

  set(key: string, value: TValue): void {
    this.entries.set(key, value);
  }

  get(key: string): TValue | undefined {
    return this.entries.get(key);
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
