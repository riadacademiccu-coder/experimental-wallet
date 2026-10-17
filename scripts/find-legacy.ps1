# Step 77: non-destructive inventory of Supabase leftovers.
# Prints file NAMES ONLY. It does not read .env files, print source lines,
# modify files, remove packages, or change databases.
$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot ".." )).Path
$srcRoot = Join-Path $projectRoot "src"
$appRoot = Join-Path $srcRoot "app"

if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
  throw "Run this script from the extracted project copy, or place it under experimental-wallet/scripts."
}

function Relative-Path([string] $path) {
  return $path.Substring($projectRoot.Length).TrimStart([char[]]@('\', '/')).Replace('\', '/')
}

Write-Host ""
Write-Host "== Supabase references in active source files ==" -ForegroundColor Cyan
$pattern = '(?i)(@/lib/supabase|@supabase/|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|supabase\.auth|supabase\.from|createServerClient|createBrowserClient)'
$codeFiles = @(Get-ChildItem -Path $srcRoot -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Extension -in @('.ts', '.tsx', '.js', '.jsx') })
$matches = @($codeFiles | Where-Object {
  Select-String -LiteralPath $_.FullName -Pattern $pattern -Quiet -ErrorAction SilentlyContinue
})
if ($matches.Count -eq 0) { Write-Host "None" }
else { $matches | ForEach-Object { Write-Host (Relative-Path $_.FullName) } }

Write-Host ""
Write-Host "== Existing API routes outside the new Firebase groups ==" -ForegroundColor Cyan
$apiRoot = Join-Path $appRoot "api"
if (Test-Path $apiRoot) {
  $apiFiles = @(Get-ChildItem -Path $apiRoot -Recurse -File |
    Where-Object { $_.Name -in @('route.ts', 'route.tsx', 'route.js', 'route.jsx') })
  $otherRoutes = @($apiFiles | Where-Object {
    $relative = (Relative-Path $_.FullName)
    ($relative -notmatch '^src/app/api/(firebase/|firebase-admin/|firebase-admin-test/|auth/(session|register|logout)/)')
  })
  if ($otherRoutes.Count -eq 0) { Write-Host "None" }
  else { $otherRoutes | ForEach-Object { Write-Host (Relative-Path $_.FullName) } }
} else { Write-Host "None" }

Write-Host ""
Write-Host "== App request middleware / proxy ==" -ForegroundColor Cyan
@('src/middleware.ts', 'src/middleware.js', 'src/proxy.ts', 'src/proxy.js') | ForEach-Object {
  if (Test-Path (Join-Path $projectRoot $_)) { Write-Host $_ }
}

Write-Host ""
Write-Host "== Done. Review file names before deleting any old code. ==" -ForegroundColor Green
Write-Host "No files were deleted or modified by this inventory script."
