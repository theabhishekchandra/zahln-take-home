import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { layerRules } from './layers.js';

export { layerRules };

/**
 * Lint config for a shared package in packages/.
 * @param {string} workspace package name, e.g. "@zahln/domain"
 */
export function packageConfig(workspace) {
  return tseslint.config(
    { ignores: ['dist/**', 'coverage/**'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      languageOptions: { globals: { ...globals.es2022 } },
      rules: {
        '@typescript-eslint/consistent-type-imports': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      },
    },
    layerRules(workspace),
  );
}
