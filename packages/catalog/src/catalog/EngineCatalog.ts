import { DuplicateRegistrationError } from '@aidex/core';
import type { EngineMetadata } from '../types/EngineMetadata.js';

/**
 * A registry of Engine metadata — never Engine instances, never a
 * Provider, never anything callable. Feature Packs export their own
 * `readonly EngineMetadata[]` (see @aidex/document's/@aidex/content's
 * `metadata.ts`); an application constructs one EngineCatalog and
 * registers whichever Feature Packs it has installed into it. No
 * singleton, no global/static state — mirrors @aidex/sdk's AIBuilder and
 * every registry in @aidex/core/@aidex/prompts/@aidex/tools/@aidex/engines:
 * every instance is independent.
 */
export class EngineCatalog {
  private readonly entries = new Map<string, EngineMetadata>();

  register(metadata: EngineMetadata): void {
    if (this.entries.has(metadata.id)) {
      throw new DuplicateRegistrationError('Engine metadata', metadata.id);
    }
    this.entries.set(metadata.id, metadata);
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  list(): EngineMetadata[] {
    return Array.from(this.entries.values());
  }

  find(id: string): EngineMetadata | undefined {
    return this.entries.get(id);
  }

  findByFeaturePack(featurePack: string): EngineMetadata[] {
    return this.list().filter((entry) => entry.featurePack === featurePack);
  }

  findByTag(tag: string): EngineMetadata[] {
    return this.list().filter((entry) => entry.tags.includes(tag));
  }

  findByCategory(category: string): EngineMetadata[] {
    return this.list().filter((entry) => entry.category === category);
  }
}
