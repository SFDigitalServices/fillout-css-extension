import { join } from 'node:path'
import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, includeIgnoreFile } from 'eslint/config'
import stylistic from '@stylistic/eslint-plugin'

export default defineConfig([
  includeIgnoreFile(join(__dirname, '.gitignore')),
  // see: https://typescript-eslint.io/getting-started/typed-linting
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        /**
         * allows type checking on files _not_ explicitly included in
         * tsconfig.json's "include" list
         * https://typescript-eslint.io/packages/parser#allowdefaultproject
         */
        allowDefaultProject: ['*.js', '*.ts'],
      },
    },
  },
  // style rules (quotes, semicolons, whitespace, etc.)
  stylistic.configs.customize({
    severity: 'warn',
    commaDangle: 'only-multiline',
  }),
  {
    files: [
      '**/*.{js,ts}',
    ],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions
      },
    },
  },
  {
    files: [
      '**/*.spec.*',
      '**/test/**',
      '**/jest.setup.*',
    ],
    rules: {
      // unsafe assignments are used to test edge cases
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
    languageOptions: {
      globals: globals.jest,
    },
  },
])
