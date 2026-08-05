#!/usr/bin/env node
/**
 * Reads the real repo — package.json/README.md for every package, every
 * example README, docs/architecture guides, roadmap, FAQ, root README — and
 * emits generated/*.json for the Angular app to import. This is the one
 * place "the repository is the source of truth" is enforced mechanically:
 * nothing here is invented, and nothing renders unless it was read from a
 * real file in this checkout.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const APPS_DOCS = path.resolve(__dirname, '..');
const OUT_DIR = path.join(APPS_DOCS, 'src/app/content/generated');
const CONTENT_SOURCE_DIR = path.join(APPS_DOCS, 'src/app/content-source/aidex');

function read(relPath) {
  return readFileSync(path.join(REPO_ROOT, relPath), 'utf8');
}
function readLocal(relPath) {
  return readFileSync(path.join(CONTENT_SOURCE_DIR, relPath), 'utf8');
}

// ---------------------------------------------------------------------------
// Markdown helpers
// ---------------------------------------------------------------------------
function firstH1(markdown) {
  const line = markdown.split('\n')[0] ?? '';
  return line.startsWith('# ') ? line.slice(2).trim() : '';
}
function stripFirstH1(markdown) {
  const lines = markdown.split('\n');
  return lines[0]?.startsWith('# ') ? lines.slice(1).join('\n').trim() : markdown.trim();
}
function stripBadgeLines(markdown) {
  return markdown
    .split('\n')
    .filter((line) => !line.trim().startsWith('[!['))
    .join('\n')
    .trim();
}
function splitH2Sections(markdown) {
  const lines = markdown.split('\n');
  const sections = {};
  let current = null;
  let buffer = [];
  for (const line of lines) {
    const match = /^## (.+)$/.exec(line);
    if (match) {
      if (current !== null) sections[current] = buffer.join('\n').trim();
      current = match[1].trim();
      buffer = [];
    } else if (current !== null) {
      buffer.push(line);
    }
  }
  if (current !== null) sections[current] = buffer.join('\n').trim();
  return sections;
}
function extractHeadings(markdown) {
  return [...markdown.matchAll(/^#{2,3} (.+)$/gm)].map((m) => m[1].trim());
}
function firstParagraphsBefore(markdown, stopHeading) {
  const idx = markdown.indexOf(`## ${stopHeading}`);
  return (idx === -1 ? markdown : markdown.slice(0, idx)).trim();
}
function firstCodeBlock(markdown, lang) {
  const re = new RegExp('```' + (lang ?? '') + '\\n([\\s\\S]*?)```', 'm');
  const match = re.exec(markdown);
  return match ? match[1].trim() : '';
}
function parseBulletList(markdown) {
  return markdown
    .split('\n')
    .filter((line) => /^[-*]\s+/.test(line.trim()))
    .map((line) => line.trim().replace(/^[-*]\s+/, ''));
}
function parseBacktickList(line) {
  return [...(line ?? '').matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}
function packageNameToSlug(name) {
  return name.replace('@aidex/', '').trim();
}

// ---------------------------------------------------------------------------
// Packages — one entry per packages/* directory, merging package.json + README
// ---------------------------------------------------------------------------
const CATEGORY_BY_SLUG = {
  core: 'Core',
  sdk: 'SDK',
  providers: 'Providers & Strategies',
  strategies: 'Providers & Strategies',
  engines: 'Extensibility',
  prompts: 'Extensibility',
  tools: 'Extensibility',
  plugins: 'Extensibility',
  workflow: 'Infrastructure',
  memory: 'Infrastructure',
  observability: 'Infrastructure',
  evaluation: 'Infrastructure',
  catalog: 'Infrastructure',
  adapters: 'Developer Tools',
  cli: 'Developer Tools',
  mcp: 'Developer Tools',
  'mcp-aidex': 'Developer Tools',
  document: 'Feature Packs',
  content: 'Feature Packs',
  design: 'Feature Packs',
  media: 'Feature Packs',
  marketing: 'Feature Packs',
};

const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const packageSlugs = readdirSync(PACKAGES_DIR)
  .filter((name) => statSync(path.join(PACKAGES_DIR, name)).isDirectory())
  .sort();

const packageJsons = new Map(
  packageSlugs.map((slug) => [slug, JSON.parse(read(path.join('packages', slug, 'package.json')))])
);

// Real runtime dependency edges only (dependencies, not devDependencies —
// several packages depend on @aidex/providers as a devDependency purely for
// tests, which is not a runtime coupling worth graphing).
const dependencyEdges = [];
for (const [slug, pkgJson] of packageJsons) {
  for (const [depName, depRange] of Object.entries(pkgJson.dependencies ?? {})) {
    if (depRange === 'workspace:*' && depName.startsWith('@aidex/')) {
      const depSlug = packageNameToSlug(depName);
      if (packageJsons.has(depSlug)) dependencyEdges.push({ from: slug, to: depSlug });
    }
  }
}

function computeLayer(slug, memo, visiting) {
  if (memo.has(slug)) return memo.get(slug);
  if (visiting.has(slug)) return 0;
  visiting.add(slug);
  const deps = dependencyEdges.filter((e) => e.from === slug).map((e) => e.to);
  const layer = deps.length === 0 ? 0 : 1 + Math.max(...deps.map((d) => computeLayer(d, memo, visiting)));
  visiting.delete(slug);
  memo.set(slug, layer);
  return layer;
}
const layerMemo = new Map();
const layerBySlug = new Map(packageSlugs.map((slug) => [slug, computeLayer(slug, layerMemo, new Set())]));

const packages = packageSlugs.map((slug) => {
  const pkgJson = packageJsons.get(slug);
  const readme = read(path.join('packages', slug, 'README.md'));
  const exportsEntry = pkgJson.exports?.['.'];
  return {
    slug,
    name: pkgJson.name,
    version: pkgJson.version,
    description: pkgJson.description ?? '',
    category: CATEGORY_BY_SLUG[slug] ?? 'Other',
    keywords: pkgJson.keywords ?? [],
    license: pkgJson.license ?? '',
    repositoryUrl: `https://github.com/getaidex/aidex/tree/main/packages/${slug}`,
    engineRange: pkgJson.engines ?? {},
    dependsOn: dependencyEdges.filter((e) => e.from === slug).map((e) => e.to),
    usedBy: dependencyEdges.filter((e) => e.to === slug).map((e) => e.from),
    dependencyLayer: layerBySlug.get(slug),
    hasEsm: Boolean(exportsEntry?.import),
    hasCjs: Boolean(exportsEntry?.require),
    hasTypes: Boolean(pkgJson.types),
    treeShakeable: pkgJson.sideEffects === false,
    publishedToNpm: pkgJson.publishConfig?.access === 'public' && pkgJson.private !== true,
    frozen: slug === 'core',
    readmeMarkdown: stripFirstH1(readme),
    // filled in below once examples/guides are parsed
    relatedExampleSlugs: [],
    relatedGuideSlugs: [],
  };
});
const packageBySlug = new Map(packages.map((p) => [p.slug, p]));

// ---------------------------------------------------------------------------
// Examples — one entry per examples/src/* directory, in numeric order
// ---------------------------------------------------------------------------
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples/src');
const exampleSlugs = readdirSync(EXAMPLES_DIR)
  .filter((name) => statSync(path.join(EXAMPLES_DIR, name)).isDirectory())
  .sort();

const examplesRaw = exampleSlugs.map((slug, index) => {
  const readme = read(path.join('examples/src', slug, 'README.md'));
  const rawTitle = firstH1(readme);
  const title = rawTitle.replace(/^\d+\s*—\s*/, '');
  const metaLine = readme.split('\n').find((line) => line.trim().startsWith('**Level'));
  const metaMatch = metaLine
    ? /\*\*Level (\d+)\s*·\s*(.+?)\s*·\s*(\w+)\s*·\s*~?(.+?)\*\*/.exec(metaLine)
    : null;
  const sections = splitH2Sections(readme);
  const relatedPackages = parseBacktickList(sections['Related packages']).map(packageNameToSlug);

  return {
    slug,
    order: index + 1,
    title,
    rawTitle,
    levelNumber: metaMatch ? Number(metaMatch[1]) : index + 1,
    levelName: metaMatch ? metaMatch[2].trim() : '',
    difficulty: metaMatch ? metaMatch[3].trim() : '',
    estimatedTime: metaMatch ? metaMatch[4].trim() : '',
    whatProblem: sections['What problem does this solve?'] ?? '',
    whyUse: sections['Why would I use this Aidex feature?'] ?? '',
    whenToUse: sections['When should I use this in a real project?'] ?? '',
    requirements: sections['Requirements'] ?? '',
    install: sections['Install'] ?? '',
    runCommand: firstCodeBlock(sections['Run'] ?? '', 'bash'),
    expectedOutput: sections['Expected output'] ?? '',
    conceptsLearned: parseBulletList(sections['Concepts learned'] ?? ''),
    relatedPackages,
    fullMarkdown: stripFirstH1(readme),
    sourcePath: `examples/src/${slug}`,
  };
});
const examples = examplesRaw.map((example, index) => ({
  ...example,
  prevSlug: index > 0 ? examplesRaw[index - 1].slug : null,
  nextSlug: index < examplesRaw.length - 1 ? examplesRaw[index + 1].slug : null,
}));

for (const pkg of packages) {
  pkg.relatedExampleSlugs = examples.filter((ex) => ex.relatedPackages.includes(pkg.slug)).map((ex) => ex.slug);
}

// ---------------------------------------------------------------------------
// Guides — 2 sourced verbatim from docs/architecture, 8 authored under
// content-source/aidex/content/guides/ (grounded in the package READMEs
// above, not invented — see those files for their own sourcing).
// ---------------------------------------------------------------------------
const GUIDE_DEFS = [
  {
    slug: 'creating-a-provider',
    title: 'Creating a Provider',
    description: 'Implement the two-member Provider interface to add a new AI backend — no kernel change required.',
    source: { type: 'repo', path: 'docs/architecture/provider-development-guide.md' },
    relatedPackages: ['providers', 'core'],
    relatedExamples: ['04-custom-provider'],
  },
  {
    slug: 'creating-plugins',
    title: 'Creating Plugins',
    description: 'Hook into the kernel lifecycle, or register Engines/Prompts/Tools via PluginManager.',
    source: { type: 'repo', path: 'docs/architecture/plugin-development-guide.md' },
    relatedPackages: ['plugins', 'core'],
    relatedExamples: ['12-plugin-example'],
  },
  {
    slug: 'creating-an-engine',
    title: 'Creating an Engine',
    description: 'Build a provider-agnostic unit of work and register it with an EngineRegistry.',
    source: { type: 'local', path: 'content/guides/creating-an-engine.md' },
    relatedPackages: ['engines', 'catalog'],
    relatedExamples: ['14-custom-engine'],
  },
  {
    slug: 'creating-a-workflow',
    title: 'Creating a Workflow',
    description: 'Sequence steps against shared state with Workflow, WorkflowStep, and WorkflowExecutor.',
    source: { type: 'local', path: 'content/guides/creating-a-workflow.md' },
    relatedPackages: ['workflow'],
    relatedExamples: ['11-workflow-orchestration'],
  },
  {
    slug: 'prompt-templates',
    title: 'Prompt Templates',
    description: 'Register versioned prompts and render them with variable substitution via PromptRegistry.',
    source: { type: 'local', path: 'content/guides/prompt-templates.md' },
    relatedPackages: ['prompts'],
    relatedExamples: ['02-prompt-templates'],
  },
  {
    slug: 'observability',
    title: 'Observability',
    description: 'Track duration, cost, and an event timeline with ObservabilityBus and its track*() methods.',
    source: { type: 'local', path: 'content/guides/observability.md' },
    relatedPackages: ['observability'],
    relatedExamples: ['06-observability'],
  },
  {
    slug: 'memory',
    title: 'Memory',
    description: 'A generic, synchronous key/value store — not chat memory, not a vector database.',
    source: { type: 'local', path: 'content/guides/memory.md' },
    relatedPackages: ['memory'],
    relatedExamples: ['17-memory-store'],
  },
  {
    slug: 'adapters',
    title: 'Adapters',
    description: 'Connect a framework (Express, plain Node) to the SDK without adding any AI logic.',
    source: { type: 'local', path: 'content/guides/adapters.md' },
    relatedPackages: ['adapters'],
    relatedExamples: ['16-framework-adapters'],
  },
  {
    slug: 'mcp',
    title: 'MCP',
    description: 'Run a real Model Context Protocol server, or expose Engines as MCP tools automatically.',
    source: { type: 'local', path: 'content/guides/mcp.md' },
    relatedPackages: ['mcp', 'mcp-aidex'],
    relatedExamples: ['18-mcp-server', '19-mcp-engine-bridge'],
  },
  {
    slug: 'cli',
    title: 'CLI',
    description: 'Wrap an AI instance in a command-dispatch class with CLI, TextCommand, and VersionCommand.',
    source: { type: 'local', path: 'content/guides/cli.md' },
    relatedPackages: ['cli'],
    relatedExamples: ['20-build-a-cli'],
  },
];

const guides = GUIDE_DEFS.map((def) => {
  const raw = def.source.type === 'repo' ? read(def.source.path) : readLocal(def.source.path);
  return {
    slug: def.slug,
    title: def.title,
    description: def.description,
    markdown: stripFirstH1(raw),
    relatedPackages: def.relatedPackages,
    relatedExamples: def.relatedExamples,
    sourcePath:
      def.source.type === 'repo' ? def.source.path : `apps/docs/src/app/content-source/aidex/${def.source.path}`,
  };
});

for (const pkg of packages) {
  pkg.relatedGuideSlugs = guides.filter((g) => g.relatedPackages.includes(pkg.slug)).map((g) => g.slug);
}

// ---------------------------------------------------------------------------
// Roadmap, FAQ, Home
// ---------------------------------------------------------------------------
const roadmapRaw = read('docs/roadmap/roadmap.md');
const roadmap = { title: firstH1(roadmapRaw), markdown: stripFirstH1(roadmapRaw) };

const faqRaw = read('docs/FAQ.md');
const faqSections = splitH2Sections(faqRaw);
const faq = {
  title: firstH1(faqRaw),
  entries: Object.entries(faqSections).map(([question, answer]) => ({ question, answer })),
};

const rootReadme = read('README.md');
const rootSections = splitH2Sections(rootReadme);
const roadmapSections = splitH2Sections(roadmapRaw);
const whatsNextKey = Object.keys(roadmapSections).find((key) => key.startsWith("What's next"));
const roadmapTeaser = whatsNextKey
  ? roadmapSections[whatsNextKey]
      .split('\n')
      .find((line) => line.trim().startsWith('Everything below'))
      ?.trim() ?? ''
  : '';
const home = {
  introMarkdown: stripBadgeLines(stripFirstH1(firstParagraphsBefore(rootReadme, 'Status'))),
  statusMarkdown: rootSections['Status'] ?? '',
  roadmapTeaser,
};

const rootPkgJson = JSON.parse(read('package.json'));
const buildFirstAppRaw = read('examples/BUILD-YOUR-FIRST-AIDEX-APP.md');
const gettingStarted = {
  requirements: rootPkgJson.engines ?? {},
  quickStartMarkdown: rootSections['Quick Start'] ?? '',
  firstAppMarkdown: stripFirstH1(buildFirstAppRaw),
};

// ---------------------------------------------------------------------------
// Dependency graph diagram — mechanically derived from the real edges above,
// laid out top (most-depended-upon-by) to bottom (foundational, zero deps).
// ---------------------------------------------------------------------------
const maxLayer = Math.max(...packages.map((p) => p.dependencyLayer));
const dependencyGraphLayers = [];
for (let layer = maxLayer; layer >= 0; layer--) {
  const nodes = packages
    .filter((p) => p.dependencyLayer === layer)
    .map((p) => ({
      id: p.slug,
      label: p.name,
      description: p.description,
      relatedPackages: p.dependsOn.map((depSlug) => ({
        label: packageBySlug.get(depSlug).name,
        path: `/packages/${depSlug}`,
      })),
    }));
  if (nodes.length) dependencyGraphLayers.push({ nodes });
}
const dependencyGraph = { title: 'Package dependency graph', layers: dependencyGraphLayers };

// ---------------------------------------------------------------------------
// Search index — titles, headings, keywords, short excerpts. No full bodies.
// ---------------------------------------------------------------------------
const staticPages = [
  {
    id: 'page:getting-started',
    title: 'Getting Started',
    path: '/getting-started',
    excerpt: 'Install Aidex and build your first AI app.',
    keywords: ['install', 'quick start', 'AIBuilder'],
  },
  {
    id: 'page:architecture',
    title: 'Architecture',
    path: '/architecture',
    excerpt: 'Interactive system explorer: kernel, SDK, providers, engines, workflows, plugins.',
    keywords: [],
  },
  {
    id: 'page:reference',
    title: 'API Reference',
    path: '/reference',
    excerpt: 'Full generated API reference is coming in v2.',
    keywords: [],
  },
  {
    id: 'page:roadmap',
    title: 'Roadmap',
    path: '/roadmap',
    excerpt: roadmap.markdown.replace(/\s+/g, ' ').slice(0, 140),
    keywords: [],
  },
  {
    id: 'page:examples',
    title: 'Examples',
    path: '/examples',
    excerpt: 'A 20-example learning path from getting started to a capstone assistant.',
    keywords: [],
  },
  {
    id: 'page:packages',
    title: 'Packages',
    path: '/packages',
    excerpt: `Explore all ${packages.length} published Aidex packages.`,
    keywords: [],
  },
  {
    id: 'page:guides',
    title: 'Guides',
    path: '/guides',
    excerpt: 'Task-focused guides for extending Aidex.',
    keywords: [],
  },
  { id: 'page:faq', title: 'FAQ', path: '/faq', excerpt: 'Frequently asked questions about Aidex.', keywords: [] },
];

const searchIndex = [
  ...staticPages.map((p) => ({ ...p, section: 'Pages', headings: [] })),
  ...packages.map((p) => ({
    id: `package:${p.slug}`,
    title: p.name,
    section: 'Packages',
    path: `/packages/${p.slug}`,
    excerpt: p.description,
    headings: extractHeadings(p.readmeMarkdown),
    keywords: [p.slug, ...p.keywords],
  })),
  ...examples.map((e) => ({
    id: `example:${e.slug}`,
    title: e.rawTitle,
    section: 'Examples',
    path: `/examples/${e.slug}`,
    excerpt: e.whatProblem.replace(/\s+/g, ' ').slice(0, 160),
    headings: extractHeadings(e.fullMarkdown),
    keywords: [...e.conceptsLearned, ...e.relatedPackages],
  })),
  ...guides.map((g) => ({
    id: `guide:${g.slug}`,
    title: g.title,
    section: 'Guides',
    path: `/guides/${g.slug}`,
    excerpt: g.description,
    headings: extractHeadings(g.markdown),
    keywords: [g.slug],
  })),
  ...faq.entries.map((entry, index) => ({
    id: `faq:${index}`,
    title: entry.question,
    section: 'FAQ',
    path: '/faq',
    excerpt: entry.answer.replace(/\s+/g, ' ').slice(0, 160),
    headings: [],
    keywords: [],
  })),
];

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
function writeJson(name, data) {
  writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

writeJson('packages.json', packages);
writeJson('examples.json', examples);
writeJson('guides.json', guides);
writeJson('roadmap.json', roadmap);
writeJson('faq.json', faq);
writeJson('home.json', home);
writeJson('getting-started.json', gettingStarted);
writeJson('dependency-graph.json', dependencyGraph);
writeJson('search-index.json', searchIndex);
writeJson('meta.json', { contentVersion: '0.2.x', status: 'current', generatedAt: new Date().toISOString() });

console.log(
  `[generate-content] ${packages.length} packages, ${examples.length} examples, ${guides.length} guides, ${searchIndex.length} search entries.`
);
