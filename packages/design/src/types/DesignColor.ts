/** `role`, when supplied, is a free-form label such as "primary", "secondary", or "accent". */
export interface DesignColor {
  readonly name: string;
  readonly hex: string;
  readonly role?: string;
}
