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

  it('starts the beginner journey on b01', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: 'Meet Git' })).toBeInTheDocument();
    expect(screen.queryByText('Your mission')).not.toBeInTheDocument(); // Learn stage first
  });

  it('switches locale immediately without resetting the lesson flow', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'de');

    expect(screen.getByRole('heading', { name: 'Lerne Git kennen' })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('lang', 'de');
  });

  it('hides Pro surfaces in Noob Mode and reveals them in Pro Mode', async () => {
    const user = userEvent.setup();
    renderApp();

    expect(screen.queryByRole('heading', { name: 'Git Tutor' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Time Machine' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pro Mode' }));

    expect(screen.getByRole('heading', { name: 'Git Tutor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Time Machine' })).toBeInTheDocument();
  });
});
