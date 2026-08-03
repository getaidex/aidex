import { AIBuilder } from '@aidex/sdk';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { TextCommand } from './TextCommand.js';

describe('TextCommand', () => {
  it('exposes the "text" name', () => {
    expect(new TextCommand().name).toBe('text');
  });

  it('delegates to ai.text(input) and returns the result unchanged', async () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    const command = new TextCommand();

    const result = await command.execute(ai, 'hello');

    expect(result).toBe('stub:hello');
  });

  it('matches calling ai.text() directly for the same input', async () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    const command = new TextCommand();

    const viaCommand = await command.execute(ai, 'same input');
    const viaAiDirectly = await ai.text('same input');

    expect(viaCommand).toBe(viaAiDirectly);
  });

  it('propagates a rejection from ai.text() without catching it', async () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    const command = new TextCommand();

    await expect(command.execute(ai, '')).rejects.toThrow(/non-empty string/i);
  });
});
