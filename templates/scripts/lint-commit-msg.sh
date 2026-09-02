#!/usr/bin/env bash
# Shared Conventional Commit check. Lefthook and CI both call this.
set -euo pipefail

PATTERN='^(Merge .+|Revert .+|fixup! .+|squash! .+|(feat|fix|docs|refactor|test|chore|ci|build|perf|style|revert)(\([a-z0-9._-]+\))?(!)?: .+)'

lint_subject() {
  local subject="$1"
  if ! printf '%s\n' "$subject" | grep -qE "$PATTERN"; then
    printf 'Commit message does not match Conventional Commits: %s\n' "$subject" >&2
    return 1
  fi
}

failed=0

if [[ "${1:-}" == "--file" ]]; then
  if [[ $# -ne 2 ]]; then
    echo "Usage: lint-commit-msg.sh --file PATH" >&2
    exit 2
  fi
  lint_subject "$(head -n1 "$2")" || failed=1
elif [[ $# -gt 0 ]]; then
  for subject in "$@"; do
    lint_subject "$subject" || failed=1
  done
elif [[ ! -t 0 ]]; then
  while IFS= read -r subject || [[ -n "$subject" ]]; do
    [[ -z "$subject" ]] && continue
    lint_subject "$subject" || failed=1
  done
else
  echo "Usage: lint-commit-msg.sh [--file PATH | MESSAGE ...]" >&2
  exit 2
fi

exit "$failed"
