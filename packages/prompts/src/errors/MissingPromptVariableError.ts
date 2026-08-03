/**
 * Thrown by renderPrompt() when the caller didn't supply a value for a
 * variable the PromptTemplate declared as required.
 */
export class MissingPromptVariableError extends Error {
  readonly promptId: string;
  readonly variableName: string;

  constructor(promptId: string, variableName: string) {
    super(`Prompt "${promptId}" is missing required variable: "${variableName}"`);
    this.name = 'MissingPromptVariableError';
    this.promptId = promptId;
    this.variableName = variableName;
    Object.setPrototypeOf(this, MissingPromptVariableError.prototype);
  }
}
