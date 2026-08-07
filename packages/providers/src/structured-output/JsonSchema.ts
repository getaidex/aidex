/**
 * The schema representation structured-output requests are expressed in.
 * Deliberately a bounded subset of JSON Schema — the same subset
 * `@google/genai`'s `responseJsonSchema` documents as supported (`$id`,
 * `$defs`, `$ref`, `$anchor`, `type`, `format`, `title`, `description`,
 * `enum`, `items`, `prefixItems`, `minItems`, `maxItems`, `minimum`,
 * `maximum`, `anyOf`, `oneOf`, `properties`, `additionalProperties`,
 * `required`) minus the handful of keywords (`$ref`/`$defs`/`$anchor`,
 * `prefixItems`, `oneOf`, `format`) no provider or validator here actually
 * interprets yet. A provider that supports a richer subset than this type
 * still accepts a plain object literal — the index signature keeps this
 * type from rejecting schema features it merely doesn't validate.
 */
export interface JsonSchema {
  type?: JsonSchemaType | readonly JsonSchemaType[];
  description?: string;
  enum?: readonly (string | number)[];
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  anyOf?: readonly JsonSchema[];
  [key: string]: unknown;
}

export type JsonSchemaType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';
