import { useAppState } from '../application/AppStateProvider';
import { getLesson } from './catalog';
import { createLessonScenario } from './scenarios';
import type { ChallengeValidationResult, LessonId } from './types';
import { validateLesson } from './validators';

/**
 * Validates the active lesson against the current repository state.
 * Pure and cheap — safe to call from every component that renders mission status.
 */
export function useLessonValidation(): ChallengeValidationResult | null {
  const { state } = useAppState();
  const lesson = getLesson(state.activeLessonId as LessonId);
  if (lesson.conceptual) {
    return validateLesson(lesson.validatorId, { state: state.git, initialState: state.git, interaction: state.interaction });
  }
  const initialState = createLessonScenario(lesson.id);
  if (!initialState) return null;
  return validateLesson(lesson.validatorId, { state: state.git, initialState, interaction: state.interaction });
}
