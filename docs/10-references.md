# 参考资料

## 已确认方向

| 类别 | 参考 |
| --- | --- |
| 桌面 Live2D/VTuber 框架 | [Open-LLM-VTuber](https://github.com/Open-LLM-VTuber/Open-LLM-VTuber) |
| 本地 TTS | [GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) |
| DeepSeek 官方 API 价格 | [Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing) |
| DeepSeek API FAQ | [FAQ](https://api-docs.deepseek.com/faq) |
| 塔菲提示词/占位素材 | [ly-xxx/ace-taffy-skill](https://github.com/ly-xxx/ace-taffy-skill) |
| 塔菲语音在线候选 | [Fish Audio Taffy Voice](https://fish.audio/m/31e9f0e18ca445a8b8c0535a07624403/) |
| GPT-SoVITS 塔菲模型候选 | [配音工坊页面](https://peiyin.me/454/.html) |
| 塔菲音频片段候选 | [TerayTech/EdgeTX_iNAV_SoundPack](https://github.com/TerayTech/EdgeTX_iNAV_SoundPack) |
| 塔菲表情素材候选 | [jdfcc/argon-tafei-emotions-1.0](https://github.com/jdfcc/argon-tafei-emotions-1.0) |

## 设计结论

- Open-LLM-VTuber 适合作为 Live2D/VTuber/TTS 方向参考，但 Taffy Agent 的完整版更偏“桌面操作 Agent”，因此主工程建议独立实现。
- GPT-SoVITS 适合作为本地 TTS 后端。
- DeepSeek 官方 API 适合作为 Taffy Agent 的默认 LLM。
- Codex 作为外部专业编程工具接入，不把认证和账号并入 Taffy。
- 浏览器自动化优先 Playwright，登录和验证采用人类接管。

## 后续待确认

- 可用的标准 Live2D 塔菲模型包格式。
- 是否使用 Bongo Cat/Taffy 桌宠模型作为中期资产。
- 塔菲语音模型的授权和质量。
- Codex CLI 当前版本的具体非交互命令能力。
- 是否需要接入 OpenClaw 作为 reviewer/router，还是只借鉴其架构模式。

