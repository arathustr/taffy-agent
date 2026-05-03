# Taffy Agent 设计文档总览

这组文档用于在正式编码前统一产品目标、交互质感、Agent 能力、Codex 联动、浏览器自动化、安全边界和阶段验收标准。目标不是做一个普通聊天桌宠，而是做一个以塔菲形象呈现的本地操作型 Agent 终端。

## 阅读顺序

| 文档 | 用途 |
| --- | --- |
| [01-product-spec.md](01-product-spec.md) | 产品定位、用户价值、范围、非目标、完整版能力 |
| [02-ui-motion-design.md](02-ui-motion-design.md) | 桌宠 UI、动态状态、Live2D/动画、任务可视化 |
| [03-persona-interaction.md](03-persona-interaction.md) | 角色语言、对话风格、语音情绪、拟真交互 |
| [04-agent-architecture.md](04-agent-architecture.md) | Agent 核心架构、计划-执行-复盘循环、状态与可观测性 |
| [05-codex-integration.md](05-codex-integration.md) | Codex 联动边界、启动/派发/监控/总结流程 |
| [06-browser-automation.md](06-browser-automation.md) | 浏览器操作、登录/验证、人类接管、会话策略 |
| [07-security-permissions.md](07-security-permissions.md) | 权限分级、密钥、确认门、危险动作防护 |
| [08-llm-voice-memory.md](08-llm-voice-memory.md) | DeepSeek、TTS、记忆、人格提示词与音频方案 |
| [09-roadmap-acceptance.md](09-roadmap-acceptance.md) | 开发阶段、验收标准、风险清单、正式开工检查表 |
| [10-references.md](10-references.md) | 已确认可复用资料和外部参考 |
| [11-agent-capability-benchmark.md](11-agent-capability-benchmark.md) | Hermes/OpenClaw 级 Agent 能力矩阵 |
| [12-engineering-contracts.md](12-engineering-contracts.md) | 任务、事件、工具调用、配置等工程合同 |
| [13-implementation-notes.md](13-implementation-notes.md) | 当前实现说明、资产说明、发布前替换项 |
| [14-character-sprite-studio.md](14-character-sprite-studio.md) | 任意角色主图生成像素桌宠动画的产品规格 |
| [15-sprite-generation-pipeline.md](15-sprite-generation-pipeline.md) | 像素帧生成、抠图、对齐、自动重抽和质检流水线 |
| [16-sprite-asset-contracts.md](16-sprite-asset-contracts.md) | 生成资源包、manifest、profile、QA 报告的工程合同 |

## 一句话定义

Taffy Agent 是一个独立于 Codex 宠物功能的桌面 Agent：前台是有动态表情、声音和情绪的塔菲桌宠，后台是能调用 DeepSeek、浏览器、Codex、Shell、文件系统和项目脚手架的本地工作终端。

## 核心原则

- 角色是入口，能力是主体：可爱只是第一层，真正价值在能可靠完成工作。
- 本地优先：密钥、日志、记忆、项目状态默认保存在本机。
- 高适配 Codex，不接管 Codex：Taffy 只调度和观察，不读取、不保存、不修改 Codex 账号凭据。
- 工具调用可解释：每个工具动作都能看到目的、输入、输出、状态和失败原因。
- 危险动作需要确认：登录、付款、删除、提交、推送、运行不可信命令等都必须有人类确认。
- 体验要丝滑，但不能假装全自动无风险：验证码、2FA、账号敏感操作进入人类接管模式。
- 资产生成可复盘：角色图生成像素动画时，保留 profile、prompt、质检报告和重抽记录。
