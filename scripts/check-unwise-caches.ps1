Param()

Write-Host "Checking for SELECT * and unstable_cache without Buffer.byteLength..."
$errors = $false

try {
  $select = git grep -I -n --exclude-dir=.next --exclude-dir=node_modules -e "SELECT[[:space:]]*\*" -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.sql' 2>$null
} catch {
  $select = $null
}
if ($select) {
  Write-Host "Found SELECT * occurrences:`n$select"
  $errors = $true
}

try {
  $files = git grep -I -l --exclude-dir=.next --exclude-dir=node_modules -e "unstable_cache\(" -- '*.ts' '*.tsx' '*.js' '*.jsx' 2>$null
} catch {
  $files = $null
}
if ($files) {
  Write-Host "Checking unstable_cache usages for Buffer.byteLength diagnostics..."
  $files -split "`n" | ForEach-Object {
    if (-not [string]::IsNullOrWhiteSpace($_)) {
      $f = $_.Trim()
      $has = git grep -n "Buffer.byteLength" -- $f 2>$null
      if (-not $has) {
        Write-Host "MISSING: $f uses unstable_cache but contains no Buffer.byteLength pre-cache diagnostic"
        Write-Host "-> Add: Buffer.byteLength(JSON.stringify(payload), 'utf8') and guard before caching"
        $errors = $true
      } else {
        Write-Host "OK: $f contains Buffer.byteLength"
      }
    }
  }
}

if ($errors) {
  Write-Error "One or more issues found. Please fix them before committing."
  exit 1
} else {
  Write-Host "All checks passed."
  exit 0
}
