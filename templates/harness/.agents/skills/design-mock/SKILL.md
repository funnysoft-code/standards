---
name: design-mock
description: Create or change a screen mock. Search Mobbin first. Writes __DESIGN_ROOT__/mocks/<slug>/index.html, mock.png, and mock-mobile.png. Stops there. Do not use when writing app code.
---

# Design mock

Use when creating or changing a screen mock. Search Mobbin before writing HTML. Do not implement the route. When `index.html`, `mock.png`, and `mock-mobile.png` exist, stop and load `frontend-ui`.

## Store

```
__DESIGN_ROOT__/mocks/<slug>/
  index.html
  mock.png
  mock-mobile.png
```

`<slug>` is the route name (`home`, `settings`). One responsive `index.html`. Desktop viewport is 1440x900. Phone viewport is 390x844.

## Brief

1. Read `__DESIGN_ROOT__/DESIGN.md` and `tokens.css`.
2. Read the __TEAM__ lean.
3. Use product domain words from the product docs.

## Reference

Call the Mobbin MCP before any HTML. Discover the tools in this session. Use `search_screens` for one surface, `search_flows` for a sequence, `search_sections` for marketing.

One intent per query. Name the UI pieces. Set `platform` to `web` for the web app or `ios` when a native app exists. Ask for 3 to 8 results. Prefer deep mode. Look at the screenshots. Take the pattern. Tokens and type stay in DESIGN.md. Do not copy another app's brand.

Each option names the app and the Mobbin URL.

If Mobbin tools are missing or unauthorized, stop. Tell the owner to authenticate the Mobbin MCP. Do not invent URLs. Do not write the HTML.

## Write

The same session writes the HTML. No subprocess. No daemon. No font CDN. No JS toolchain.

- One self-contained HTML file. Inline CSS. Copy token values from `tokens.css`. Brand files via relative paths from the mock folder.
- Static layout and copy only, unless the issue names an interaction.
- Phone layout lives in the same file. Use a max-width media query. Do not invent a second visual language.
- If a value is not in DESIGN.md, leave a gap or ask once.
- Put the Mobbin URLs in an HTML comment at the top of every file you write.

If the owner has not named a direction, write `index-a.html` and `index-b.html` after the Mobbin search, screenshot both at both viewports, and stop until they pick. Rename the winner to `index.html`. Keep the comment.

## Shoot

```
./scripts/screenshot.sh __DESIGN_ROOT__/mocks/<slug>/index.html __DESIGN_ROOT__/mocks/<slug>/mock.png
./scripts/screenshot.sh __DESIGN_ROOT__/mocks/<slug>/index.html __DESIGN_ROOT__/mocks/<slug>/mock-mobile.png 390x844
```

`mock.png` and `mock-mobile.png` are the comparison artifacts. `index.html` is the spec you edit.

## Stop

Do not implement the route. Hand off: mock exists, load `frontend-ui`.
