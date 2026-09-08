# Design loop

Full visual loop in every product. Craft over CRUD. Works-but-ugly is a fail.

Theme is silent in the playbook. Product DESIGN.md names it.

## SSOT

Product design SSOT is `__DESIGN_ROOT__/DESIGN.md` plus mocks next to it. Stamp replaces `__DESIGN_ROOT__`.

| Variant           | Design root                                    | Mocks                           |
| ----------------- | ---------------------------------------------- | ------------------------------- |
| Inertia monolith  | `design`                                       | `design/mocks/<slug>/`          |
| API+Next monorepo | `packages/design-system`                       | `packages/design-system/mocks/` |
| Next-only         | `design` unless the product names another root | `design/mocks/<slug>/`          |

## Mock folder

```
index.html
mock.png
mock-mobile.png
route.png
route-mobile.png
```

Desktop 1440x900. Phone 390x844. One responsive `index.html`. Inline CSS. Token values copied from the product token file. No font CDN. No JS toolchain. Mobbin URLs in an HTML comment. Search Mobbin before HTML. If Mobbin tools are missing, stop. Do not invent URLs.

A new or changed screen is not implemented until `index.html`, `mock.png`, and `mock-mobile.png` exist. A UI change is not done until `route.png` matches `mock.png` and `route-mobile.png` matches `mock-mobile.png`, plus DESIGN.md.

If the owner has not named a direction, write `index-a.html` and `index-b.html`, screenshot both, stop until they pick. Offer two concrete options with a Mobbin screen each. Do not ask for vibe words.

## Tools

`scripts/screenshot.sh` is the shooter. Default 1440x900. Phone 390x844.

Open Design is not in the harness. Do not wait for a daemon.

Mobbin is required. Authored MCP includes Mobbin.

## UI kit

No purple gradient, Inter, or three equal feature cards. Do not invent a second typeface or component kit. shadcn/ui plus shadcn registries is the only web UI kit. Tailwind via that setup. Do not grow a parallel component library.

Storybook waits for the first shared primitive. It does not replace the route screenshot.
