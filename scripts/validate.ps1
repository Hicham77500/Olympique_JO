<#
  Validation script for Olympique_JO repository cleanliness
  - Lists package.json files, node_modules directories, and .env files
  - Warns about unexpected locations outside src/api and src/webapp
#>

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot   = Split-Path -Parent $ScriptRoot

$allowedPkgDirs = @(
  (Join-Path $RepoRoot 'src\api'),
  (Join-Path $RepoRoot 'src\webapp')
)
$allowedNodeModules = @(
  (Join-Path $RepoRoot 'src\api\node_modules'),
  (Join-Path $RepoRoot 'src\webapp\node_modules')
)
$allowedEnvDirs = $allowedPkgDirs

Write-Host "Validating repository at: $RepoRoot" -ForegroundColor Cyan

# package.json
$pkgs = Get-ChildItem -Path $RepoRoot -Recurse -File -Filter 'package.json' -ErrorAction SilentlyContinue
Write-Host "package.json files:" -ForegroundColor Yellow
$pkgs | ForEach-Object { Write-Host " - $($_.FullName)" }
$unexpectedPkgs = $pkgs | Where-Object { $dir = Split-Path -Parent $_.FullName; -not ($allowedPkgDirs | ForEach-Object { $dir -like ("$_*") } | Where-Object { $_ } ) }
if ($unexpectedPkgs) { Write-Warning "Unexpected package.json files found:"; $unexpectedPkgs | ForEach-Object { Write-Host "   * $($_.FullName)" -ForegroundColor Red } } else { Write-Host "OK: package.json only in src/api and src/webapp" -ForegroundColor Green }

# node_modules
$nodeMods = Get-ChildItem -Path $RepoRoot -Recurse -Directory -Filter 'node_modules' -ErrorAction SilentlyContinue
Write-Host "node_modules directories:" -ForegroundColor Yellow
$nodeMods | ForEach-Object { Write-Host " - $($_.FullName)" }
$unexpectedNodeMods = @()
foreach ($nm in $nodeMods) {
  $full = $nm.FullName.TrimEnd('\\')
  $isUnderAllowed = $false
  foreach ($allow in $allowedNodeModules) {
    if ($full -like ("$allow*")) { $isUnderAllowed = $true; break }
  }
  if (-not $isUnderAllowed) { $unexpectedNodeMods += $nm }
}
if ($unexpectedNodeMods) { Write-Warning "Unexpected node_modules directories found:"; $unexpectedNodeMods | ForEach-Object { Write-Host "   * $($_.FullName)" -ForegroundColor Red } } else { Write-Host "OK: node_modules only in src/api and src/webapp" -ForegroundColor Green }

# .env files
$envs = Get-ChildItem -Path $RepoRoot -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^\.env(\..*)?$' }
Write-Host ".env files:" -ForegroundColor Yellow
$envs | ForEach-Object { Write-Host " - $($_.FullName)" }
$unexpectedEnvs = $envs | Where-Object { $dir = Split-Path -Parent $_.FullName; -not ($allowedEnvDirs | ForEach-Object { $dir -like ("$_*") } | Where-Object { $_ } ) }
if ($unexpectedEnvs) { Write-Warning "Unexpected .env files found:"; $unexpectedEnvs | ForEach-Object { Write-Host "   * $($_.FullName)" -ForegroundColor Red } } else { Write-Host "OK: .env only in src/api or src/webapp (or none present)" -ForegroundColor Green }

# Build dir
$webappBuild = Join-Path $RepoRoot 'src\webapp\build'
if (Test-Path $webappBuild) { Write-Warning "webapp build directory exists (optional to remove for dev): $webappBuild" } else { Write-Host "OK: no webapp build directory" -ForegroundColor Green }

Write-Host "Validation complete." -ForegroundColor Cyan
