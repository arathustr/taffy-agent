param(
  [ValidateSet("CU126", "CU128", "CPU")]
  [string]$Device = "CU128",

  [ValidateSet("HF", "HF-Mirror", "ModelScope")]
  [string]$Source = "ModelScope"
)

$ErrorActionPreference = "Stop"
$repo = Resolve-Path "voice-workspace/GPT-SoVITS"

if (-not (Get-Command conda -ErrorAction SilentlyContinue)) {
  throw "conda was not found. Install Miniforge/Miniconda, then run: conda create -n GPTSoVits python=3.10"
}

Push-Location $repo
try {
  pwsh -ExecutionPolicy Bypass -File ./install.ps1 -Device $Device -Source $Source
} finally {
  Pop-Location
}
