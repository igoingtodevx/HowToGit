import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppStateProvider } from './application/AppStateProvider';
import { I18nProvider } from './i18n/i18n';
import './styles/design-tokens.css';
import './styles/global.css';

const root = document.getElementById('root');
if (!root) throw new Error('Application root element is missing');

createRoot(root).render(
  <StrictMode>
    <AppStateProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </AppStateProvider>
  </StrictMode>,
);
