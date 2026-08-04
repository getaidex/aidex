/**
 * 14 — Custom Engine
 *
 * The modern, façade path for a custom engine: register it with
 * `AIBuilder().engine(myEngine)`, then call it with
 * `ai.engine(id).execute(input)` — exactly the same call surface as
 * any built-in feature-package engine from earlier examples. (An older
 * version of this example drove a raw EngineRegistry directly, because
 * the façade didn't support single-engine registration yet — it does
 * now, so this is the path to teach.)
 *
 * Also worth noticing: an Engine doesn't have to call an LLM at all. It
 * only needs to satisfy `execute(context): Promise<TResult>` — this one
 * is a fully deterministic reading-time/slug calculator.
 */
import { AIBuilder } from '@aidex/sdk';
import type { Engine } from '@aidex/engines';
import { StubProvider } from '@aidex/providers';

interface BlogPostInput {
  title: string;
  body: string;
}

interface BlogPostAnalysis {
  slug: string;
  wordCount: number;
  readingTimeMinutes: number;
}

const blogPostAnalyzer: Engine<BlogPostAnalysis> = {
  id: 'content.analyze-post',
  name: 'Blog Post Analyzer',
  description: 'Computes a URL slug, word count, and estimated reading time for a blog post',
  version: '1.0.0',
  async execute(context) {
    const input = context.request?.input as BlogPostInput;
    const words = input.body.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    return {
      slug: input.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      wordCount,
      // Average adult reading speed: ~200 words/minute.
      readingTimeMinutes: Math.max(1, Math.round(wordCount / 200)),
    };
  },
};

async function main() {
  // StubProvider is required by AIBuilder even though this engine never
  // calls it — every AI instance needs a Provider, but not every engine
  // uses one. That's a valid, common shape for a custom engine.
  const ai = new AIBuilder().provider(new StubProvider()).engine(blogPostAnalyzer).build();

  const post: BlogPostInput = {
    title: 'Ten Tips For Better TypeScript',
    body: 'TypeScript rewards small, deliberate habits. Start with strict mode, prefer narrow types over any, and let inference do the work it is good at. '.repeat(3),
  };

  const analysis = await ai.engine<BlogPostAnalysis>('content.analyze-post').execute(post);

  console.log(`Title: ${post.title}`);
  console.log(`Slug: ${analysis.slug}`);
  console.log(`Word count: ${analysis.wordCount}`);
  console.log(`Estimated reading time: ${analysis.readingTimeMinutes} minute(s)`);
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
