/**
 * 10 — Marketing Campaign
 *
 * Four @aidex/marketing engines (email copy, social caption, SEO
 * keywords, campaign plan) assembled from one product brief into a
 * single campaign packet — the same "compose a feature package's
 * engines" pattern as 09-brand-kit-generator, applied to a different
 * domain.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { MARKETING_FEATURE_PACKAGE, MarketingEngineId } from '@aidex/marketing';

// A single shared readline interface (see 03-interactive-chat for the
// full rationale: rl.question() only reliably resolves once per
// process under piped/automated input). This example only asks one
// question, but the pattern stays consistent across the whole course.
const rl = createInterface({ input: stdin, output: stdout });
const rlLines = rl[Symbol.asyncIterator]();

async function ask(question: string): Promise<string | null> {
  stdout.write(question);
  const { value, done } = await rlLines.next();
  return done ? null : value.trim();
}

function demoResponseFor(engineId: string): string {
  switch (engineId) {
    case MarketingEngineId.EmailCopy:
      return JSON.stringify({
        subject: 'Your weekly product digest is here',
        body: "Hi there — here's what shipped this week, and why it matters for your workflow.",
      });
    case MarketingEngineId.SocialCaption:
      return JSON.stringify({ caption: 'New week, new ship. Heres what we built for you. 🚀' });
    case MarketingEngineId.SeoKeywords:
      return JSON.stringify({
        keywords: [
          { keyword: 'ai sdk for typescript', estimatedVolume: 1200, difficulty: 'medium' },
          { keyword: 'build ai app node.js', estimatedVolume: 800, difficulty: 'low' },
        ],
      });
    default: // MarketingEngineId.CampaignPlan
      return JSON.stringify({
        objectives: [{ goal: 'Increase trial signups by 20%', metric: 'signup conversion rate' }],
        summary: 'A four-week content-led campaign targeting developer audiences.',
      });
  }
}

function createProvider(currentEngineId: () => string): Provider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  return {
    name: 'demo-marketing-provider',
    async generate() {
      return { content: demoResponseFor(currentEngineId()) };
    },
  };
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found — using a demo provider with canned campaign JSON.');
    console.log('Set GEMINI_API_KEY to generate a real campaign.\n');
  }

  const brief =
    (await ask('Describe your product or launch in one sentence: ')) ||
    'A developer SDK that makes it easy to build AI-powered TypeScript applications';

  let engineId: string = MarketingEngineId.EmailCopy;
  const provider = createProvider(() => engineId);
  const ai = new AIBuilder().provider(provider).use(MARKETING_FEATURE_PACKAGE).build();

  console.log(`\nBuilding a campaign packet for: "${brief}"\n`);

  engineId = MarketingEngineId.EmailCopy;
  const email = (await ai.engine(engineId).execute({ brief })) as { subject: string; body: string };

  engineId = MarketingEngineId.SocialCaption;
  const social = (await ai.engine(engineId).execute({ brief })) as { caption: string };

  engineId = MarketingEngineId.SeoKeywords;
  const seo = (await ai.engine(engineId).execute({ brief })) as {
    keywords: { keyword: string; estimatedVolume?: number; difficulty?: string }[];
  };

  engineId = MarketingEngineId.CampaignPlan;
  const plan = (await ai.engine(engineId).execute({ brief })) as {
    objectives: { goal: string; metric?: string }[];
    channels: string[];
    summary: string;
  };

  console.log('Email:');
  console.log(`  Subject: ${email.subject}`);
  console.log(`  Body: ${email.body}\n`);

  console.log('Social caption:');
  console.log(`  ${social.caption}\n`);

  console.log('SEO keywords:');
  for (const kw of seo.keywords) console.log(`  ${kw.keyword} (volume: ${kw.estimatedVolume ?? 'n/a'}, difficulty: ${kw.difficulty ?? 'n/a'})`);

  console.log('\nCampaign plan:');
  console.log(`  Channels: ${plan.channels.join(', ')}`);
  for (const objective of plan.objectives) console.log(`  Objective: ${objective.goal}${objective.metric ? ` (metric: ${objective.metric})` : ''}`);
  console.log(`  Summary: ${plan.summary}`);
  rl.close();
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
