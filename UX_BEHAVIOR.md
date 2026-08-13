# UX Behavior Contract

## First-use onboarding

Maximum three compact decisions:

1. language (auto-detected, editable);
2. `Start from zero` vs `I know the basics`;
3. enter the lab.

No account required.

## Noob learning sequence

For every new concept:

1. show the visual object;
2. demonstrate the transition;
3. name the concept;
4. let the learner reproduce it;
5. deepen terminology only afterward.

## Command feedback

Every command can produce three coordinated layers:

- Git-like terminal output;
- semantic visual transition;
- optional localized beginner explanation.

The explanation should answer only what matters now: what changed, why nothing happened, what Git needs, what is risky, or how to inspect the state.

## Errors

Never silently accept unsupported/wrong commands. Show Git-like output plus a short educational explanation in Noob Mode.

## Challenges

Validate resulting state, not exact command history. Alternative correct workflows should pass whenever they reach the intended state.

Hints:
- hint 1 = conceptual;
- hint 2 = points toward command family;
- hint 3 = near/exact command.

## Demo runner

A demo is a script of real simulator actions. Controls: pause, resume, next, restart, skip animation. No fake demo-only repo state.

## Language switching

Must be instant and state-preserving. It updates UI, lessons and tutor language; Git commands/output stay English.

## Mobile

Do not compress desktop three-panel UI into illegibility. Prefer sequential surfaces and sheets.
