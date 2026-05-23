$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'hub.db'
$dir = Join-Path $root 'backups'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory $dir | Out-Null }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item $src (Join-Path $dir "hub-$stamp.db")
Write-Output "Backed up to backups/hub-$stamp.db"
