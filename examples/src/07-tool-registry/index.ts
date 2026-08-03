/**
 * Tool Registry — register a permission-gated tool, execute it with the
 * required permission granted, and show the permission-denied path when
 * it isn't.
 */
import { ToolRegistry, ToolPermissionDeniedError, type Tool } from '@aidex/tools';

interface CalculatorInput {
  a: number;
  b: number;
}

const calculator: Tool<CalculatorInput, number> = {
  id: 'calculator.add',
  name: 'Calculator',
  description: 'Adds two numbers',
  permissions: ['math:execute'],
  async execute({ a, b }) {
    return a + b;
  },
};

const registry = new ToolRegistry();
registry.register(calculator);

const sum = await registry.execute('calculator.add', { a: 2, b: 3 }, ['math:execute']);
console.log('2 + 3 =', sum, '(permission granted)');

try {
  await registry.execute('calculator.add', { a: 2, b: 3 }, []); // no permission granted
} catch (error) {
  if (error instanceof ToolPermissionDeniedError) {
    console.log('Denied as expected:', error.message);
  }
}
