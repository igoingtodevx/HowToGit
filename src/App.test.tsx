import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { AppStateProvider } from './application/AppStateProvider';
import { I18nProvider } from './i18n/i18n';

function renderApp() {
  return render(
    <AppStateProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </AppStateProvider>,
  );
}

describe('application shell', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('gitflow-academy:preferences:v1', JSON.stringify({ locale: 'en', mode: 'noob', progress: {}, onboarded: true }));
  });

  it('starts in Noob mode and exposes primary navigation', () => {
    renderApp();

    expect(screen.getByRole('button', { name: 'Noob Mode' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('complementary', { name: 'Primary navigation' })).toBeInTheDocument();
  });

  it('keeps beginner Noob mode focused on the mission and practice terminal', () => {
    renderApp();

    expect(screen.getByText('Your mission')).toBeInTheDocument();
    expect(screen.getByText('git add <file>')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Terminal' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('heading', { name: 'Git Tutor' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'git init' })).not.toBeInTheDocument();
  });

  it('switches locale immediately', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'de');

    expect(screen.getByRole('heading', { name: 'Deine drei Git-Zonen' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'de');
  });
});
