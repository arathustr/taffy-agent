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
![Platform](https://img.shields.io/badge/platform-Windows-0078D4?logo=windows&logoColor=white)

Taffy Agent is a graphical agent terminal for computer-use workflows. It brings browser observation, Codex coding tasks, shell/file operations, DeepSeek reasoning, approvals, task timelines, and voice feedback into a floating character-driven interface.

The character layer is not the product's main point. It is the visual shell, status indicator, input surface, approval surface, and feedback layer for a serious multi-tool agent terminal inspired by workflows seen in systems such as Hermes or OpenClaw.

This is a fan-made, non-commercial research project. It is not an official product and does not bundle official Live2D models, extracted textures, recordings, or commercial assets.

![Taffy Agent state reel](docs/assets/gifs/taffy-state-reel.gif)

## Why It Exists

- A graphical terminal for computer-use agents.
- A Codex-ready handoff surface for coding tasks.
- A browser-aware interface for opening, searching, reading, screenshotting, and user-supervised login flows.
- A guarded tool system for shell and file operations.
- A lightweight character UI that keeps status, input, speech, and approvals visible without forcing a full chat window.
- A documented generative sprite pipeline so visual assets can be regenerated from authorized references.

## Current Capabilities

| Capability | Status | Notes |
| --- | --- | --- |
| LLM reasoning | Implemented | DeepSeek provider and mock provider |
| Codex tasks | Implemented | Local `codex exec` handoff |
| Browser observation | Implemented | Open/search/read/screenshot/link/button/form extraction |
| Shell commands | Implemented | PowerShell through policy approval |
| File operations | Implemented | Workspace file bridge |
| Task timeline | Implemented | Plans, tool calls, logs, results |
| Approval cards | Implemented | Confirmation for high-impact actions |
| Floating input | Implemented | Submit tasks from the character surface |
| Voice feedback | Implemented | System/HTTP/Taffy-style TTS endpoint options |
| Animated states | Implemented | 12 generated pixel-art states |
| Browser click/type automation | Planned | Current version focuses on observation and user takeover |
| Long-running autonomy | Planned | Needs stronger permissions, memory, audit, and recovery |

## Demo

![All states](docs/assets/gifs/taffy-all-states-grid.gif)

## Quick Start

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Production-style package:

```powershell
npm run package
.\release\win-unpacked\"Taffy Agent.exe"
```

Validation:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Configuration

```env
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=
TAFFY_DEFAULT_MODEL=deepseek-v4-flash
TAFFY_ADVANCED_MODEL=deepseek-v4-pro
TAFFY_USE_MOCK_LLM=true
TAFFY_TTS_ENDPOINT=https://xzjosh-taffy1-2-bert-vits2.ms.show
TAFFY_TTS_VOLUME=0.78
```

`.env` is ignored by Git. Codex credentials and model settings remain owned by the local Codex CLI; Taffy only invokes the local command.

## Artwork Disclosure

The included pixel-art state pack is a fan-made generated sample. A local user-provided reference was used during development, but the original reference image is not committed. New pixel-art sprite sheets were generated, then cleaned and normalized with local scripts. The repository does not include official models, extracted textures, recordings, or commercial assets.

For another character, bring authorized reference art and voice data, regenerate the sprite pack, and review the resulting assets before distribution.

## License

Source code is MIT licensed. Character names, likeness rights, generated demo art, and voice models may have separate rights.
