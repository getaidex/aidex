import { AidexError } from '../../errors/AidexError.js';

export class DuplicateRegistrationError extends AidexError {
  readonly kind: string;
  readonly registeredName: string;

  constructor(kind: string, registeredName: string) {
    super(`${kind} already registered: "${registeredName}"`);
    this.name = 'DuplicateRegistrationError';
    this.kind = kind;
    this.registeredName = registeredName;
    Object.setPrototypeOf(this, DuplicateRegistrationError.prototype);
  }
}
