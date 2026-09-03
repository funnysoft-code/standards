---
name: frontend-ui
description: Implement a screen after a mock exists. Requires __DESIGN_ROOT__/mocks/<slug>/index.html, mock.png, and mock-mobile.png. Ends at route.png and route-mobile.png compared to the mocks.
---

# Frontend UI

Use when implementing a screen after a mock exists. Do not write the mock here.

## Before code

Refuse to start if `__DESIGN_ROOT__/mocks/<slug>/index.html`, `mock.png`, or `mock-mobile.png` is missing. Tell the caller to run `design-mock` first.

Read the mock HTML and `__DESIGN_ROOT__/DESIGN.md`.

Laptop API is Herd. Do not use Sail. Cursor Cloud is out.

## Build

The route follows the mock. Tightening spacing is allowed. A new visual language is not.

shadcn/ui plus shadcn registries is the only web UI kit. Theme with tokens from DESIGN.md. Promote a primitive only when a second app needs it. Storybook waits for the first shared primitive. It does not replace the route screenshot. The route is the screen.

## Visual loop

```
./scripts/screenshot.sh <real-route-url> __DESIGN_ROOT__/mocks/<slug>/route.png
./scripts/screenshot.sh <real-route-url> __DESIGN_ROOT__/mocks/<slug>/route-mobile.png 390x844
```

Desktop is 1440x900. Phone is 390x844. Compare `route.png` to `mock.png` and `route-mobile.png` to `mock-mobile.png`, plus DESIGN.md. Fix the route or the mock.
