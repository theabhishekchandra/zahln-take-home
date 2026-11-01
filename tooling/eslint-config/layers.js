/**
 * Which workspace may import which. This map is the single source of truth for
 * the architecture's dependency rules: anything not listed is a lint error.
 * Dependencies point downwards only: domain, application, adapters, apps.
 */
const CORE = ['@zahln/domain', '@zahln/application'];
const SHARED_FOR_APPS = [
  ...CORE,
  '@zahln/api-client',
  '@zahln/config',
  '@zahln/telemetry',
  '@zahln/i18n',
  '@zahln/ui-tokens',
];

export const LAYERS = {
  '@zahln/domain': [],
  '@zahln/application': ['@zahln/domain'],

  '@zahln/api-client': CORE,
  '@zahln/config': CORE,
  '@zahln/telemetry': ['@zahln/application'],
  '@zahln/adapters-native': CORE,
  '@zahln/adapters-web': CORE,
  // Fakes Zahln's API at the HTTP boundary, so tests run the real adapters.
  '@zahln/testing': [...CORE, '@zahln/api-client'],

  '@zahln/i18n': ['@zahln/domain'],
  '@zahln/ui-tokens': [],
  '@zahln/ui-native': ['@zahln/domain', '@zahln/i18n', '@zahln/ui-tokens'],
  '@zahln/ui-web': ['@zahln/domain', '@zahln/i18n', '@zahln/ui-tokens'],

  '@zahln/student': [...SHARED_FOR_APPS, '@zahln/adapters-native', '@zahln/ui-native'],
  '@zahln/till': [...SHARED_FOR_APPS, '@zahln/adapters-native', '@zahln/ui-native'],
  '@zahln/dashboard': [...SHARED_FOR_APPS, '@zahln/adapters-web', '@zahln/ui-web'],
};

/** Layers that must stay free of UI frameworks and platform SDKs. */
const PLATFORM_FREE = new Set([
  '@zahln/domain',
  '@zahln/application',
  '@zahln/api-client',
  '@zahln/config',
  '@zahln/telemetry',
  '@zahln/testing',
]);

const PLATFORM_PACKAGES = ['react', 'react/*', 'react-dom', 'react-dom/*', 'react-native', 'react-native/*', 'expo', 'expo-*', '@expo/*'];

/**
 * ESLint flat-config entry that enforces the layer rules for one workspace.
 * @param {keyof typeof LAYERS} workspace
 */
export function layerRules(workspace) {
  const allowed = LAYERS[workspace];
  if (!allowed) throw new Error(`Unknown workspace "${workspace}" — add it to tooling/eslint-config/layers.js`);

  const forbidden = Object.keys(LAYERS).filter((name) => name !== workspace && !allowed.includes(name));
  const patterns = [
    {
      group: forbidden.flatMap((name) => [name, `${name}/*`]),
      message: `${workspace} may only import: ${allowed.join(', ') || 'no other workspace'} (tooling/eslint-config/layers.js).`,
    },
    {
      group: ['**/packages/**', '**/apps/**'],
      message: 'Import other workspaces by package name, never by relative path.',
    },
  ];
  if (PLATFORM_FREE.has(workspace)) {
    patterns.push({
      group: PLATFORM_PACKAGES,
      message: `${workspace} must stay platform-free: no React, React Native or Expo imports. Put platform code in an adapter.`,
    });
  }

  return {
    name: `zahln/layers/${workspace}`,
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns }] },
  };
}
