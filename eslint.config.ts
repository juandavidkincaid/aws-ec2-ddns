import eslint from '@eslint/js';
import type { ESLint } from 'eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';
import unusedImports from 'eslint-plugin-unused-imports';

export default defineConfig(
  {
    ignores: ['node_modules/**', 'build/**', 'coverage/**', '.installations/**']
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      'import-x': importX as unknown as ESLint.Plugin,
      'unused-imports': unusedImports
    },
    rules: {
      'no-control-regex': 'off',
      '@typescript-eslint/no-unnecessary-type-constraint': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-async-promise-executor': 'off',
      'import-x/no-unresolved': 'off',
      'import-x/order': [
        'error',
        {
          'newlines-between': 'always',
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index'
          ]
        }
      ],
      'import-x/no-duplicates': 'error',
      'import-x/no-useless-path-segments': [
        'error',
        {
          noUselessIndex: false
        }
      ],
      'unused-imports/no-unused-imports': 'error'
    }
  }
);
