import { DuplicateRegistrationError } from '@aidex/core';
import type { PromptTemplate } from '../types/PromptTemplate.js';
import { InvalidPromptError } from '../errors/InvalidPromptError.js';
import { PromptNotFoundError } from '../errors/PromptNotFoundError.js';
import { renderPrompt } from '../render/renderPrompt.js';

/**
 * Central registry for versioned prompts. Each id can hold multiple
 * versions; `get()`/`render()` default to whichever version was most
 * recently registered for that id ("latest") when no specific version is
 * requested.
 */
export class PromptRegistry {
  private readonly versions = new Map<string, Map<string, PromptTemplate>>();
  private readonly latestVersion = new Map<string, string>();

  register(prompt: PromptTemplate): void {
    if (!prompt.id) {
      throw new InvalidPromptError('Prompt id must be a non-empty string');
    }
    if (!prompt.version) {
      throw new InvalidPromptError('Prompt version must be a non-empty string');
    }
    if (!prompt.template) {
      throw new InvalidPromptError('Prompt template must be a non-empty string');
    }

    let versionMap = this.versions.get(prompt.id);
    if (!versionMap) {
      versionMap = new Map();
      this.versions.set(prompt.id, versionMap);
    }
    if (versionMap.has(prompt.version)) {
      throw new DuplicateRegistrationError('Prompt', `${prompt.id}@${prompt.version}`);
    }

    versionMap.set(prompt.version, prompt);
    this.latestVersion.set(prompt.id, prompt.version);
  }

  has(id: string, version?: string): boolean {
    const versionMap = this.versions.get(id);
    if (!versionMap) {
      return false;
    }
    return version === undefined ? true : versionMap.has(version);
  }

  get(id: string, version?: string): PromptTemplate | undefined {
    const versionMap = this.versions.get(id);
    if (!versionMap) {
      return undefined;
    }
    const resolvedVersion = version ?? this.latestVersion.get(id);
    return resolvedVersion === undefined ? undefined : versionMap.get(resolvedVersion);
  }

  listVersions(id: string): PromptTemplate[] {
    const versionMap = this.versions.get(id);
    return versionMap ? Array.from(versionMap.values()) : [];
  }

  list(): PromptTemplate[] {
    return Array.from(this.versions.values()).flatMap((versionMap) =>
      Array.from(versionMap.values())
    );
  }

  /** Looks up the prompt (by id, defaulting to its latest version) and renders it. */
  render(id: string, variables?: Record<string, string>, version?: string): string {
    const prompt = this.get(id, version);
    if (!prompt) {
      throw new PromptNotFoundError(id, version);
    }
    return renderPrompt(prompt, variables);
  }
}
