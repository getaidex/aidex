/**
 * 09 — Brand Kit Generator
 *
 * @aidex/design's engines are all text-only today — `design.logo`'s
 * "asset" is a data:text/plain,... URI carrying a text description, not
 * a rendered image. This example says that plainly rather than
 * implying real image generation, and calls four engines
 * (brand/palette/typography/logo) from one brief to assemble a
 * composite "brand kit" printout.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { DESIGN_FEATURE_PACKAGE, DesignEngineId } from '@aidex/design';

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
    case DesignEngineId.Brand:
      return JSON.stringify({
        logoDescription: 'A minimalist geometric leaf mark in deep green, paired with a clean sans-serif wordmark',
        palette: ['#0B3D2E', '#F4F1E9', '#C9A227'],
        typography: ['Inter', 'Fraunces'],
        guidelines: 'Use the leaf mark standalone only on light backgrounds.',
      });
    case DesignEngineId.Palette:
      return JSON.stringify({
        colors: [
          { name: 'Forest', hex: '#0B3D2E', role: 'primary' },
          { name: 'Sand', hex: '#F4F1E9', role: 'background' },
          { name: 'Gold', hex: '#C9A227', role: 'accent' },
        ],
      });
    case DesignEngineId.Typography:
      return JSON.stringify({
        pairings: [{ heading: 'Fraunces', body: 'Inter', notes: 'Serif display paired with a neutral sans body' }],
      });
    default: // DesignEngineId.Logo
      return JSON.stringify({
        primaryDescription: 'A minimalist geometric leaf mark in deep green',
        variantDescriptions: ['Monochrome version for dark backgrounds', 'Icon-only mark for favicon use'],
      });
  }
}

function createProvider(currentEngineId: () => string): Provider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  return {
    name: 'demo-design-provider',
    async generate() {
      return { content: demoResponseFor(currentEngineId()) };
    },
  };
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found — using a demo provider with canned brand-kit JSON.');
    console.log('Set GEMINI_API_KEY to generate a real brand kit.\n');
  }

  const brief = (await ask('Describe your company in one sentence: ')) || 'A sustainable coffee subscription startup';

  let engineId: DesignEngineId = DesignEngineId.Brand;
  const provider = createProvider(() => engineId);
  const ai = new AIBuilder().provider(provider).use(DESIGN_FEATURE_PACKAGE).build();

  console.log(`\nGenerating brand kit for: "${brief}"\n`);

  engineId = DesignEngineId.Brand;
  const brand = (await ai.engine(engineId).execute({ brief })) as {
    logo: { assetUrl: string };
    palette: string[];
    typography: string[];
    guidelines?: string;
  };

  engineId = DesignEngineId.Palette;
  const palette = (await ai.engine(engineId).execute({ brief })) as {
    colors: { name: string; hex: string; role?: string }[];
  };

  engineId = DesignEngineId.Typography;
  const typography = (await ai.engine(engineId).execute({ brief })) as {
    pairings: { heading: string; body: string; notes?: string }[];
  };

  engineId = DesignEngineId.Logo;
  const logo = (await ai.engine(engineId).execute({ brief })) as {
    primary: { assetUrl: string };
    variants?: { assetUrl: string }[];
  };

  console.log('Brand voice & guidelines:');
  console.log(`  ${brand.guidelines ?? '(none provided)'}\n`);

  console.log('Color palette:');
  for (const color of palette.colors) console.log(`  ${color.name} — ${color.hex}${color.role ? ` (${color.role})` : ''}`);

  console.log('\nTypography pairings:');
  for (const pairing of typography.pairings) console.log(`  Heading: ${pairing.heading} / Body: ${pairing.body}`);

  console.log('\nLogo concept (text description — no image is actually rendered, see README):');
  console.log(`  ${decodeURIComponent(logo.primary.assetUrl.replace('data:text/plain,', ''))}`);
}

main()
  .catch((error) => {
    console.error('Example failed:', error);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
