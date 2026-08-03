/**
 * One versioned, registerable prompt. `variables` declares the placeholder
 * names the template expects (`{{name}}`) so renderPrompt() can validate a
 * caller supplied all of them before substituting. `locale` is forward-
 * compatible plumbing for future localization — the registry doesn't yet
 * do locale-based resolution/fallback, it just carries the field.
 */
export interface PromptTemplate {
  readonly id: string;
  readonly version: string;
  readonly template: string;
  readonly variables?: readonly string[];
  readonly locale?: string;
}
