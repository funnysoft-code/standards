#!/usr/bin/env bash
# Capture a PNG. Usage: screenshot.sh <url-or-file> <output.png> [WIDTHxHEIGHT]
# Default viewport is 1440x900. Phone is 390x844. Ignores TLS errors so Caddy local_certs work on Cloud.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
exec bun "$root/scripts/screenshot.mjs" "$@"
