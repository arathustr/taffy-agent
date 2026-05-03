# 实现说明

## 当前工程形态

当前实现是 Electron + React + TypeScript 桌面应用。

已实现：

- 默认无标题栏、无边框、透明置顶桌宠窗口。
- 贴身输入条：不用打开大窗口即可直接输入任务。
- 按需工作台：聊天、任务、日志、设置只在用户呼出时展开。
- 状态化 CSS 桌宠占位：不再使用 meme GIF 作为默认主体。
- 聊天面板、任务面板、日志面板、设置面板。
- Agent 状态机和任务记录。
- DeepSeek Provider 与 Mock Provider。
- CodexBridge：检测 Codex，生成 handoff，调用 `codex exec`。
- BrowserBridge：打开独立浏览器窗口，读取页面 snapshot，支持登录接管流程的基础能力。
- ShellBridge：确认后运行 PowerShell 命令。
- FileBridge：工作区内文件列表/读写能力。
- Policy Gate：Codex/Shell/高风险动作确认。
- 本地 runtime state 和事件 JSONL 日志。

## 资产说明

此前下载的 meme GIF/PNG 已移除，不再作为默认资产。当前默认形象是状态化 CSS 占位，只用于验证桌宠交互形态。真实版本应接入 `src/renderer/assets/pet/` 中的 Live2D 或状态精灵资产。

塔菲专属素材优先路线：

- BongoCat/Live2D 塔菲桌宠模型：https://www.bilibili.com/video/BV1mVxheREq5/
- 该模型展示含键鼠手柄模式、双状态、三表情，但需要从作者渠道获取并确认是否允许随项目分发。

## 发布前仍需替换的外部依赖

- 标准 Live2D 模型。
- 本地 GPT-SoVITS 塔菲语音模型。
- 应用图标和安装包元数据。
- 若公开发布，需要补充第三方素材 license 文件。

## Character Sprite Studio 准备状态

已经补充发布级准备文档：

- `docs/14-character-sprite-studio.md`：工具定位、用户流程、发布级质量目标。
- `docs/15-sprite-generation-pipeline.md`：主图分析、canonical sheet、动作帧生成、抠图、对齐、自动重抽。
- `docs/16-sprite-asset-contracts.md`：资源包 manifest、角色 profile、QA report 和运行时加载规则。
- `docs/sprite-studio/`：schema、质量阈值和提示词模板。

这个工具应作为桌宠资产生成模块开发，不和塔菲专属素材绑定。公开发布时默认不携带未授权角色资源，只发布生成工具和示例占位资源。
