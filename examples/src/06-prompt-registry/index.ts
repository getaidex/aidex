/**
 * Prompt Registry — register a prompt, register a second version of it, and
 * render both with variable substitution. get()/render() default to
 * whichever version was most recently registered ("latest").
 */
import { PromptRegistry } from '@aidex/prompts';

const registry = new PromptRegistry();

registry.register({
  id: 'greeting',
  version: '1.0.0',
  template: 'Hello, {{name}}!',
  variables: ['name'],
});

registry.register({
  id: 'greeting',
  version: '2.0.0',
  template: 'Hi there, {{name}} — welcome!',
  variables: ['name'],
});

console.log('Latest (v2.0.0):', registry.render('greeting', { name: 'Ada' }));
console.log('Explicit v1.0.0:', registry.render('greeting', { name: 'Ada' }, '1.0.0'));
console.log(
  'All registered versions:',
  registry.listVersions('greeting').map((prompt) => prompt.version)
);
