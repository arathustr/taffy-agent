# 本地实时语音方案

Taffy Agent 的语音主线改为本地常驻 TTS 服务，不再依赖外部 Gradio/ModelScope 端点。

## 当前推荐

首选 GPT-SoVITS v2Pro/v2ProPlus：

- 当前数据约 91 分钟，581 条标注，933 个 wav。
- 本机 RTX 4060 Ti 16GB 足够做本地微调和推理。
- Taffy Agent 侧使用分句合成、队列播放、短句缓存，让首句尽快出声。

第二阶段验证 CosyVoice 2/3：

- 更接近真流式 TTS。
- 工程复杂度更高，适合作为 GPT-SoVITS 稳定后替换或并行 provider。

## 数据准备

原始训练数据放在本地 `vedio/`，该目录已被 `.gitignore` 忽略。

```powershell
npm run voice:prepare
```

输出目录：

```text
.taffy/voice/gptsovits/Taffy/
  audios/raw/
  taffy-gptsovits.list
  reference-candidates.list
  prepare-report.json
```

`reference-candidates.list` 会列出适合作为 zero-shot / prompt reference 的短音频。

## GPT-SoVITS 环境

本仓库不会提交 GPT-SoVITS 本体、训练音频或权重。推荐放在忽略目录：

```text
voice-workspace/GPT-SoVITS/
```

如果已经安装 conda：

```powershell
conda create -n GPTSoVits python=3.10
conda activate GPTSoVits
pwsh -ExecutionPolicy Bypass -File scripts/install-gptsovits.ps1 -Device CU128 -Source ModelScope
```

启动本地 API：

```powershell
conda activate GPTSoVits
pwsh -ExecutionPolicy Bypass -File scripts/start-gptsovits-api.ps1
```

API 地址为 `http://127.0.0.1:9880/tts`。

## App 接入

默认本地端点：

```env
TAFFY_TTS_PROVIDER=gpt-sovits
TAFFY_TTS_ENDPOINT=http://127.0.0.1:9880/tts
TAFFY_TTS_REALTIME=true
TAFFY_TTS_CHUNK_CHARS=52
TAFFY_TTS_CACHE=true
```

App 会把长回复按标点切成短句，第一句生成后立即播放，同时预取下一句。对于常用反馈短句，会走内存缓存，减少重复合成延迟。

## 训练后建议

如果 GPT-SoVITS 服务启动时已经加载了 Taffy 模型，可以在设置里把参考音频和参考文本留空。

如果仍使用 zero-shot/prompt 模式，在设置里填写：

- 参考音频路径
- 参考音频对应文本
- 语言：`zh`

## 安全

训练音频、权重、缓存、模型目录都不要提交到 Git。当前忽略项包括：

- `vedio/`
- `.taffy/`
- `voice-workspace/`
- `models/`
- `*.ckpt`
- `*.pth`
- `*.safetensors`
