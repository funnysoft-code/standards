---
description: Laravel agent layer. Boost, Herd, and backend conventions.
globs: __LARAVEL_GLOBS__
alwaysApply: false
---

# Laravel

Laravel lives in the app tree that owns `__BOOST_ARTISAN__`. Cursor, Grok Build, Codex, and Claude are laptop process harnesses. Laravel Boost is the Laravel agent layer.

- Read the Laravel app `AGENTS.md` when it exists. Use Boost skills in that app tree for PHP work, matching the harness that is open.
- Run `composer` and Artisan on the laptop through Herd (`herd composer`, `herd php artisan`). Do not use Sail. Cursor Cloud is out.
- Follow product backend pillars (`docs/04-backend.md` when present). Do not contradict the playbook.
- Do not overwrite root `AGENTS.md`. Boost lines stay in the Laravel app tree.
- Repo-root MCP starts Boost with `php` and `__BOOST_ARTISAN__ boost:mcp`. Cursor uses `.cursor/mcp.json` and the `${workspaceFolder}` form. Grok uses `.grok/config.toml`. Codex uses `.codex/config.toml`. Do not set `cwd` in the Cursor file.
