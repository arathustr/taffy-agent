# Taffy Agent

[中文](README.md)

[![CI](https://github.com/arathustr/taffy-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/arathustr/taffy-agent/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Electron](https://img.shields.io/badge/Electron-33-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![DeepSeek](https://img.shields.io/badge/LLM-DeepSeek-4D6BFF)
![Codex](https://img.shields.io/badge/Codex-ready-111111)
![Computer Use](https://img.shields.io/badge/Computer%20Use-Agent%20Terminal-111111)
![Git LFS](https://img.shields.io/badge/Git%20LFS-voice%20bundle-F64935)
![Platform](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows&logoColor=white)

Taffy Agent is a graphical agent terminal for **computer-use** workflows. It combines browser observation, Codex coding handoff, shell/file operations, DeepSeek reasoning, approval gates, task timelines, and local voice feedback inside a floating character-driven UI.

It is not a reskinned chat window and not just a desktop pet. The character layer is the **task entry point, status indicator, approval surface, voice feedback layer, and workbench shell** for a local multi-tool agent terminal inspired by systems such as Hermes and OpenClaw.

> Fan-made, non-commercial research project. This is not an official product. The repository includes user-trained GPT-SoVITS inference weights and a short prompt reference audio for local demos; it does not include official Live2D models, extracted textures, raw training datasets, or commercial assets.

![Taffy Agent state reel](docs/assets/gifs/taffy-state-reel.gif)

## Voice Sample

This sample was synthesized with the bundled local GPT-SoVITS v2ProPlus Taffy voice. Transcript: "嗯，雏草姬，塔菲在这里喵。浏览器和 Codex 的任务，都可以交给塔菲先看一下。"

<audio controls src="docs/assets/audio/taffy-agent-voice-demo.wav"></audio>

If GitHub does not render the player, open [taffy-agent-voice-demo.wav](docs/assets/audio/taffy-agent-voice-demo.wav) directly.

## What It Does

Taffy Agent aims to make computer-use agents visible, local-first, and auditable. You can ask it to:

- open a browser page or search topic and summarize what it sees;
- hand a coding task to Codex in the current repository;
- inspect the workspace and explain the project structure;
- run a shell command after user approval;
- show task status, logs, approvals, and tool results instead of hiding them in a black box.

The character is not the core value by itself. It makes the agent legible: listening, thinking, executing, waiting for approval, succeeding, or failing are all reflected through animation, speech bubbles, voice, approval cards, and a task timeline.

## Capabilities

| Capability | Status | Notes |
| --- | --- | --- |
| Floating terminal UI | Implemented | Transparent, frameless, always-on-top, draggable, tray restore |
| Floating input | Implemented | Submit tasks next to the character |
| Workbench | Implemented | Settings, logs, approvals, task timeline |
| DeepSeek / Mock LLM | Implemented | API key stays in local `.env` |
| Codex handoff | Implemented | Calls local `codex exec` |
| Browser observation | Implemented | Open/search/read/screenshot/link/button/form extraction |
| Shell commands | Implemented | PowerShell behind approval gates |
| File inspection | Implemented | Workspace file bridge |
| Risk approvals | Implemented | High-impact actions require confirmation |
| Local Taffy voice | Implemented | GPT-SoVITS weights are bundled with Git LFS |
| Animated states | Implemented | 12 generated pixel-art state animations |
| Browser click/type automation | Planned | Current version focuses on observation and user takeover |
| Long-running autonomy | Planned | Needs stronger permissions, memory, audit, and recovery |

## Demo

![All states](docs/assets/gifs/taffy-all-states-grid.gif)

## Quick Start

Mock mode does not require a DeepSeek API key and does not spend API credits.

Requirements:

- Windows 10/11
- Node.js 20+
- Git LFS, for bundled voice weights

```powershell
git clone https://github.com/arathustr/taffy-agent.git
cd taffy-agent
git lfs install
git lfs pull
npm install
Copy-Item .env.example .env
npm run dev
```

Package locally:

```powershell
npm run package
& ".\release\win-unpacked\Taffy Agent.exe"
```

Validate:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Full Setup

### 1. Environment

```powershell
Copy-Item .env.example .env
```

The default example is demo-safe:

- `TAFFY_USE_MOCK_LLM=true`: no real LLM call.
- `TAFFY_TTS_ENABLED=false`: voice disabled until configured.
- Codex credentials are not configured inside Taffy.

### 2. DeepSeek

After creating a DeepSeek official API key:

```env
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=sk-...
TAFFY_USE_MOCK_LLM=false
TAFFY_DEFAULT_MODEL=deepseek-v4-flash
TAFFY_ADVANCED_MODEL=deepseek-v4-pro
```

Model names are examples and can be changed to the current names available in DeepSeek.

### 3. Codex

Taffy does not own Codex credentials. Configure the local Codex CLI first:

```powershell
codex --version
codex auth login
```

Then enable Codex permission in Taffy settings. Coding tasks show an approval card before Taffy calls `codex exec`.

### 4. Local Taffy Voice

The repository includes trained GPT-SoVITS v2ProPlus inference weights under `voice-models/gptsovits/taffy-v2proplus/`. Large files are stored via Git LFS:

- `GPT_weights_v2ProPlus/Taffy-e15.ckpt`
- `SoVITS_weights_v2ProPlus/Taffy_e8_s608.pth`
- `reference_audio/taffy_prompt.wav`
- `taffy_tts_infer.yaml`
- `checksums.sha256`

This repository does not include GPT-SoVITS itself or base pretrained models. Recommended path:

```text
voice-workspace/GPT-SoVITS/
```

Install:

```powershell
New-Item -ItemType Directory -Force voice-workspace
git clone https://github.com/RVC-Boss/GPT-SoVITS.git voice-workspace/GPT-SoVITS
conda create -n GPTSoVits python=3.10
conda activate GPTSoVits
pwsh -ExecutionPolicy Bypass -File scripts/install-gptsovits.ps1 -Device CU128 -Source ModelScope
```

Start the local API:

```powershell
conda activate GPTSoVits
pwsh -ExecutionPolicy Bypass -File scripts/start-gptsovits-api.ps1 -Background
```

The start script syncs the bundled voice weights, prompt audio, and inference config into the GPT-SoVITS working tree. Sync only:

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/start-gptsovits-api.ps1 -SyncOnly
```

Enable in `.env`:

```env
TAFFY_TTS_ENABLED=true
TAFFY_TTS_PROVIDER=gpt-sovits
TAFFY_TTS_ENDPOINT=http://127.0.0.1:9880/tts
TAFFY_TTS_REF_AUDIO=reference_audio/taffy_prompt.wav
TAFFY_TTS_PROMPT_TEXT=下播了喵。拜拜喵。
TAFFY_TTS_SPEED=1.04
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | DeepSeek API base URL |
| `DEEPSEEK_API_KEY` | empty | Local DeepSeek API key |
| `TAFFY_DEFAULT_MODEL` | `deepseek-v4-flash` | Default model name |
| `TAFFY_ADVANCED_MODEL` | `deepseek-v4-pro` | Advanced model name |
| `TAFFY_USE_MOCK_LLM` | `true` | Use mock provider |
| `TAFFY_TTS_ENABLED` | `false` | Enable voice |
| `TAFFY_TTS_PROVIDER` | `gpt-sovits` | Voice provider |
| `TAFFY_TTS_ENDPOINT` | `http://127.0.0.1:9880/tts` | GPT-SoVITS API endpoint |
| `TAFFY_TTS_VOLUME` | `0.78` | Playback volume |
| `TAFFY_TTS_REALTIME` | `true` | Split and queue speech chunks |
| `TAFFY_TTS_REF_AUDIO` | `reference_audio/taffy_prompt.wav` | GPT-SoVITS prompt audio |
| `TAFFY_TTS_PROMPT_TEXT` | `下播了喵。拜拜喵。` | Prompt transcript |
| `TAFFY_TTS_SPEED` | `1.04` | Speech speed |

`.env` is ignored by Git. Do not put API keys in README, issues, or logs.

## Codex And Browser Workflows

Codex flow:

```text
User goal -> Taffy router -> Codex handoff -> user approval -> codex exec -> timeline summary
```

Browser flow:

```text
Open/search -> read visible page -> extract structure -> screenshot/login-state hint -> user takeover when needed
```

Current browser support is observation-first. Click/type automation and full page-validation loops are planned.

## Project Layout

```text
src/
  main/services/              Agent orchestration, LLM, tools, policy, storage
  renderer/                   Floating terminal, workbench, avatar, voice playback
  shared/                     Type contracts and persona prompt
docs/                         Product, architecture, Codex, browser, voice, sprite docs
scripts/                      GPT-SoVITS, sprite processing, GIF export scripts
voice-models/                 Git LFS Taffy GPT-SoVITS inference bundle
```

Recommended docs:

- [docs/README.md](docs/README.md)
- [docs/04-agent-architecture.md](docs/04-agent-architecture.md)
- [docs/05-codex-integration.md](docs/05-codex-integration.md)
- [docs/06-browser-automation.md](docs/06-browser-automation.md)
- [docs/07-security-permissions.md](docs/07-security-permissions.md)
- [docs/17-local-realtime-voice.md](docs/17-local-realtime-voice.md)

## Asset Disclosure

The included pixel-art state pack is a fan-made generated sample. A local user-provided reference was used during development, but the original reference image is not committed. New pixel-art sprite sheets were generated, cleaned, normalized, and exported locally.

The repository does not include official Live2D models, extracted textures, raw voice training datasets, or commercial assets. The `voice-models/` bundle is a fan research inference model trained from user-provided data.

For another character, use authorized reference art and voice data, regenerate the sprite pack and voice bundle, and review rights before distribution.

## Safety

- This project is not a security sandbox.
- Login, captcha, payment, and account-management flows should be handled by the user.
- Shell, file, Codex, and browser actions should pass through policy and approval gates.
- Do not execute untrusted prompts as code.
- Voice weights and generated demo assets may have separate rights boundaries.

## Roadmap

- Browser click/type/form filling and page validation loops.
- More complete computer-use action schema.
- Stronger recovery, audit logs, permission tiers, and rollback.
- Local voice model importer and more TTS providers.
- Signed Windows installer and automated releases.
- More character states and behavior chains.

## License

Source code is MIT licensed. Character names, likeness rights, generated demo art, and voice models may have separate rights.

This is a fan research project, not an official product.
