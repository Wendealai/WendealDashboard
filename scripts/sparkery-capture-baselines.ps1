$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$baselineDir = Join-Path $repoRoot 'docs\sparkery\visual-baseline'
$edgeCandidates = @(
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)
$edgePath = $edgeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $edgePath) {
  throw 'Microsoft Edge not found. Install Edge or adjust script path.'
}

New-Item -ItemType Directory -Path $baselineDir -Force | Out-Null
$captureSucceeded = $false

$previewLog = Join-Path $baselineDir 'baseline-preview.log'
$previewErrLog = Join-Path $baselineDir 'baseline-preview.err.log'
$preview = Start-Process `
  -FilePath 'cmd.exe' `
  -ArgumentList '/c npm run preview:sparkery -- --host 127.0.0.1 --port 5174' `
  -WorkingDirectory $repoRoot `
  -PassThru `
  -RedirectStandardOutput $previewLog `
  -RedirectStandardError $previewErrLog `
  -WindowStyle Hidden

try {
  $healthUrl = 'http://127.0.0.1:5174/'
  $ready = $false
  for ($i = 0; $i -lt 180; $i++) {
    try {
      Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2 | Out-Null
      $ready = $true
      break
    } catch {
      if ($preview.HasExited) {
        break
      }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $ready) {
    $previewOutput = ''
    if (Test-Path $previewLog) {
      $previewOutput += Get-Content $previewLog -Raw
    }
    if (Test-Path $previewErrLog) {
      $previewOutput += "`n" + (Get-Content $previewErrLog -Raw)
    }
    throw "Sparkery preview server did not become ready on http://127.0.0.1:5174`n$previewOutput"
  }

  $pages = @(
    @{ name = 'bond-quote-en'; path = '/bond-clean-quote' },
    @{ name = 'bond-quote-cn'; path = '/bond-clean-quote-cn' },
    @{ name = 'inspection-public'; path = '/cleaning-inspection' },
    @{ name = 'dispatch-location-report'; path = '/dispatch-location-report' },
    @{ name = 'dispatch-week-plan'; path = '/dispatch-week-plan' },
    @{ name = 'dispatch-employee-tasks'; path = '/dispatch-employee-tasks' }
  )

  $viewports = @(
    @{ suffix = 'desktop'; size = '1440,1024' },
    @{ suffix = 'mobile'; size = '390,844' }
  )

  foreach ($page in $pages) {
    foreach ($viewport in $viewports) {
      $url = "http://127.0.0.1:5174$($page.path)"
      $target = Join-Path $baselineDir "$($page.name)-$($viewport.suffix).png"
      & $edgePath `
        --headless=new `
        --disable-gpu `
        --hide-scrollbars `
        --run-all-compositor-stages-before-draw `
        --virtual-time-budget=4000 `
        "--window-size=$($viewport.size)" `
        "--screenshot=$target" `
        $url | Out-Null
      Write-Host "Captured $target"
    }
  }
  $captureSucceeded = $true
} finally {
  if ($preview -and -not $preview.HasExited) {
    Stop-Process -Id $preview.Id -Force -ErrorAction SilentlyContinue
  }
  if ($captureSucceeded) {
    if (Test-Path $previewLog) {
      Remove-Item $previewLog -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $previewErrLog) {
      Remove-Item $previewErrLog -Force -ErrorAction SilentlyContinue
    }
  }
}
