import type { PromptTemplate } from '../types/PromptTemplate.js';
import { MissingPromptVariableError } from '../errors/MissingPromptVariableError.js';

const PLACEHOLDER_PATTERN = /\{\{\s*(\w+)\s*\}\}/g;

/**
 * Pure substitution: validates every variable the template declared as
 * required is present in `variables`, then replaces each `{{name}}`
 * placeholder with its value. A placeholder not present in `variables` (and
 * not declared as required either) is left untouched rather than silently
 * becoming "undefined".
 */
export function renderPrompt(
  prompt: PromptTemplate,
  variables: Record<string, string> = {}
): string {
  for (const name of prompt.variables ?? []) {
    if (!(name in variables)) {
      throw new MissingPromptVariableError(prompt.id, name);
    }
  }

  return prompt.template.replace(PLACEHOLDER_PATTERN, (match: string, name: string) =>
    name in variables ? variables[name] : match
  );
}
