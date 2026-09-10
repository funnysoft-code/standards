---
description: Laravel agent layer. Boost, Herd, and backend conventions.
globs: __LARAVEL_GLOBS__
alwaysApply: false
---

# Laravel

Laravel lives in the app tree that owns `__BOOST_ARTISAN__`. Laravel Boost is the Laravel agent layer, exposed through each provider's MCP adapter.

- Read the Laravel app `AGENTS.md` when it exists. Use Boost skills under `.agents/skills` for PHP work.
- Run `composer` and Artisan on the laptop through Herd (`herd composer`, `herd php artisan`). Do not use Sail. Cursor Cloud is out.
- Follow product backend pillars (`docs/04-backend.md` when present). Do not contradict the playbook.
- Do not overwrite root `AGENTS.md`. Boost lines stay in the Laravel app tree.
- Repo-root MCP starts Boost with `php` and `__BOOST_ARTISAN__ boost:mcp` from `.agents/mcp.json`. Run provider sync after changing it. Do not set a working directory on that command.
