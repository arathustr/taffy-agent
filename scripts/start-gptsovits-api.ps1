param(
  [int]$Port = 9880,
  [string]$HostName = "127.0.0.1",
  [string]$Config = "GPT_SoVITS/configs/tts_infer.yaml"
)

$ErrorActionPreference = "Stop"
$repo = Resolve-Path "voice-workspace/GPT-SoVITS"

Push-Location $repo
try {
  python api_v2.py -a $HostName -p $Port -c $Config
} finally {
  Pop-Location
}
