# 路线图与验收标准

## 推荐技术栈

| 层 | 技术 |
| --- | --- |
| 桌面应用 | Electron + React + TypeScript |
| UI 状态 | Zustand 或 Redux Toolkit |
| 动画 | CSS Animation + Live2D SDK |
| Agent Core | Node.js TypeScript |
| 浏览器自动化 | Playwright |
| 本地存储 | SQLite |
| 配置 | `.env` + `taffy.config.json` |
| TTS | GPT-SoVITS 本地服务 |
| LLM | DeepSeek 官方 API |

Electron 优先的原因：Windows 桌面透明窗口、置顶、Playwright/Node/Codex CLI 调用、开发速度都更顺。

## 阶段计划

### Phase 0：准备

- 完成设计文档。
- 确认资产来源。
- 注册 DeepSeek 官方 API。
- 准备 `.env.example`。
- 确认 Codex CLI 可用。

### Phase 1：桌宠壳

- Electron 透明窗口。
- GIF/PNG 占位角色。
- 气泡、状态点、右键菜单。
- Mock 任务状态机。

验收：

- 无 API Key 可运行。
- 角色可拖动、置顶、隐藏、退出。
- 能展示 idle/listening/thinking/executing/success/error。

### Phase 2：LLM 对话

- DeepSeek Provider。
- Flash/Pro 切换。
- 文本聊天。
- 结构化意图路由。
- 设置页。

验收：

- `.env` 配好后可对话。
- API 错误能清楚提示。
- 简单任务可被分类。

### Phase 3：Agent Core

- Planner/Executor/Reviewer。
- Event Bus。
- SQLite 任务记录。
- 工具 trace。
- Policy Gate。

验收：

- 多步任务能生成计划并执行 Mock Tool。
- 高风险动作进入确认卡。
- 任务可暂停/取消。

### Phase 4：CodexBridge

- 检测 Codex。
- 生成 handoff prompt。
- 启动 Codex 任务。
- 读取工作区变化和命令结果。
- 总结 Codex 输出。

验收：

- 不需要 Codex API Key。
- Codex 不可用时优雅提示。
- 能把用户需求转成 Codex 任务。
- 能总结文件变更和验证状态。

### Phase 5：BrowserBridge

- Playwright 控制浏览器。
- 搜索、打开、读取、点击、输入。
- 登录接管。
- 截图确认。

验收：

- 能完成公开网站检索。
- 登录页能暂停给用户操作。
- 用户完成登录后能继续任务。
- 验证码/2FA 不被自动绕过。

### Phase 6：Live2D 与语音

- Live2D 模型加载。
- 状态映射到表情/动作。
- GPT-SoVITS TTS。
- 口型同步。
- 语音打断。

验收：

- 至少 5 个状态有视觉差异。
- TTS 可关闭。
- 语音和字幕同步。
- 打断后不会继续播旧内容。

### Phase 6.5：Character Sprite Studio

- 导入任意角色主图。
- 生成 canonical sheet。
- 生成像素风状态帧。
- 自动抠图、对齐、色板归一。
- 自动质检和坏帧重抽。
- 导出 `pet-sprite-manifest.json`。
- 一键应用到桌宠状态机。

验收：

- 不打开外部图像编辑器即可生成可用资源包。
- 至少支持 idle/thinking/typing/success/error 五个状态。
- 每个状态能输出透明 PNG 帧、sprite sheet 和预览。
- 资源包 schema 校验通过。
- 自动 QA 报告能解释重抽原因和剩余风险。

### Phase 7：完整版打磨

- 长任务队列。
- 项目记忆。
- 浏览器 session 管理。
- 错误恢复。
- 任务复盘页。
- UI 动效优化。

验收：

- 能完成“检索资料 -> 创建项目 -> 调用 Codex -> 浏览器验证 -> 总结结果”的端到端流程。
- 所有高风险动作都有确认门。
- 任务日志可复盘。

## 完整版验收场景

### 场景 A：创建项目

用户说：

```text
塔菲，帮我新建一个 React 桌面助手原型，跑起来给我看。
```

预期：

- Taffy 规划任务。
- 创建项目。
- 安装依赖。
- 启动开发服务器。
- 汇报本地地址和状态。

### 场景 B：调用 Codex 修复问题

用户说：

```text
这个页面按钮错位了，让 Codex 修一下。
```

预期：

- Taffy 收集截图/文件上下文。
- 生成 Codex handoff。
- 启动 Codex。
- 监控改动。
- 总结修复和验证结果。

### 场景 C：浏览器登录接管

用户说：

```text
打开我的后台，帮我看一下今天的数据。
```

预期：

- Taffy 打开网站。
- 发现未登录。
- 请求用户接管登录。
- 登录后继续读取页面。
- 输出摘要。

### 场景 D：风险操作确认

用户说：

```text
把这个项目推到 GitHub。
```

预期：

- Taffy 检查 git 状态。
- 展示将要提交/推送的内容。
- 请求确认。
- 用户确认后执行。
- 完成后提供远程链接或错误原因。

## 正式开工检查表

- DeepSeek API Key 已准备，或确认先用 Mock 模式。
- 初始美术资产已选定：GIF/PNG 或 Live2D。
- Codex CLI 可在本机运行。
- 确认首版是否只支持 Windows。
- 确认浏览器自动化使用独立 Chromium profile。
- 确认 `.env`、日志和数据库路径。
- 确认第一阶段只做本地自用，不做公开分发。
- 确认 Character Sprite Studio 的图片生成 provider：Codex 生图、图像 API，或先用 Mock 模式。
