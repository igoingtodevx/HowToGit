# Handoff Notes

## Why this pack does not prebuild the whole UI

The high-value prework is specification that constrains implementation without creating untested repo-coupled code.

Prebuilt here:

- invariants;
- domain types;
- user-facing bilingual copy;
- curriculum/scenarios;
- test oracles;
- AI contracts;
- visual/UX rules.

Deliberately left to Codex inside the real repository:

- reducer/executor internals;
- React component trees;
- SVG layout algorithms;
- Framer Motion orchestration;
- responsive CSS implementation;
- browser QA.

Those areas depend heavily on compile/test/render feedback.

## Most important anti-drift rule

Do not let the project become merely:

> terminal + graph + chatbot

The distinctive beginner loop is:

**command → deterministic state transition → Git X-Ray + graph + terminal + short explanation**

That loop is the product.
