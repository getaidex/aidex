/**
 * 02 — Prompt Templates
 *
 * Real prompts change over time — you tighten wording, add a
 * constraint, fix a tone problem a user reported. If you hardcode
 * prompt strings inline, "what did v1 say" is lost the moment you edit
 * it. PromptRegistry keeps every version addressable by id + semver, so
 * you can render the latest, pin an old one, or list what changed.
 */
import { PromptRegistry } from '@aidex/prompts';
import type { PromptTemplate } from '@aidex/prompts';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';

function createProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).\n');
  return new StubProvider();
}

const supportReplyV1: PromptTemplate = {
  id: 'support-reply',
  version: '1.0.0',
  template:
    'Dear {{customerName}}, thank you for reporting: "{{issue}}". ' +
    'We are investigating and will respond within 24 hours.',
  variables: ['customerName', 'issue'],
};

// v2 tightened the tone after real customer feedback that v1 read as
// too formal/corporate — this is exactly the kind of change PromptRegistry
// is built to track without losing v1.
const supportReplyV2: PromptTemplate = {
  id: 'support-reply',
  version: '2.0.0',
  template:
    "Hi {{customerName}}, thanks for flagging this — \"{{issue}}\". " +
    "We're on it and will get back to you within a day.",
  variables: ['customerName', 'issue'],
};

async function main() {
  const registry = new PromptRegistry();
  registry.register(supportReplyV1);
  registry.register(supportReplyV2);

  const variables = { customerName: 'Priya', issue: 'checkout button does nothing on Safari' };

  console.log('Latest version (render() defaults to most-recently-registered):');
  console.log(registry.render('support-reply', variables));

  console.log('\nExplicitly pinned to v1.0.0:');
  console.log(registry.render('support-reply', variables, '1.0.0'));

  console.log('\nAll registered versions of "support-reply":');
  for (const template of registry.listVersions('support-reply')) {
    console.log(`  - ${template.version}`);
  }

  console.log('\nSending the latest rendered prompt to a real provider call:');
  const ai = new AIBuilder().provider(createProvider()).build();
  const response = await ai.text(registry.render('support-reply', variables));
  console.log(response);
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
