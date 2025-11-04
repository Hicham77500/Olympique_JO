<#
  Cleanup script for Olympique_JO repository
  - Removes stray node_modules and lock files outside src/api and src/webapp
  - Clears webapp build and common caches
  - Deletes stray .env files outside subprojects
  - Cleans Python and OS/editor artifacts
  Safe guards:
  - Keeps src/api and src/webapp node_modules intact
  - Only affects files inside this repository
#>

$ErrorActionPreference = 'SilentlyContinue'

# Resolve repo root from script path
$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot   = Split-Path -Parent $ScriptRoot
Write-Host "Repo root: $RepoRoot" -ForegroundColor Cyan

function Remove-PathSafe {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($Path)) { return }
  if (Test-Path -LiteralPath $Path) {
    Write-Host "Removing: $Path" -ForegroundColor Yellow
    try { Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop } catch {}
  }
}

function Remove-ByQuery {
  param(
    [string]$Base,
    [switch]$Directories,
    [string[]]$Include,
    [ScriptBlock]$Filter
  )
  $params = @{ Path = $Base; Recurse = $true; ErrorAction = 'SilentlyContinue' }
  if ($Directories) { $params['Directory'] = $true } else { $params['File'] = $true }
  if ($Include) { $params['Include'] = $Include }
  Get-ChildItem @params | Where-Object $Filter | ForEach-Object { Remove-PathSafe $_.FullName }
}

# Allowed locations to keep
$AllowedNodeModules = @(
  (Join-Path $RepoRoot 'src\api\node_modules'),
  (Join-Path $RepoRoot 'src\webapp\node_modules')
)
$AllowedPackages = @(
  (Join-Path $RepoRoot 'src\api\package.json'),
  (Join-Path $RepoRoot 'src\webapp\package.json')
)
$AllowedLocks = @(
  (Join-Path $RepoRoot 'src\api\package-lock.json'),
  (Join-Path $RepoRoot 'src\webapp\package-lock.json'),
  (Join-Path $RepoRoot 'src\api\yarn.lock'),
  (Join-Path $RepoRoot 'src\webapp\yarn.lock'),
  (Join-Path $RepoRoot 'src\api\pnpm-lock.yaml'),
  (Join-Path $RepoRoot 'src\webapp\pnpm-lock.yaml')
)
$AllowedEnvDirs = @(
  (Join-Path $RepoRoot 'src\api'),
  (Join-Path $RepoRoot 'src\webapp')
)

Write-Host "Step 1/7: Remove stray node_modules (outside api/webapp)" -ForegroundColor Cyan
$allNodeModules = Get-ChildItem -Path $RepoRoot -Recurse -Directory -Filter 'node_modules' -ErrorAction SilentlyContinue
foreach ($nm in $allNodeModules) {
  $full = $nm.FullName.TrimEnd('\\')
  # Skip node_modules that are within allowed top-level node_modules trees
  $isUnderAllowed = $false
  foreach ($allow in $AllowedNodeModules) {
    if ($full -like ("$allow*")) { $isUnderAllowed = $true; break }
  }
  if (-not $isUnderAllowed) {
    Remove-PathSafe $full
  }
}

Write-Host "Step 2/7: Remove JS lock files outside api/webapp" -ForegroundColor Cyan
$lockFiles = Get-ChildItem -Path $RepoRoot -Recurse -File -Include 'package-lock.json','yarn.lock','pnpm-lock.yaml' -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch "\\node_modules(\\|$)" }
foreach ($lf in $lockFiles) {
  if ($AllowedLocks -notcontains $lf.FullName) {
    Remove-PathSafe $lf.FullName
  }
}

Write-Host "Step 3/7: Remove stray .env files outside api/webapp" -ForegroundColor Cyan
$envCandidates = Get-ChildItem -Path $RepoRoot -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^\.env(\..*)?$' }
foreach ($ef in $envCandidates) {
  $parent = Split-Path -Parent $ef.FullName
  $isAllowed = $false
  foreach ($dir in $AllowedEnvDirs) { if ($parent -like ("$dir*")) { $isAllowed = $true; break } }
  if (-not $isAllowed) { Remove-PathSafe $ef.FullName }
}

Write-Host "Step 4/7: Clear webapp build output" -ForegroundColor Cyan
Remove-PathSafe (Join-Path $RepoRoot 'src\webapp\build')

Write-Host "Step 5/7: Clear caches (.cache, .parcel-cache) outside node_modules" -ForegroundColor Cyan
$cacheDirs = Get-ChildItem -Path $RepoRoot -Recurse -Directory -Include '.cache','.parcel-cache' -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "\\node_modules(\\|$)" }
foreach ($cd in $cacheDirs) { Remove-PathSafe $cd.FullName }

Write-Host "Step 6/7: Remove Python and Jupyter caches" -ForegroundColor Cyan
$pyCaches = Get-ChildItem -Path $RepoRoot -Recurse -Directory -Include '__pycache__','.ipynb_checkpoints','.pytest_cache' -ErrorAction SilentlyContinue
foreach ($pc in $pyCaches) { Remove-PathSafe $pc.FullName }

Write-Host "Step 7/7: Remove OS/editor debris" -ForegroundColor Cyan
$debris = Get-ChildItem -Path $RepoRoot -Recurse -File -Include '.DS_Store','Thumbs.db','*.orig','*.rej','*.tmp','*.bak' -ErrorAction SilentlyContinue
foreach ($f in $debris) { Remove-PathSafe $f.FullName }

Write-Host "Cleanup complete." -ForegroundColor Green
