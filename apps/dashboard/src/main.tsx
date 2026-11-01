import { createI18n, I18nextProvider, resolveLanguage } from '@zahln/i18n';
import { cssVariables } from '@zahln/ui-web';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { AuthProvider } from './lib/auth';
import { createContainer } from './lib/container';
import { DependenciesProvider } from './lib/dependencies';
import './index.css';

const language = resolveLanguage(navigator.languages);
document.documentElement.lang = language;

const dark = window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => document.documentElement.setAttribute('style', cssVariables(dark.matches ? 'dark' : 'light'));
applyTheme();
dark.addEventListener('change', applyTheme);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <I18nextProvider i18n={createI18n(language)}>
      <DependenciesProvider container={createContainer()}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </DependenciesProvider>
    </I18nextProvider>
  </StrictMode>,
);
