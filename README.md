# Taffy Agent

[English](README.en.md)

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

Taffy Agent 是一个面向 **Computer Use** 的图形化 Agent 终端。它把浏览器观察、Codex 编程任务、Shell/File 操作、DeepSeek 推理、确认审批、任务时间线和语音反馈整合到一个可悬浮的角色化 UI 中。

项目主卖点不是桌面宠物本身。塔菲的形象承担的是 **任务终端外壳、状态指示器、输入入口、审批入口和反馈层**：平时轻量悬浮，需要工作时展开完整控制台，适合承载类似 Hermes / OpenClaw 这类多工具 Agent 工作流。

> 粉丝自用与研究项目，非官方项目，非商业用途。仓库包含用户提供数据训练得到的 GPT-SoVITS 推理权重和一段短参考提示音频，用于开箱演示；不包含官方 Live2D、拆包贴图、原始训练集或商业素材。

![Taffy Agent 状态演示](docs/assets/gifs/taffy-state-reel.gif)

## 核心卖点

- **图形化 Agent 终端**：用可视化状态、任务时间线、日志、审批卡片和设置面板管理 Agent 工作。
- **Computer Use 工作流入口**：面向浏览器、Codex、Shell、文件系统等实际电脑操作场景。
- **Codex 高度适配**：不接管 Codex 账号和 API，只调用本机 `codex` CLI，把任务交给 Codex 执行。
- **浏览器任务能力**：支持打开/搜索页面、读取页面文本、提取链接/按钮/表单、截图、识别登录状态；登录和验证流程保留用户接管。
- **风险确认机制**：Shell、文件、Codex、浏览器等高影响动作经过策略层判断和确认。
- **DeepSeek 官方 API**：默认/高级模型可配置，支持 Mock 模式便于演示和开发。
- **角色化交互层**：塔菲负责输入、提示、语音、气泡和动作状态，让复杂任务有更自然的反馈。
- **可生成的美术管线**：通过参考图、生图、抠图、帧对齐和 GIF 导出生成完整状态动画，避免依赖官方拆包素材。

## 能做什么

| 能力 | 当前状态 | 说明 |
| --- | --- | --- |
| LLM 推理 | 已实现 | DeepSeek provider + Mock provider，可切换默认/高级模型名 |
| Codex 任务 | 已实现 | 检测 `codex --version`，构造 handoff，调用 `codex exec` |
| 浏览器观察 | 已实现 | 打开/搜索、读取文本、链接、按钮、表单、截图、登录状态提示 |
| Shell 命令 | 已实现 | 通过策略层确认后执行 PowerShell |
| 文件操作 | 已实现 | 工作区文件读写桥接 |
| 任务时间线 | 已实现 | 记录计划、执行、工具调用和结果 |
| 审批卡片 | 已实现 | 高风险动作需要确认 |
| 悬浮输入 | 已实现 | 可在角色界面直接发起任务 |
| 语音反馈 | 已实现 | 支持本地 GPT-SoVITS、系统语音、HTTP TTS；内置分句、缓存、音量和语速控制 |
| 状态动画 | 已实现 | 12 组生成式像素动画状态 |
| 浏览器点击/输入自动化 | 规划中 | 当前以观察、打开、截图、用户接管为主 |
| 长程自主任务 | 规划中 | 需要更强的权限、记忆、审计和恢复机制 |

## 演示

![全部状态演示](docs/assets/gifs/taffy-all-states-grid.gif)

<details>
<summary>查看单独状态 GIF</summary>

| 状态 | 预览 | 触发场景 |
| --- | --- | --- |
| 待机 | <img src="docs/assets/gifs/cards/idle-card.gif" width="180" alt="idle"> | 空闲等待 |
| 思考 | <img src="docs/assets/gifs/cards/thinking-card.gif" width="180" alt="thinking"> | 规划、等待工具返回 |
| 问候 | <img src="docs/assets/gifs/cards/greeting-card.gif" width="180" alt="greeting"> | 唤醒、点击、短交互 |
| 完成 | <img src="docs/assets/gifs/cards/success-card.gif" width="180" alt="success"> | 任务完成、测试通过 |
| 出错 | <img src="docs/assets/gifs/cards/error-card.gif" width="180" alt="error"> | 命令失败、需要介入 |
| 休眠 | <img src="docs/assets/gifs/cards/sleep-card.gif" width="180" alt="sleep"> | 长时间空闲 |
| 执行 | <img src="docs/assets/gifs/cards/typing-card.gif" width="180" alt="typing"> | 写代码、运行命令、调用 Codex |
| 拖动 | <img src="docs/assets/gifs/cards/dragged-card.gif" width="180" alt="dragged"> | 移动悬浮终端 |
| 倾听 | <img src="docs/assets/gifs/cards/listening-card.gif" width="180" alt="listening"> | 等待用户输入 |
| 浏览器 | <img src="docs/assets/gifs/cards/browser-card.gif" width="180" alt="browser"> | 浏览器观察和搜索 |
| 等确认 | <img src="docs/assets/gifs/cards/approval_wait-card.gif" width="180" alt="approval wait"> | 高风险动作审批 |
| 庆祝 | <img src="docs/assets/gifs/cards/dance-card.gif" width="180" alt="dance"> | 任务阶段完成 |

</details>

## 交互形态

- 默认是透明、无边框、置顶的悬浮角色终端。
- 悬浮态可以直接输入任务，不需要先打开传统聊天窗口。
- 简短反馈显示为气泡，默认 10 秒消失，可关闭或固定。
- 长文本、日志、设置、审批和任务详情进入完整工作台。
- 点击和拖动角色可移动窗口，拖动时有对应状态动画。
- 语音可调节音量和语速，TTS 会过滤括号动作，避免把舞台动作读出来。

## Agent 架构

```text
Renderer / React
  悬浮角色终端
  输入气泡
  任务工作台
  设置、日志、审批、时间线
  语音播放

Electron Main
  AgentService
  Policy Gate
  DeepSeek / Mock LLM
  CodexBridge
  BrowserBridge
  ShellBridge
  FileBridge
  SpriteStudioService

Shared
  类型契约
  Persona Prompt
  Sprite Manifest
  测试
```

关键文件：

- `src/main/services/agentService.ts`：Agent 编排。
- `src/main/services/tools/codexBridge.ts`：本机 Codex CLI 调用。
- `src/main/services/tools/browserBridge.ts`：浏览器观察桥。
- `src/main/services/policy.ts`：风险判断和审批策略。
- `src/main/services/spriteStudioService.ts`：角色状态素材生成与处理服务。
- `src/renderer/App.tsx`：悬浮终端和工作台主界面。
- `src/renderer/components/PetAvatar.tsx`：角色状态动画渲染。
- `src/renderer/voice.ts`：语音播放和 TTS 文本清洗。
- `src/shared/taffyPersona.ts`：塔菲人格提示词和输出净化。

## 快速开始

环境：

- Windows 10/11
- Node.js 20+
- Git LFS（用于拉取内置语音权重）
- 可选：已登录的 Codex CLI
- 可选：DeepSeek 官方 API Key

```powershell
git lfs install
git lfs pull
npm install
Copy-Item .env.example .env
npm run dev
```

本地发布包：

```powershell
npm run package
.\release\win-unpacked\"Taffy Agent.exe"
```

验证：

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## 本地塔菲音色

仓库内置了训练好的 GPT-SoVITS v2ProPlus 推理包，位于 `voice-models/gptsovits/taffy-v2proplus/`，大文件通过 Git LFS 管理：

- `GPT_weights_v2ProPlus/Taffy-e15.ckpt`
- `SoVITS_weights_v2ProPlus/Taffy_e8_s608.pth`
- `reference_audio/taffy_prompt.wav`
- `taffy_tts_infer.yaml`

先安装或克隆 GPT-SoVITS 到 `voice-workspace/GPT-SoVITS`，然后从本仓库根目录启动：

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/start-gptsovits-api.ps1 -Background
```

启动脚本会把内置权重、参考音频和推理配置自动同步到 GPT-SoVITS 工作目录。只想先同步模型而不启动 API 时，可以运行：

```powershell
pwsh -ExecutionPolicy Bypass -File scripts/start-gptsovits-api.ps1 -SyncOnly
```

复制 `.env.example` 后，把 `TAFFY_TTS_ENABLED=true` 即可使用本地塔菲音色：

```env
TAFFY_TTS_PROVIDER=gpt-sovits
TAFFY_TTS_ENDPOINT=http://127.0.0.1:9880/tts
TAFFY_TTS_REF_AUDIO=reference_audio/taffy_prompt.wav
TAFFY_TTS_PROMPT_TEXT=下播了喵。拜拜喵。
TAFFY_TTS_SPEED=1.04
```

## 配置

复制 `.env.example` 为 `.env`：

```env
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=
TAFFY_DEFAULT_MODEL=deepseek-v4-flash
TAFFY_ADVANCED_MODEL=deepseek-v4-pro
TAFFY_USE_MOCK_LLM=true
TAFFY_TTS_ENABLED=false
TAFFY_TTS_PROVIDER=gpt-sovits
TAFFY_TTS_ENDPOINT=http://127.0.0.1:9880/tts
TAFFY_TTS_VOLUME=0.78
TAFFY_TTS_REALTIME=true
TAFFY_TTS_REF_AUDIO=reference_audio/taffy_prompt.wav
TAFFY_TTS_PROMPT_TEXT=下播了喵。拜拜喵。
TAFFY_TTS_SPEED=1.04
```

说明：

- `.env` 不会提交到 Git。
- 发布包会读取当前目录或 exe 同目录的 `.env`；也可以用 `TAFFY_ENV_PATH` 指定配置文件。
- `TAFFY_USE_MOCK_LLM=true` 时不会消耗 DeepSeek。
- 使用真实 DeepSeek 时，把 `TAFFY_USE_MOCK_LLM=false` 并填写 `DEEPSEEK_API_KEY`。
- Codex 的账号、模型、API 配置继续由 Codex CLI 自己管理，Taffy 只调用本机命令。
- 本地塔菲音色使用 GPT-SoVITS，推理权重随仓库通过 Git LFS 提供；原始训练数据不提交。

## 美术生成与权利说明

本仓库不包含官方 Live2D、拆包贴图、直播切片训练集或商业素材。当前像素状态动画是用于验证交互和素材管线的粉丝生成式样例；`voice-models/` 中的语音推理包是用户提供数据训练得到的粉丝研究模型。

生成方式：

1. 开发时本地使用用户提供的角色参考图，原始参考图不提交。
2. 使用 Codex/OpenAI 生图能力生成新的像素风状态图。
3. 用 `scripts/process-gpt-sprite-sheet.mjs` 做抠图、绿边清理、透明背景、256x256 帧归一、sprite sheet 导出和 QA 报告。
4. 用 `scripts/export-promo-gifs.py` 导出 README 演示 GIF。
5. 提示词、schema、质量规则和素材契约位于 `docs/sprite-studio/`、`docs/14-character-sprite-studio.md`、`docs/15-sprite-generation-pipeline.md`、`docs/16-sprite-asset-contracts.md`。

如果你把项目改成其他角色，请使用自己有权使用的参考图和声音数据，重新生成素材，并在发布前独立审查授权。

## 安全边界

- 本项目不是安全沙箱。
- 登录、验证码、付款、账号管理等流程应由用户亲自接管。
- Shell、文件、Codex、浏览器等能力必须经过策略层和用户确认。
- 不要把未知来源的提示词当成可信代码执行。

## 路线图

- 浏览器点击、输入、表单填写和页面验证闭环。
- 更完整的 Computer Use action schema。
- 更强的任务恢复、审计日志、权限分级和回滚。
- 本地语音模型导入器和多 TTS provider 适配。
- Windows 安装包签名和自动发布。
- 更多角色状态、行为链和环境感知反馈。

## License

代码以 MIT License 发布。角色名、角色形象、生成式演示素材和语音模型可能具有独立权利边界。

本项目是粉丝研究项目，不是官方产品。
