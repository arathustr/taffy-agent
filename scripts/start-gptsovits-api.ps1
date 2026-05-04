param(
  [int]$Port = 9880,
  [string]$HostName = "127.0.0.1",
  [string]$Root = $env:TAFFY_GPTSOVITS_ROOT,
  [string]$Python = $env:TAFFY_GPTSOVITS_PYTHON,
  [string]$Config = $env:TAFFY_GPTSOVITS_CONFIG,
  [switch]$Background
)

$ErrorActionPreference = "Stop"

if (-not $Root) {
  if (Test-Path "C:\taffy-voice\GPT-SoVITS") {
    $Root = "C:\taffy-voice\GPT-SoVITS"
  } else {
    $Root = "voice-workspace/GPT-SoVITS"
  }
}

$repo = Resolve-Path $Root

if (-not $Python) {
  $localPython = "C:\taffy-voice\miniforge\envs\GPTSoVits\python.exe"
  $Python = if (Test-Path $localPython) { $localPython } else { "python" }
}

if (-not $Config) {
  $taffyConfig = Join-Path $repo "GPT_SoVITS/configs/taffy_tts_infer.yaml"
  $Config = if (Test-Path $taffyConfig) { "GPT_SoVITS/configs/taffy_tts_infer.yaml" } else { "GPT_SoVITS/configs/tts_infer.yaml" }
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
