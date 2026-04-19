**Developer Guide: cache-size checks & diagnostics**

Purpose: prevent large serialized payloads from being returned from server functions wrapped in `unstable_cache` (these can crash Next.js runtime caches).

What we added:
- Local checks: `scripts/check-unwise-caches.sh` (bash) and `scripts/check-unwise-caches.ps1` (PowerShell).
- CI checks: GitHub Actions workflows that fail on `SELECT *` and on `unstable_cache` usages missing a `Buffer.byteLength` diagnostic.

Recommended diagnostic snippet (add near the top of server helpers that return cached payloads):

Example:

```
const payload = { rows };
const size = Buffer.byteLength(JSON.stringify(payload), 'utf8');
if (size > 1_800_000) {
  console.warn('Large cacheable payload:', { size });
  // Consider pagination, explicit column selection, or avoiding unstable_cache for this endpoint
}
return payload;
```

How to run local checks:

Bash (Linux/macOS/Git Bash on Windows):

```bash
./scripts/check-unwise-caches.sh
```

PowerShell (Windows):

```powershell
.\scripts\check-unwise-caches.ps1
```

Where to add checks:
- Any file exporting server-side helpers that use `unstable_cache` should include a pre-cache size diagnostic using `Buffer.byteLength` before returning a large object.
- Avoid `SELECT *` in source SQL — prefer explicit column lists and LIMITs.

Want me to add a `pre-commit` hook that runs the local script automatically? Reply "yes" and I'll add it.

Enable pre-commit hooks

1. Configure your local Git to use the repository hooks directory:

Bash / Git Bash / WSL:

```bash
./scripts/setup-git-hooks.sh
```

PowerShell (Windows):

```powershell
.\scripts\setup-git-hooks.ps1
```

2. After running the setup, the repository will invoke `scripts/check-unwise-caches.sh` (or the PowerShell equivalent) on every commit. If checks fail, commits will be aborted.

To disable locally, run:

```bash
git config --unset core.hooksPath
```

