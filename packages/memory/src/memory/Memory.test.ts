import { describe, expect, it } from 'vitest';
import { Memory } from './Memory.js';

describe('Memory', () => {
  it('returns undefined for a missing key', () => {
    const memory = new Memory<string>();
    expect(memory.get('missing')).toBeUndefined();
  });

  it('sets and gets a value', () => {
    const memory = new Memory<string>();
    memory.set('a', 'first');
    expect(memory.get('a')).toBe('first');
  });

  it('overwrites an existing value on a second set() for the same key', () => {
    const memory = new Memory<string>();
    memory.set('a', 'first');
    memory.set('a', 'second');
    expect(memory.get('a')).toBe('second');
  });

  it('reports has() as true only for keys that have been set', () => {
    const memory = new Memory<number>();
    expect(memory.has('a')).toBe(false);

    memory.set('a', 1);
    expect(memory.has('a')).toBe(true);
  });

  it('deletes a key, returning true, and has()/get() reflect the removal', () => {
    const memory = new Memory<number>();
    memory.set('a', 1);

    const deleted = memory.delete('a');

    expect(deleted).toBe(true);
    expect(memory.has('a')).toBe(false);
    expect(memory.get('a')).toBeUndefined();
  });

  it('returns false when deleting a key that was never set', () => {
    const memory = new Memory<number>();
    expect(memory.delete('missing')).toBe(false);
  });

  it('clears every key', () => {
    const memory = new Memory<number>();
    memory.set('a', 1);
    memory.set('b', 2);

    memory.clear();

    expect(memory.has('a')).toBe(false);
    expect(memory.has('b')).toBe(false);
    expect(memory.get('a')).toBeUndefined();
    expect(memory.get('b')).toBeUndefined();
  });

  it('stores generic value types unchanged — objects, arrays, primitives', () => {
    interface Shape {
      count: number;
      tags: string[];
    }
    const memory = new Memory<Shape>();
    const value: Shape = { count: 3, tags: ['x', 'y'] };

    memory.set('shape', value);

    expect(memory.get('shape')).toBe(value);
  });

  it('is deterministic — repeated get() calls return the same value with no side effects', () => {
    const memory = new Memory<number>();
    memory.set('a', 42);

    expect(memory.get('a')).toBe(42);
    expect(memory.get('a')).toBe(42);
    expect(memory.has('a')).toBe(true);
  });
});
