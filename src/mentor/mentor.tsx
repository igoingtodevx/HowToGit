import type { LessonId } from '../lessons';
import { useI18n } from '../i18n/i18n';

/**
 * Original mentor abstraction: "the Guide".
 *
 * All dialogue lives in the i18n catalogs under `mentor.*`; this module only
 * picks the right key for an event and renders the neutral avatar treatment.
 * A later visual pass can replace the avatar mark and personality without
 * touching lesson logic — the copy and the state machine stay separate.
 */

export type MentorEvent =
  | { kind: 'intro'; lessonId: LessonId }
  | { kind: 'hint'; level: 1 | 2 | 3 }
  | { kind: 'wrong'; reason: 'notGit' | 'generic' | 'stuck' | 'noProgress' }
  | { kind: 'success'; context: 'first' | 'next' | 'lesson' }
  | { kind: 'confirm'; correct: boolean }
  | { kind: 'milestone'; lessonId: 'b05' | 'b10' }
  | { kind: 'line'; tone: 'see' | 'takeaway' | 'done' };

const FALLBACKS: Readonly<Record<MentorEvent['kind'], string>> = {
  intro: 'mentor.intro.generic',
  hint: 'mentor.hint.1',
  wrong: 'mentor.wrong.generic',
  success: 'mentor.success.next',
  confirm: 'mentor.confirm.correct',
  milestone: 'mentor.milestone.b05',
  line: 'mentor.see',
};

export function mentorKeyFor(event: MentorEvent): string {
  switch (event.kind) {
    case 'intro': return `mentor.intro.${event.lessonId}`;
    case 'hint': return `mentor.hint.${event.level}`;
    case 'wrong': return `mentor.wrong.${event.reason}`;
    case 'success': return `mentor.success.${event.context}`;
    case 'confirm': return event.correct ? 'mentor.confirm.correct' : 'mentor.confirm.wrong';
    case 'milestone': return `mentor.milestone.${event.lessonId}`;
    case 'line': return `mentor.${event.tone}`;
  }
}

/** Resolves the key, falling back to the generic line when a lesson has no intro. */
export function mentorLineFor(event: MentorEvent, t: (key: string) => string): string {
  const key = mentorKeyFor(event);
  const direct = t(key);
  if (direct !== key) return direct;
  return t(event.kind === 'intro' ? FALLBACKS.intro : FALLBACKS[event.kind]);
}

/** Avatar placeholder: a merge glyph. Replace with real artwork without touching logic. */
export function MentorAvatar({ size = 34 }: { size?: number }) {
  return (
    <svg className="mentor-avatar" width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" focusable="false">
      <circle cx="17" cy="17" r="16" fill="var(--bg-elevated)" stroke="var(--border-strong)" />
      <path d="M7 12 C 12 12, 12 18, 17 22 C 22 18, 22 12, 27 12" fill="none" stroke="var(--info)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="7" cy="11" r="2.4" fill="var(--info)" />
      <circle cx="27" cy="11" r="2.4" fill="var(--info)" />
      <circle cx="17" cy="22.5" r="3" fill="var(--success)" />
    </svg>
  );
}

export function Mentor({ event, live = false }: { event: MentorEvent; live?: boolean }) {
  const { t } = useI18n();
  const line = mentorLineFor(event, t);
  const regionProps = live ? { role: 'status', 'aria-live': 'polite' as const } : {};
  return (
    <div className="mentor" {...regionProps}>
      <MentorAvatar />
      <div className="mentor-bubble">
        <strong>{t('mentor.name')}</strong>
        <p>{line}</p>
      </div>
    </div>
  );
}
