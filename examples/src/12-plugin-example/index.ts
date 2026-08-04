/**
 * 12 — Plugin Example
 *
 * ExtendedPlugin is how you bundle related engines/prompts/tools into
 * one installable unit. PluginManager — not AIBuilder/AI — is what
 * consumes plugins, and it requires a raw `Aidex` kernel instance to
 * construct. That's not a gap in the SDK façade; it's a deliberate
 * two-tier architecture: `Aidex` is the low-level kernel, `AIBuilder`/
 * `AI` is a higher-level façade built for the common case of "one
 * provider, some engines, some prompts" — plugin composition lives at
 * the kernel tier because plugins can register strategies too, a
 * concept the façade doesn't expose.
 */
import { Aidex, type Provider } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { PluginManager, type ExtendedPlugin } from '@aidex/plugins';

const slugPlugin: ExtendedPlugin = {
  name: 'slug-tools',
  registerEngines() {
    return [
      {
        id: 'text.slugify',
        name: 'Slugify',
        description: 'Converts a title into a URL-safe slug',
        version: '1.0.0',
        async execute(context) {
          const input = context.request?.input as { title: string } | undefined;
          const title = input?.title ?? '';
          return title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        },
      },
    ];
  },
  registerPrompts() {
    return [
      {
        id: 'blog-intro',
        version: '1.0.0',
        template: 'Write a one-sentence intro for a blog post titled "{{title}}".',
        variables: ['title'],
      },
    ];
  },
  registerTools() {
    return [
      {
        id: 'word-count',
        name: 'Word Count',
        description: 'Counts words in a string',
        async execute(input) {
          const text = input as string;
          return text.trim().split(/\s+/).filter(Boolean).length;
        },
      },
    ];
  },
};

async function main() {
  const provider: Provider = new StubProvider();
  const aidex = new Aidex({ provider }); // the raw kernel — see comment above for why

  const manager = new PluginManager(aidex);

  console.log('Installing plugin "slug-tools"...');
  manager.use(slugPlugin);
  console.log(`Installed: ${manager.isInstalled('slug-tools')}\n`);

  console.log('Executing its engine:');
  const slug = await manager.getEngineRegistry().execute('text.slugify', {
    config: { provider },
    provider,
    request: { strategy: 'text.slugify', input: { title: 'Ten Tips For Better TypeScript' } },
  });
  console.log(`  "Ten Tips For Better TypeScript" -> "${slug}"\n`);

  console.log('Rendering its prompt template:');
  const rendered = manager.getPromptRegistry().render('blog-intro', { title: 'Ten Tips For Better TypeScript' });
  console.log(`  ${rendered}\n`);

  console.log('Executing its tool:');
  const wordCount = await manager.getToolRegistry().execute('word-count', 'Aidex plugins bundle engines, prompts, and tools together.');
  console.log(`  word count: ${wordCount}`);
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
