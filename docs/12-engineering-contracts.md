# 工程合同

## 目的

这些合同用于约束 UI、Agent Core、LLM Gateway 和工具层之间的数据流。正式实现时应先建立 TypeScript 类型和 schema 校验，再接入真实模型和工具。

## Task

```json
{
  "id": "task_20260504_000001",
  "title": "创建桌面助手项目",
  "goal": "string",
  "status": "proposed|planned|waiting_approval|running|waiting_user|paused|reviewing|completed|failed|canceled",
  "risk": "low|medium|high|critical",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "workspace": "C:\\path\\to\\project",
  "currentStepId": "step-1"
}
```

## Plan

```json
{
  "taskId": "string",
  "goal": "string",
  "steps": [
    {
      "id": "step-1",
      "title": "string",
      "tool": "none|browser|codex|shell|file|app",
      "inputSummary": "string",
      "risk": "low|medium|high|critical",
      "requiresApproval": false,
      "status": "pending|running|completed|failed|skipped"
    }
  ],
  "stopConditions": ["string"],
  "createdBy": "deepseek-v4-flash|deepseek-v4-pro|mock"
}
```

## Event

```json
{
  "id": "evt_000001",
  "taskId": "string",
  "type": "state|message|tool_call|tool_result|approval|error|memory|ui",
  "level": "debug|info|warn|error",
  "summary": "string",
  "data": {},
  "createdAt": "ISO-8601"
}
```

## ToolCall

```json
{
  "id": "call_000001",
  "taskId": "string",
  "stepId": "step-1",
  "tool": "browser|codex|shell|file|app",
  "action": "string",
  "args": {},
  "risk": "low|medium|high|critical",
  "timeoutMs": 120000,
  "requiresApproval": false
}
```

## ToolResult

```json
{
  "callId": "call_000001",
  "status": "success|failed|canceled|blocked",
  "summary": "string",
  "data": {},
  "artifacts": [
    {
      "type": "screenshot|file|log|diff|url",
      "path": "string",
      "url": "string"
    }
  ],
  "error": {
    "type": "ProviderFailure|ToolFailure|ContractFailure|UserBlocked|Unknown",
    "message": "string",
    "recoverable": true
  }
}
```

## ApprovalRequest

```json
{
  "id": "approval_000001",
  "taskId": "string",
  "toolCallId": "call_000001",
  "title": "即将执行命令",
  "summary": "string",
  "impact": ["会写入项目文件", "会安装 npm 依赖"],
  "reversible": true,
  "choices": ["approve", "deny", "manual"],
  "expiresAt": "ISO-8601"
}
```

## BrowserSnapshot

```json
{
  "url": "https://example.com",
  "title": "string",
  "visibleText": "string",
  "loginState": "unknown|logged_in|logged_out|blocked",
  "forms": [],
  "buttons": [],
  "links": [],
  "screenshotPath": "C:\\path\\shot.png"
}
```

## CodexHandoff

```json
{
  "workspace": "C:\\path\\project",
  "goal": "string",
  "prompt": "string",
  "constraints": ["string"],
  "expectedVerification": ["npm test", "npm run build"],
  "risk": "low|medium|high|critical"
}
```

## AppConfig

```json
{
  "llm": {
    "provider": "deepseek",
    "baseUrl": "https://api.deepseek.com",
    "defaultModel": "deepseek-v4-flash",
    "advancedModel": "deepseek-v4-pro",
    "timeoutMs": 120000
  },
  "ui": {
    "alwaysOnTop": true,
    "petScale": 1,
    "position": { "x": 100, "y": 100 }
  },
  "permissions": {
    "allowShell": false,
    "allowBrowser": true,
    "allowCodex": true,
    "trustedWorkspaces": []
  },
  "voice": {
    "enabled": false,
    "provider": "gpt-sovits",
    "endpoint": "http://127.0.0.1:9880/tts"
  }
}
```

## 实现要求

- 所有合同都要有 TypeScript 类型。
- 驱动业务逻辑的 LLM 输出必须过 schema 校验。
- `ToolResult.error.type` 用于 UI 选择恢复方式。
- `ApprovalRequest` 不允许由 LLM 直接跳过。
- 日志记录合同对象的脱敏版本。

