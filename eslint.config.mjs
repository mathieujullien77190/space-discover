// ESLint : moteur (JS pur, navigateur), interface (TS / React), outils et tests (Node).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts', 'js/**', 'css/**', 'index.html', 'src/engine/data/**', '_archive/**', 'public/**'] },
  js.configs.recommended,
  {
    files: ['src/engine/**/*.js'],
    languageOptions: { globals: { ...globals.browser }, sourceType: 'module' },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'no-undef': 'error', 'no-var': 'error', 'prefer-const': 'off', 'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-empty': ['error', { allowEmptyCatch: true }], 'no-cond-assign': 'off', 'no-prototype-builtins': 'off', 'no-useless-escape': 'off',
    },
  },
  {
    files: ['tools/**/*.{js,mjs}', '*.mjs', 'vitest.config.mts'],
    languageOptions: { globals: { ...globals.node }, sourceType: 'module' },
    rules: { 'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }], 'no-empty': ['error', { allowEmptyCatch: true }], 'no-useless-escape': 'off', 'no-prototype-builtins': 'off' },
  },
  { files: ['tools/make-*.js', 'tools/lib-plans.js'], languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } } },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: { ...reactHooks.configs.recommended.rules, '@typescript-eslint/consistent-type-definitions': ['error', 'type'], 'func-style': ['error', 'expression'] },
  },
);
