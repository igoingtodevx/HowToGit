# Internationalization Contract

Locales: `en`, `de`.

Initial selection:

```ts
navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
```

Persisted user choice wins.

Localize:
- nav/onboarding/settings;
- lessons/goals/hints/challenge feedback;
- X-Ray/Command Lens;
- AI panel/tutor language;
- tooltips/toasts/dialogs;
- accessibility labels.

Do not localize:
- Git commands;
- realistic Git CLI output;
- branch/file names;
- hashes.

German style:
- direct `du`;
- technically precise;
- simple sentence structure in Noob Mode;
- keep familiar Git terms like `Staging Area`, then explain them rather than inventing uncommon translations.

Locale switching is runtime and state-preserving.
