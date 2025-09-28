import js from '@eslint/js'
import globals from 'globals'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  {
    ignores: ['dist', 'node_modules/**/*', '.wrangler/**/*'],
  },
  {
    files: ['**/*.{ts,js}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,
        ...globals.worker,
        KVNamespace: 'readonly',
        ExportedHandler: 'readonly',
        ScheduledController: 'readonly',
        ExportedHandlerFetchHandler: 'readonly',
        IncomingRequestCfProperties: 'readonly',
      },
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.test.{ts,js}', '**/tests/**/*.{ts,js}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]