import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { AppStateProvider, useAppState } from './AppStateProvider';
import { I18nProvider } from '../i18n/i18n';

function StateProbe() {
  const { state } = useAppState();
  return <output aria-label="state-probe">{JSON.stringify({ initialized: state.git.initialized, commits: Object.keys(state.git.commits).length, work: Object.keys(state.git.workingTree), index: Object.keys(state.git.index), locale: state.locale, stage: state.flow.stage, completed: state.progress.b01?.completed })}</output>;
}

function renderApp() {
  return render(<AppStateProvider><I18nProvider><App /><StateProbe /></I18nProvider></AppStateProvider>);
}

const terminalInput = () => screen.getByRole('textbox', { name: 'Type a Git command…' });

describe('vertical slice integration', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('gitflow-academy:preferences:v1', JSON.stringify({ locale: 'en', mode: 'noob', progress: {}, onboarded: true }));
  });

  it('completes the b01 journey: wrong command → useful feedback → hint → git init → success → advance', async () => {
    const user = userEvent.setup();
    renderApp();

    // Learn stage first: no terminal mission yet.
    expect(screen.getByRole('heading', { name: 'Meet Git' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: "I'm ready — show me the mission" }));

    // Wrong command produces educational feedback, not shame.
    const input = terminalInput();
    await user.type(input, 'git status{Enter}');
    expect(screen.getAllByText(/isn't initialized here yet/i).length).toBeGreaterThan(0);

    // Hints progress and get recorded.
    await user.click(screen.getByRole('button', { name: /Hint 1\/3/ }));
    expect(screen.getByText(/Git isn't watching your folder yet/i)).toBeInTheDocument();

    // The correct command completes the mission.
    await user.type(input, 'git init{Enter}');
    expect(screen.getByLabelText('state-probe')).toHaveTextContent('"initialized":true');
    expect(screen.getByLabelText('state-probe')).toHaveTextContent('"stage":"see"');
    expect(screen.getByText('What just changed')).toBeInTheDocument();
    expect(screen.getByLabelText('state-probe')).toHaveTextContent('"completed":true');

    // See → Confirm → Done → next lesson.
    await user.click(screen.getByRole('button', { name: 'Check your understanding' }));
    await user.click(screen.getByRole('button', { name: /creates the hidden `.git` folder/i }));
    await user.click(screen.getByRole('button', { name: 'Finish lesson' }));
    expect(screen.getByText('Lesson complete!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Next: Your Three Git Zones/ }));
    expect(screen.getByRole('heading', { name: 'Your Three Git Zones' })).toBeInTheDocument();
  }, 20_000);

  it('completes the first-commit journey in b02: edit → add → commit moves state visibly', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: /Your Three Git Zones/ }));
    await user.click(screen.getByRole('button', { name: "I'm ready — show me the mission" }));

    const editor = screen.getByRole('textbox', { name: 'Content' });
    await user.clear(editor);
    await user.type(editor, 'console.log("hello");');
    await user.click(screen.getByRole('button', { name: 'Save change' }));

    const input = terminalInput();
    await user.type(input, 'git add app.ts{Enter}');
    await user.type(input, 'git commit -m "First snapshot"{Enter}');

    expect(screen.getByLabelText('state-probe')).toHaveTextContent('"commits":1');
    expect(screen.getByRole('region', { name: /Repository:/ })).toHaveTextContent('app.ts');
    expect(screen.getByRole('group', { name: 'Commit graph' })).toHaveTextContent('First snapshot');
    expect(screen.getByLabelText('state-probe')).toHaveTextContent('"stage":"see"');
  }, 20_000);

  it('changes locale without resetting repository state', async () => {
    const user = userEvent.setup();
    renderApp();

    const input = terminalInput();
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
    expect(screen.getByRole('heading', { name: 'Meet Git' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start from zero' })).not.toBeInTheDocument();
  });

  it('synchronizes the file editor when a lesson loads its scenario', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /Your Three Git Zones/ }));
    expect(screen.getByRole('textbox', { name: 'Content' })).toHaveValue('');
  });

  it('preserves an unsaved editor draft across read-only Git commands', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: /Your Three Git Zones/ }));

    const editor = screen.getByRole('textbox', { name: 'Content' });
    await user.clear(editor);
    await user.type(editor, 'unsaved draft');

    const input = terminalInput();
    await user.clear(input);
    await user.type(input, 'git status{Enter}');
    expect(editor).toHaveValue('unsaved draft');
  });
});
