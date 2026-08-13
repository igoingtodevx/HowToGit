import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { AppStateProvider } from '../application/AppStateProvider';
import { I18nProvider } from '../i18n/i18n';

const renderApp = () => render(<AppStateProvider><I18nProvider><App /></I18nProvider></AppStateProvider>);

describe('real simulator landing', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('starts from zero without requiring an account', async () => {
    const user = userEvent.setup();
    renderApp();
    expect(screen.getByRole('heading', { name: 'Master Git by seeing what it actually does.' })).toBeInTheDocument();
    expect(screen.getByText(/No account/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start from zero' }));
    expect(screen.getByRole('heading', { name: 'Meet Git' })).toBeInTheDocument();
  });

  it('replay executes the real command engine', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, media: '', onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })));
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Replay demo' }));
    expect((await screen.findAllByText('1 commit')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('region', { name: /Repository:/ })).toHaveTextContent('app.ts');
    expect(await screen.findByRole('button', { name: 'Replay demo' })).toBeEnabled();
  });
});
