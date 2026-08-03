/** `recipientContext`, when supplied, is free-form context about who the email is for. */
export interface ContentEmailRequest {
  readonly purpose: string;
  readonly tone?: string;
  readonly recipientContext?: string;
}

export interface ContentEmailResult {
  readonly subject: string;
  readonly body: string;
}
