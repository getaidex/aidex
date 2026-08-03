/**
 * Plugin — the Aidex Plugin System's install point. A single ExtendedPlugin
 * can declare an Engine, Prompts, and Tools all at once; PluginManager.use()
 * registers every one of them into its real, dedicated registry
 * (EngineRegistry / PromptRegistry / ToolRegistry) in a single call.
 *
 * PluginManager currently composes a raw Aidex instance, not the SDK's `AI`
 * façade — @aidex/sdk doesn't yet wrap plugin-manager-style extension
 * registration, so this is one of the few examples importing @aidex/core
 * directly. See examples/README.md, "Limitations discovered."
 */
import { Aidex } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { PluginManager, type ExtendedPlugin } from '@aidex/plugins';
import type { Engine } from '@aidex/engines';

const echoEngine: Engine<string> = {
  id: 'demo.echo',
  name: 'Echo',
  description: 'Returns whatever context.request.input holds',
  version: '1.0.0',
  async execute(context) {
    return String(context.request?.input ?? '');
  },
};

const demoPlugin: ExtendedPlugin = {
  name: 'demo-plugin',
  registerEngines: () => [echoEngine],
  registerPrompts: () => [
    { id: 'demo.greeting', version: '1.0.0', template: 'Hello, {{name}}!', variables: ['name'] },
  ],
  registerTools: () => [
    {
      id: 'demo.uppercase',
      name: 'Uppercase',
      description: 'Uppercases the given text',
      async execute(input: { text: string }) {
        return input.text.toUpperCase();
      },
    },
  ],
};

const provider = new StubProvider();
const aidex = new Aidex({ provider });
const manager = new PluginManager(aidex);

manager.use(demoPlugin);

const engineResult = await manager.getEngineRegistry().execute('demo.echo', {
  config: { provider },
  provider,
  request: { strategy: 'unused', input: 'engine works' },
});
const promptResult = manager.getPromptRegistry().render('demo.greeting', { name: 'Ada' });
const toolResult = await manager.getToolRegistry().execute('demo.uppercase', { text: 'hi' });

console.log('Engine result:', engineResult);
console.log('Prompt result:', promptResult);
console.log('Tool result:  ', toolResult);
