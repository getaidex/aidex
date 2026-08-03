import type { Plugin } from '../../types/Plugin.js';
import { DuplicateRegistrationError } from '../errors/DuplicateRegistrationError.js';

export class PluginRegistry {
  private readonly plugins = new Map<string, Plugin>();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new DuplicateRegistrationError('Plugin', plugin.name);
    }
    this.plugins.set(plugin.name, plugin);
  }

  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}
