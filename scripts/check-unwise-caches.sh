#!/usr/bin/env bash
set -euo pipefail

echo "Checking for SELECT * and unstable_cache without Buffer.byteLength..."
errors=0

# Check for SELECT * occurrences
select_matches=$(git grep -I -n --exclude-dir=.next --exclude-dir=node_modules -e "SELECT[[:space:]]*\\*" -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.sql' || true)
if [ -n "$select_matches" ]; then
  echo "Found SELECT * occurrences:"
  echo "$select_matches"
  errors=1
fi

# Find files using unstable_cache
files=$(git grep -I -l --exclude-dir=.next --exclude-dir=node_modules -e "unstable_cache\(" -- '*.ts' '*.tsx' '*.js' '*.jsx' || true)
if [ -n "$files" ]; then
  echo "Checking unstable_cache usages for Buffer.byteLength diagnostics..."
  while IFS= read -r f; do
    if [ -z "$f" ]; then continue; fi
    if git grep -n "Buffer.byteLength" -- "$f" >/dev/null; then
      echo "OK: $f contains Buffer.byteLength"
    else
      echo "MISSING: $f uses unstable_cache but contains no Buffer.byteLength pre-cache diagnostic"
      echo "-> Add: Buffer.byteLength(JSON.stringify(payload), 'utf8') and guard before caching"
      errors=1
    fi
  done <<< "$files"
fi

if [ "$errors" -ne 0 ]; then
  echo "One or more issues found. Please fix them before committing."
  exit 1
fi

echo "All checks passed."
