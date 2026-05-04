param(
  [int]$Port = 9880,
  [string]$HostName = "127.0.0.1",
  [string]$Root = $env:TAFFY_GPTSOVITS_ROOT,
  [string]$Python = $env:TAFFY_GPTSOVITS_PYTHON,
  [string]$Config = $env:TAFFY_GPTSOVITS_CONFIG,
  [switch]$Background,
  [switch]$SyncOnly
)

$ErrorActionPreference = "Stop"

function Copy-IfMissingOrDifferentSize {
  param(
    [string]$Source,
    [string]$Destination
  )

  if (-not (Test-Path $Source)) {
    return $false
  }

  $sourceItem = Get-Item $Source
  $destinationItem = if (Test-Path $Destination) { Get-Item $Destination } else { $null }
  if ($destinationItem -and $destinationItem.Length -eq $sourceItem.Length) {
    return $false
  }

  $parent = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Force
  return $true
}

function Install-BundledTaffyVoiceModel {
  param(
    [string]$Repo,
    [string]$ProjectRoot
  )

  $bundle = Join-Path $ProjectRoot "voice-models/gptsovits/taffy-v2proplus"
  if (-not (Test-Path $bundle)) {
    return
  }

  $copied = $false
  $files = @(
    @{ Source = "GPT_weights_v2ProPlus/Taffy-e15.ckpt"; Destination = "GPT_weights_v2ProPlus/Taffy-e15.ckpt" },
    @{ Source = "SoVITS_weights_v2ProPlus/Taffy_e8_s608.pth"; Destination = "SoVITS_weights_v2ProPlus/Taffy_e8_s608.pth" },
    @{ Source = "reference_audio/taffy_prompt.wav"; Destination = "reference_audio/taffy_prompt.wav" },
    @{ Source = "taffy_tts_infer.yaml"; Destination = "GPT_SoVITS/configs/taffy_tts_infer.yaml" }
  )

  foreach ($file in $files) {
    $source = Join-Path $bundle $file.Source
    $destination = Join-Path $Repo $file.Destination
    $copied = (Copy-IfMissingOrDifferentSize -Source $source -Destination $destination) -or $copied
  }

  if ($copied) {
    Write-Output "Bundled Taffy GPT-SoVITS model synced into $Repo"
  }
}

if (-not $Root) {
  if (Test-Path "C:\taffy-voice\GPT-SoVITS") {
    $Root = "C:\taffy-voice\GPT-SoVITS"
  } else {
    $Root = "voice-workspace/GPT-SoVITS"
  }
}

$repo = Resolve-Path $Root
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Install-BundledTaffyVoiceModel -Repo $repo -ProjectRoot $projectRoot

if (-not $Python) {
  $localPython = "C:\taffy-voice\miniforge\envs\GPTSoVits\python.exe"
  $Python = if (Test-Path $localPython) { $localPython } else { "python" }
}

if (-not $Config) {
  $taffyConfig = Join-Path $repo "GPT_SoVITS/configs/taffy_tts_infer.yaml"
  $Config = if (Test-Path $taffyConfig) { "GPT_SoVITS/configs/taffy_tts_infer.yaml" } else { "GPT_SoVITS/configs/tts_infer.yaml" }
}

if ($SyncOnly) {
  Write-Output "GPT-SoVITS model sync completed for $repo"
  exit 0
}

$env:PIP_REQUIRE_VIRTUALENV = ""
$env:PYTHONIOENCODING = "utf-8"
$env:no_proxy = "localhost,127.0.0.1,::1"
$env:all_proxy = ""
$env:PYTHONPATH = "$repo;$repo\GPT_SoVITS;$repo\tools;$repo\GPT_SoVITS\BigVGAN"

if ($Python -like "*\envs\GPTSoVits\python.exe") {
  $envRoot = Split-Path -Parent $Python
  $env:PATH = "$envRoot;$envRoot\Scripts;$envRoot\Library\bin;$envRoot\Library\usr\bin;$envRoot\Library\mingw-w64\bin;$env:PATH"
}

$args = @("-s", "api_v2.py", "-a", $HostName, "-p", "$Port", "-c", $Config)

Push-Location $repo
try {
  if ($Background) {
    $logRoot = Split-Path -Parent $repo
    $outLog = Join-Path $logRoot "gptsovits-api.out.log"
    $errLog = Join-Path $logRoot "gptsovits-api.err.log"
    $process = Start-Process -FilePath $Python -ArgumentList $args -WorkingDirectory $repo -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
    Write-Output "GPT-SoVITS API started on http://$HostName`:$Port (pid $($process.Id))"
    Write-Output "stdout: $outLog"
    Write-Output "stderr: $errLog"
  } else {
    & $Python @args
  }
} finally {
  Pop-Location
}
