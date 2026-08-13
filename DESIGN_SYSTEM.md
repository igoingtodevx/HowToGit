# Design System

## Objective

Premium developer tool, not a generic AI SaaS template.

The interface should communicate precision, calm, depth and causality. The most impressive moments come from repository state transitions, not decorative gradients.

## Motion hierarchy

1. **Semantic state motion** — most visible: staging, commit birth, branch/HEAD movement, merge, conflict, stash, rebase.
2. **Interaction feedback** — subtle: hover, focus, tooltip, panel transitions.
3. **Ambience** — minimal: faint grid/noise/glow only where it supports depth.

## Layout

Desktop:
- left navigation ~248–280px;
- center workspace fluid;
- AI panel ~380–420px overlay/dock;
- Graph/X-Ray above terminal or adaptive split based on viewport height.

Mobile:
- one primary learning surface at a time;
- navigation in sheet/drawer;
- AI full-screen/sheet;
- graph/X-Ray horizontally inspectable where needed;
- terminal remains practical;
- no page horizontal overflow.

## Typography

- Headings: Outfit or equivalent strong display face.
- Body/UI: Inter.
- Code/Terminal: JetBrains Mono.

Keep explanatory copy compact and code visually distinct.

## Surface treatment

Avoid glass everywhere.

Prefer:
- opaque dark root;
- mostly opaque elevated workspace panels;
- occasional translucent Command Lens/AI overlays;
- fine borders;
- restrained shadows/glows.

## Git X-Ray

The three zones must differ through structure and labeling, not color alone.

File card states:
- unchanged;
- modified;
- staged;
- deleted;
- conflicted.

## Git Graph

Branch palette must be distinguishable but restrained. HEAD must be recognizable by label/shape/outline as well as color.

## Timing guidance

- hover/focus: ~100–180ms;
- panel: ~180–280ms;
- semantic transition: ~280–700ms;
- auto-demo can slow meaningful steps to ~600–1100ms.

Never block command execution on animation completion.

## Reduced motion

Replace movement with cross-fade/highlight/static before-after state. Semantic comprehension must remain.
