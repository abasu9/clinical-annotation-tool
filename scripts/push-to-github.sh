#!/usr/bin/env bash
# Push this project to https://github.com/abasu9/clinical-annotation-tool
# Run from the project root. Safe: aborts if the real dataset would be committed.

set -euo pipefail

REMOTE_URL="https://github.com/abasu9/clinical-annotation-tool.git"
BRANCH="main"

if [[ ! -f package.json ]]; then
  echo "Run this from the project root (where package.json lives)." >&2
  exit 1
fi

if [[ ! -d .git ]]; then
  echo "→ git init"
  git init -b "$BRANCH"
fi

echo "→ Staging files (respecting .gitignore)"
git add -A

echo "→ Sanity checks"
fail=0
if git ls-files --cached | grep -F 'sample_data/data_sample_100' >/dev/null; then
  echo "!!! Real dataset (sample_data/data_sample_100.*) is staged. Aborting." >&2
  fail=1
fi
if git ls-files --cached | grep -E '^Dataset/' >/dev/null; then
  echo "!!! Dataset/ is staged. Aborting." >&2
  fail=1
fi
if git ls-files --cached | grep -E '^node_modules/' >/dev/null; then
  echo "!!! node_modules is staged. Aborting." >&2
  fail=1
fi
if git ls-files --cached | grep -E '^\.env$' >/dev/null; then
  echo "!!! .env is staged. Aborting." >&2
  fail=1
fi
if (( fail )); then exit 1; fi

echo "→ $(git ls-files --cached | wc -l | tr -d ' ') files will be committed"

if ! git rev-parse HEAD >/dev/null 2>&1; then
  echo "→ Initial commit"
  git commit -m "Initial implementation: Supabase + R2 frontend-only annotation tool

- React + TypeScript + Tailwind UI for annotator + admin workflows
- Supabase schema for datasets / samples / annotations (RLS disabled in prototype)
- CSV/JSONL import in browser; upsert annotations; CSV/JSONL export
- Image viewer with multi-image nav and zoom
- scripts/prepare-dataset.mjs to fan out images and rewrite to R2 URLs"
else
  if git diff --cached --quiet; then
    echo "→ Nothing new to commit"
  else
    git commit -m "Update project files"
  fi
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "→ Adding remote origin → $REMOTE_URL"
  git remote add origin "$REMOTE_URL"
else
  git remote set-url origin "$REMOTE_URL"
fi

echo "→ Fetching existing remote main (it has 1 commit — LICENSE)"
git fetch origin "$BRANCH" || true

if git rev-parse --verify --quiet "refs/remotes/origin/$BRANCH" >/dev/null; then
  echo "→ Merging existing LICENSE commit (unrelated history)"
  git pull --no-rebase --allow-unrelated-histories origin "$BRANCH" || {
    echo "Pull conflict. Resolve manually then re-run." >&2
    exit 1
  }
fi

echo "→ Pushing to origin/$BRANCH"
git push -u origin "$BRANCH"

echo "✔ Done. Open: https://github.com/abasu9/clinical-annotation-tool"
