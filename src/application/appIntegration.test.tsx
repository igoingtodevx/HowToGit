import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { AppStateProvider } from './AppStateProvider';
import { useAppState } from './AppStateProvider';
import { I18nProvider } from '../i18n/i18n';
import { createLessonScenario } from '../lessons';

function StateProbe() {
  const { state } = useAppState();
  return <output aria-label="state-probe">{JSON.stringify({ initialized: state.git.initialized, commits: Object.keys(state.git.commits).length, work: Object.keys(state.git.workingTree), index: Object.keys(state.git.index), locale: state.locale })}</output>;
}

function renderApp() {
  return render(<AppStateProvider><I18nProvider><App /><StateProbe /></I18nProvider></AppStateProvider>);
}

describe('vertical slice integration', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('gitflow-academy:preferences:v1', JSON.stringify({ locale: 'en', mode: 'noob', progress: {}, onboarded: true }));
  });

  it('completes initialize → modify → status → add → commit by keyboard-visible controls', async () => {
    const user = userEvent.setup();
    renderApp();
    const input = screen.getByRole('textbox', { name: 'Type a Git command…' });
    await user.clear(input);
    await user.type(input, 'git init{Enter}');
    await user.type(screen.getByRole('textbox', { name: 'Content' }), 'console.log("hello");');
    await user.click(screen.getByRole('button', { name: 'Save change' }));
    await user.type(input, 'git status{Enter}');
    await user.type(input, 'git add app.ts{Enter}');
    await user.type(input, 'git commit -m "First snapshot"{Enter}');
    expect(screen.getByLabelText('state-probe')).toHaveTextContent('"commits":1');
    expect(screen.getByRole('region', { name: /Repository:/ })).toHaveTextContent('app.ts');
    expect(screen.getByRole('img', { name: 'Commit graph' })).toHaveTextContent('First snapshot');
  }, 15_000);

  it('changes locale without resetting repository state', async () => {
    const user = userEvent.setup();
    renderApp();
    const input = screen.getByRole('textbox', { name: 'Type a Git command…' });
    await user.clear(input);
    await user.type(input, 'git init{Enter}');
    await user.type(input, 'git status{Enter}');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'de');
    expect(screen.getByLabelText('state-probe')).toHaveTextContent('"initialized":true');
    expect(screen.getByLabelText('state-probe')).toHaveTextContent('"locale":"de"');
    expect(screen.getByText('On branch main')).toBeInTheDocument();
  });

  it('keeps the learner in the workspace when resetting the lab', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Reset Lab' }));
    expect(screen.getByRole('heading', { name: 'Your Three Git Zones' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start from zero' })).not.toBeInTheDocument();
  });

  it('synchronizes the file editor when a lesson replaces repository state', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /Handle a Merge Conflict/ }));
    await user.click(screen.getByRole('button', { name: 'Restart lesson' }));
    const scenario = createLessonScenario('b07');
    expect(screen.getByRole('textbox', { name: 'Content' })).toHaveValue(scenario?.workingTree['app.ts']?.content);
  });

  it('preserves an unsaved editor draft across read-only Git commands', async () => {
    const user = userEvent.setup();
    renderApp();
    const editor = screen.getByRole('textbox', { name: 'Content' });
    await user.clear(editor);
    await user.type(editor, 'unsaved draft');
    const terminal = screen.getByRole('textbox', { name: 'Type a Git command…' });
    await user.clear(terminal);
    await user.type(terminal, 'git status{Enter}');
    expect(editor).toHaveValue('unsaved draft');
  });
});
