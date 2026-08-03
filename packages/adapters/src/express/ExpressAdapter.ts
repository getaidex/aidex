import type { AI } from '@aidex/sdk';

/**
 * The minimal request/response shape this adapter needs — not Express's own
 * Request/Response types. Kept intentionally small so this package never
 * takes an actual Express dependency; an application wires a real
 * express.Request/Response into this shape at the call site.
 */
export interface ExpressAdapterRequest {
  prompt: string;
}

export interface ExpressAdapterResponse {
  result: string;
}

/**
 * A lightweight wrapper connecting an Express-style request/response cycle
 * to the SDK's AI façade. Contains no AI logic and never calls a Provider
 * directly — it only holds an AI instance and delegates to ai.text().
 */
export class ExpressAdapter {
  constructor(private readonly ai: AI) {}

  async handleRequest(request: ExpressAdapterRequest): Promise<ExpressAdapterResponse> {
    const result = await this.ai.text(request.prompt);
    return { result };
  }
}
