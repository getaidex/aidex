/**
 * 13 — Tool Registry
 *
 * Tools are permission-gated: a Tool declares which permission strings
 * it requires, and ToolRegistry.execute() takes the CALLER's granted
 * permissions as its third argument, comparing them at call time — there's
 * no separate "grant" step to forget. This matters any time a tool can
 * take a real-world action (send an email, write a file, hit a paid
 * API) and you need per-call authorization, not just per-registration.
 */
import { ToolRegistry, ToolPermissionDeniedError, type Tool } from '@aidex/tools';

const sendEmailTool: Tool<{ to: string; subject: string }, string> = {
  id: 'email.send',
  name: 'Send Email',
  description: 'Sends an email (simulated for this example)',
  permissions: ['email:send'],
  async execute(input) {
    return `Email sent to ${input.to}: "${input.subject}"`;
  },
};

async function main() {
  const registry = new ToolRegistry();
  registry.register(sendEmailTool);

  console.log('Executing with the required permission granted:');
  const result = await registry.execute('email.send', { to: 'ops@example.com', subject: 'Deploy complete' }, ['email:send']);
  console.log(`  ${result}\n`);

  console.log('Executing WITHOUT the required permission:');
  try {
    await registry.execute('email.send', { to: 'ops@example.com', subject: 'Deploy complete' }, []);
  } catch (error) {
    if (error instanceof ToolPermissionDeniedError) {
      console.log(`  Denied, as expected: missing permissions [${error.missingPermissions.join(', ')}]`);
    } else {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
