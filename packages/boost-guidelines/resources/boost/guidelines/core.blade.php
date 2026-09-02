## FunnySoft

- Quality gates are zero-violation. Do not shrink a baseline to land a change.
- Process lives in the process harnesses and Linear. Do not treat Boost as the process harness.
- Do not invent extra packages, modules, or empty config for unused vendors.
- Do not add repository interfaces. Do not add a `BaseAction` or `BaseRepository`.
- Public identifiers are UUIDs. Integer `id` never appears in HTTP, OpenAPI, or filters.

@if(! $assist->hasPackage('inertiajs/inertia-laravel'))
## Laravel JSON API

- Domain modules own domain nouns. Product surfaces live in frontend apps.
- Write path: Form Request to Data to Action to Resource. List and show use QueryBuilder allowlists on the repository. Do not add a Data object on list or show.
- JSON keys are snake_case. JSON HTTP lives on `/api` with no `/v1` prefix.
- Flatten modules. A class lives at `Modules/{Module}/Actions/...`, not `Modules/{Module}/app/Actions/...`.
- Do not add a JS toolchain to a JSON API.
@endif

@if($assist->hasPackage('inertiajs/inertia-laravel') && $assist->hasPackage(\Laravel\Boost\Support\PackageRegistry::INERTIA_REACT))
## Laravel + Inertia + React

- Pages live in `resources/js/pages`. Use `Inertia::render()`.
- Write path: Form Request → Data → Action → repository → Inertia.
- Action classes use the `*Action` suffix.
- Do not add a Blade page for a route that already renders Inertia.
- Forms use Inertia form helpers. Do not post a classic Blade form on an Inertia route.
- Keep the existing page layout. Do not add a second SPA shell.
@endif
