---
description: Always-on design constraints for product screens. DESIGN.md is the SSOT. Mocks live in git. Visual loop is closed.
---

# Design

`__DESIGN_ROOT__/DESIGN.md` is the design source of truth. Tokens live beside it.

A new or changed screen is not implemented until `__DESIGN_ROOT__/mocks/<slug>/index.html`, `mock.png`, and `mock-mobile.png` exist.

A UI change is not done until `route.png` is compared to `mock.png`, `route-mobile.png` is compared to `mock-mobile.png`, and both match DESIGN.md. Mismatch is a fail.

Do not invent tokens, typefaces, or a second visual language in the mock or the route. Do not grow the token file in a mock. No purple gradient, Inter, or three equal feature cards. Theme is named in DESIGN.md.

Title and visible copy stay English.

The owner often cannot name a visual direction. Offer two concrete options with a Mobbin screen each. Do not ask for vibe words.

New or changed screen mocks cite Mobbin screens. A layout invented without a Mobbin search is a fail.

Open Design is not in the harness. Do not wait for a daemon.

Craft over CRUD. Works-but-ugly is a fail.
