# Daily ETL runner — scheduled via Windows Task Scheduler
# Runs: --update (incremental prices) + --scores
# Log file: data_pipeline/logs/daily_YYYY-MM-DD.log

$ErrorActionPreference = "Continue"

$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$python     = "C:\dev\projects\stocks-analyzer\venv\Scripts\python.exe"
$logDir     = Join-Path $scriptDir "logs"
$logFile    = Join-Path $logDir ("daily_" + (Get-Date -Format "yyyy-MM-dd") + ".log")

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

function Log($msg) {
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line -Encoding UTF8
}

Set-Location $scriptDir

Log "=== Daily ETL start ==="

Log "--- Running --update ---"
& $python main.py --update 2>&1 | ForEach-Object { Log $_ }
Log "Update exit code: $LASTEXITCODE"

Log "--- Running --scores ---"
& $python main.py --scores 2>&1 | ForEach-Object { Log $_ }
Log "Scores exit code: $LASTEXITCODE"

Log "=== Daily ETL done ==="
