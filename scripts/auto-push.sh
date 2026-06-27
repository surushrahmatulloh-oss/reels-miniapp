#!/bin/bash
# Auto add + commit + push (Git Bash / Mac / Linux)
set -e
ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

export GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-Auto Push}"
export GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-autopush@local}"
export GIT_COMMITTER_NAME="${GIT_COMMITTER_NAME:-Auto Push}"
export GIT_COMMITTER_EMAIL="${GIT_COMMITTER_EMAIL:-autopush@local}"

git add -A

if git diff --cached --quiet; then
  echo "[auto-push] nothing to commit"
  exit 0
fi

MSG="${1:-auto: $(date '+%Y-%m-%d %H:%M:%S')}"
git commit -m "$MSG"
# push runs via .git/hooks/post-commit
