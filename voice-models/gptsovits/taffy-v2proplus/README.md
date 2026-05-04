# Taffy GPT-SoVITS Voice Bundle

This bundle contains the trained local GPT-SoVITS v2ProPlus voice weights used by Taffy Agent.

## Files

- `GPT_weights_v2ProPlus/Taffy-e15.ckpt`：GPT text-to-semantic weights, epoch 15.
- `SoVITS_weights_v2ProPlus/Taffy_e8_s608.pth`：SoVITS acoustic weights, epoch 8 / step 608.
- `reference_audio/taffy_prompt.wav`：short prompt audio for GPT-SoVITS inference.
- `prompt.txt`：prompt transcript used with the reference audio.
- `taffy_tts_infer.yaml`：runtime config copied into `GPT_SoVITS/configs/`.
- `checksums.sha256`：integrity checksums for the binary bundle.

## Usage

Install or clone GPT-SoVITS into `voice-workspace/GPT-SoVITS`, then start the API from the repository root:

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/start-gptsovits-api.ps1 -Background
```

The start script copies this bundle into the GPT-SoVITS working tree if the target files are missing or stale.

Use these Taffy Agent settings:

```env
TAFFY_TTS_ENABLED=true
TAFFY_TTS_PROVIDER=gpt-sovits
TAFFY_TTS_ENDPOINT=http://127.0.0.1:9880/tts
TAFFY_TTS_REF_AUDIO=reference_audio/taffy_prompt.wav
TAFFY_TTS_PROMPT_TEXT=下播了喵。拜拜喵。
TAFFY_TTS_SPEED=1.04
```

## Disclosure

This is a fan research voice model trained from user-provided local audio/text alignment data. It is provided to make the demo easier to run, but it is not an official voice asset. Only use and redistribute it where you have the necessary rights and consent.
