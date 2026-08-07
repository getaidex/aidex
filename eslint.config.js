import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  ...tseslint.configs.recommended,
  {
    files: [
      'packages/*/src/**/*.ts',
      'packages/*/src/**/*.tsx',
      'apps/*/src/**/*.ts',
      'examples/src/**/*.ts',
      'examples/src/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
);
