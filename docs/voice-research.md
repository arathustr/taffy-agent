# Taffy Voice Route

## Findings

- ModelScope has Taffy-specific Bert-VITS2 studios: `xzjosh/Taffy-Bert-VITS2` and `xzjosh/Taffy1.2-Bert-VITS2`. The latter exposes a working independent Gradio URL: `https://xzjosh-taffy1-2-bert-vits2.ms.show`.
- The older Hugging Face Space slugs currently return 401/404, so the app should not default to `hf.space` for Taffy voice.
- ModelScope still has `xzjosh/Bert-VITS2`, but the public metadata currently names it "Bert-VITS2在线一键语音生成合集（停止分享）"; use the Taffy-specific studios instead.
- I did not find a reliable GitHub repository that directly ships a full Yongchu Taffy voice model package. GitHub search mostly returns general inference/training frameworks, not a Taffy model with clear assets and license.
- The most practical route is to support a Taffy Bert-VITS2/Gradio endpoint first, then keep GPT-SoVITS/Fish Audio endpoints as local high-quality options if the user has a usable model.

## Integrated Providers

- `taffy-bert-vits2`: calls a Gradio-style endpoint, defaulting to `https://xzjosh-taffy1-2-bert-vits2.ms.show`.
- `gpt-sovits`: calls a local OpenAI-style or GPT-SoVITS-compatible TTS endpoint.
- `fish-audio`: same endpoint contract for now, reserved for hosted/local Fish Audio adapters.
- `system`: OS speech synthesis fallback only.

## App Behavior

- Parenthetical stage directions are stripped before TTS, including Chinese and ASCII parentheses.
- Hosted Spaces can sleep, stop sharing, or rate-limit. When the Taffy endpoint fails, the app stays silent instead of playing an obviously wrong system voice.
- The pet UI should describe this as fan-made AI voice synthesis, not official voice output.
