import { describe, expect, it } from 'vitest';
import { VersionCommand } from './VersionCommand.js';

describe('VersionCommand', () => {
  it('exposes the "version" name', () => {
    const command = new VersionCommand('1.0.0');
    expect(command.name).toBe('version');
  });

  it('returns exactly the version string it was constructed with', async () => {
    const command = new VersionCommand('1.2.3');
    expect(await command.execute()).toBe('1.2.3');
  });

  it('returns whatever version string is injected — proves no hardcoded value', async () => {
    const first = new VersionCommand('0.0.1-alpha');
    const second = new VersionCommand('9.9.9');

    expect(await first.execute()).toBe('0.0.1-alpha');
    expect(await second.execute()).toBe('9.9.9');
  });
});
