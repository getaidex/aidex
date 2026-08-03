import { describe, expect, it } from 'vitest';
import { MemoryStore } from './MemoryStore.js';

describe('MemoryStore', () => {
  it('exposes the name it was constructed with', () => {
    const store = new MemoryStore('conversation');
    expect(store.name).toBe('conversation');
  });

  it('owns one Memory instance — the same reference is returned across calls', () => {
    const store = new MemoryStore('session');

    const first = store.getMemory();
    const second = store.getMemory();

    expect(first).toBe(second);
  });

  it('persists values through its owned Memory instance', () => {
    const store = new MemoryStore<number>('cache');

    store.getMemory().set('hits', 1);

    expect(store.getMemory().get('hits')).toBe(1);
    expect(store.getMemory().has('hits')).toBe(true);
  });

  it('keeps different stores completely isolated from one another', () => {
    const conversation = new MemoryStore<string>('conversation');
    const workflow = new MemoryStore<string>('workflow');

    conversation.getMemory().set('key', 'conversation-value');
    workflow.getMemory().set('key', 'workflow-value');

    expect(conversation.getMemory().get('key')).toBe('conversation-value');
    expect(workflow.getMemory().get('key')).toBe('workflow-value');
  });

  it('does not leak state between two stores sharing the same name', () => {
    const first = new MemoryStore<number>('cache');
    const second = new MemoryStore<number>('cache');

    first.getMemory().set('a', 1);

    expect(second.getMemory().has('a')).toBe(false);
  });
});
