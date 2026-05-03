# LLM、语音与记忆设计

## LLM Provider

默认使用 DeepSeek 官方 API。

基础配置：

```env
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=
TAFFY_DEFAULT_MODEL=deepseek-v4-flash
TAFFY_ADVANCED_MODEL=deepseek-v4-pro
```

## 模型路由

| 场景 | 默认模型 | 说明 |
| --- | --- | --- |
| 闲聊 | deepseek-v4-flash | 低延迟低成本 |
| 状态说明 | deepseek-v4-flash | 简短输出 |
| 意图分类 | deepseek-v4-flash | JSON 输出 |
| 浏览器页面摘要 | deepseek-v4-flash | 长页面可分块 |
| 复杂计划 | deepseek-v4-pro | 多步任务 |
| Codex handoff 生成 | deepseek-v4-pro | 高质量任务说明 |
| 日志/diff 复盘 | deepseek-v4-pro | 需要推理 |

## Provider 抽象

Provider 接口：

```ts
interface LlmProvider {
  id: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
  structured<T>(request: StructuredRequest<T>): Promise<T>;
  healthCheck(): Promise<ProviderHealth>;
}
```

必须支持：

- base URL 配置。
- API Key 配置。
- 模型切换。
- timeout。
- proxy/no-proxy。
- token 统计。
- 错误类型归一化。

## 提示词层

| 层 | 内容 |
| --- | --- |
| System | Taffy 身份、语气、安全边界 |
| Developer | 工具协议、输出格式、任务纪律 |
| User | 用户当前输入 |
| Context | 当前项目、浏览器、任务、记忆 |
| Tool Result | 工具调用结果 |

## 语音方案

### 首选

本地 GPT-SoVITS：

- 质量可控。
- 可离线。
- 可接 Open-LLM-VTuber 风格 TTS API。
- 支持参考音频和情绪路由。

### 备选

Fish Audio：

- 上手快。
- 可用于早期对比。
- 长期要评估额度、稳定性、授权和延迟。

## 情绪参考音频

建议准备：

| 文件 | 用途 |
| --- | --- |
| neutral.wav | 默认说明 |
| happy.wav | 成功/轻快 |
| serious.wav | 风险确认 |
| confused.wav | 不确定/澄清 |
| soft.wav | 安慰/低强度反馈 |

LLM 输出中的情绪标签只用于路由，不直接朗读。

示例：

```text
[happy] 搞定啦，测试也过了。
```

送入 TTS 前：

```text
搞定啦，测试也过了。
```

## 口型同步

早期：

- 基于 TTS 音频 RMS 音量驱动 mouth open。

后续：

- 基于音素或 viseme。
- 结合 Live2D 参数。

## 记忆系统

### Profile Memory

用户偏好：

- 默认模型。
- 声音音量。
- UI 位置。
- 常用项目目录。
- 是否偏好详细汇报。

### Project Memory

项目级：

- 技术栈。
- 常用命令。
- 测试方式。
- 最近任务。
- Codex handoff 习惯。

### Task Memory

任务级：

- 计划。
- 工具调用。
- 中间结果。
- 完成摘要。
- 失败原因。

## 记忆存储

建议使用 SQLite：

- `profiles`
- `projects`
- `tasks`
- `events`
- `memories`
- `settings`

敏感字段不入库或加密保存。

## LLM/语音验收标准

- DeepSeek Key 未配置时能进入 Mock 模式。
- Flash/Pro 可在设置中切换。
- 结构化输出有 schema 校验。
- TTS 可关闭。
- 语音被打断时，字幕和口型状态同步停止。

