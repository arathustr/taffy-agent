import { EventEmitter } from 'node:events';
import path from 'node:path';
import type {
  AgentEvent,
  AgentSnapshot,
  AgentStatus,
  ApprovalDecision,
  ApprovalRequest,
  ChatMessage,
  RuntimeConfig,
  TaskRecord,
  ToolCall,
  ToolResult,
  UserCommand
} from '../../shared/contracts';
import { intentSchema, type RoutedIntent } from '../../shared/schemas';
import { sanitizeTaffySpeech, TAFFY_PERSONA_SYSTEM_PROMPT } from '../../shared/taffyPersona';
import { nowIso } from '../../shared/time';
import { getProjectRoot } from '../env';
import { createLlmProvider } from './llm';
import type { LlmProvider } from './llm/types';
import { buildApproval, inferRisk, needsApproval } from './policy';
import { RuntimeStore } from './runtimeStore';
import { BrowserBridge } from './tools/browserBridge';
import { CodexBridge } from './tools/codexBridge';
import { FileBridge } from './tools/fileBridge';
import { ShellBridge } from './tools/shellBridge';
import { createId, truncate } from './utils';

type ApprovalHandler = (decision: ApprovalDecision) => Promise<void>;

export class AgentService extends EventEmitter {
  private status: AgentStatus = 'idle';
  private messages: ChatMessage[] = [];
  private tasks: TaskRecord[] = [];
  private pendingApproval?: ApprovalRequest;
  private approvals = new Map<string, ApprovalHandler>();
  private config: RuntimeConfig;
  private provider: LlmProvider;
  private readonly workspace: string;
  private readonly browser = new BrowserBridge();
  private readonly fileBridge: FileBridge;
  private readonly shellBridge: ShellBridge;
  private readonly codexBridge: CodexBridge;
  private codexAvailable?: boolean;

  constructor(
    initialConfig: RuntimeConfig,
    private readonly store: RuntimeStore
  ) {
    super();
    this.config = initialConfig;
    this.provider = createLlmProvider(initialConfig);
    this.workspace = getProjectRoot();
    this.fileBridge = new FileBridge(this.workspace);
    this.shellBridge = new ShellBridge(this.workspace);
    this.codexBridge = new CodexBridge(this.workspace);
  }

  async init(): Promise<void> {
    const persisted = await this.store.load();
    this.config = persisted.config;
    this.provider = createLlmProvider(this.config);
    this.tasks = persisted.tasks;
    this.codexAvailable = await this.codexBridge.detect().catch(() => false);
    await this.say(
      this.config.llm.useMock
        ? '塔菲醒啦。现在是测试模式，外观和工具流程可以先玩一只；填好 DeepSeek Key 后，塔菲就能真接活喵。'
        : '塔菲醒啦。DeepSeek 已经接好，雏草姬可以直接把任务丢过来喵。'
    );
    await this.setStatus('idle');
  }

  snapshot(): AgentSnapshot {
    return {
      status: this.status,
      messages: this.messages.slice(-80),
      tasks: this.tasks.slice(0, 40),
      pendingApproval: this.pendingApproval,
      config: this.config,
      codexAvailable: this.codexAvailable
    };
  }

  async saveConfig(config: RuntimeConfig): Promise<AgentSnapshot> {
    this.config = config;
    this.provider = createLlmProvider(config);
    await this.store.save(this.config, this.tasks);
    await this.emitEvent('ui', 'info', '配置已保存');
    return this.snapshot();
  }

  async detectCodex(): Promise<boolean> {
    this.codexAvailable = await this.codexBridge.detect().catch(() => false);
    await this.emitEvent('tool_result', this.codexAvailable ? 'info' : 'warn', this.codexAvailable ? 'Codex 可用' : 'Codex 不可用');
    return this.codexAvailable;
  }

  async handleUserMessage(command: UserCommand): Promise<AgentSnapshot> {
    const text = command.text.trim();
    if (!text) return this.snapshot();

    await this.setStatus('listening');
    await this.addMessage('user', text);
    await this.setStatus('thinking');

    const intent = await this.routeIntent(text);
    await this.emitEvent('state', 'info', `意图：${intent.kind}`, intent);

    if (intent.kind === 'chat') {
      await this.handleChat(text);
    } else if (intent.kind === 'browser') {
      await this.handleBrowser(text, intent);
    } else if (intent.kind === 'codex') {
      await this.handleCodex(text, intent);
    } else if (intent.kind === 'shell') {
      await this.handleShell(text, intent);
    } else if (intent.kind === 'file') {
      await this.handleFile(text, intent);
    } else {
      await this.say('设置已经能打开和保存啦。右侧面板里可以切测试模式、DeepSeek、Codex、浏览器和塔菲语音喵。');
      await this.setStatus('idle');
    }

    await this.store.save(this.config, this.tasks);
    return this.snapshot();
  }

  async decideApproval(id: string, decision: ApprovalDecision): Promise<AgentSnapshot> {
    const handler = this.approvals.get(id);
    if (!handler) {
      await this.say('这个确认请求已经失效了，我没有继续执行。');
      this.pendingApproval = undefined;
      return this.snapshot();
    }

    this.approvals.delete(id);
    const approval = this.pendingApproval;
    this.pendingApproval = undefined;
    await this.emitEvent('approval', decision === 'approve' ? 'info' : 'warn', `用户选择：${decision}`, approval);
    await handler(decision);
    await this.store.save(this.config, this.tasks);
    return this.snapshot();
  }

  async focusBrowser(): Promise<void> {
    await this.browser.focus();
  }

  private async handleChat(text: string): Promise<void> {
    const reply = await this.chatWithPersona(text);
    await this.say(reply);
    await this.setStatus('idle');
  }

  private async handleBrowser(text: string, intent: RoutedIntent): Promise<void> {
    if (!this.config.permissions.allowBrowser) {
      await this.say('浏览器开关现在关着。去设置里打开以后，塔菲再继续翻页面喵。');
      await this.setStatus('blocked');
      return;
    }

    const task = this.createTask('浏览器任务', intent.goal, intent.risk, [
      {
        id: createId('step'),
        title: '打开并读取页面',
        tool: 'browser',
        inputSummary: text,
        risk: intent.risk,
        requiresApproval: false,
        status: 'pending'
      }
    ]);

    await this.setStatus('executing');
    task.status = 'running';
    task.steps[0].status = 'running';
    await this.emitEvent('tool_call', 'info', `浏览器打开：${text}`, { taskId: task.id });

    try {
      const snapshot = await this.browser.openOrSearch(text);
      task.steps[0].status = 'completed';
      task.status = 'completed';
      task.summary = `已打开 ${snapshot.title || snapshot.url}`;
      await this.emitEvent('tool_result', 'info', task.summary, snapshot);
      const visible = snapshot.visibleText.replace(/\s+/g, ' ').slice(0, 500);
      await this.say(`页面打开了：${snapshot.title || snapshot.url}\n${visible ? `我先读到这些：${visible}` : '页面内容比较少，可能需要你登录或等待加载。'}`);
      await this.setStatus(snapshot.loginState === 'logged_out' ? 'waiting_user' : 'success');
    } catch (error) {
      await this.failTask(task, error);
    }
  }

  private async handleCodex(text: string, intent: RoutedIntent): Promise<void> {
    if (!this.config.permissions.allowCodex) {
      await this.say('Codex 开关现在关着。打开以后，塔菲再把编程任务交给 Codex。');
      await this.setStatus('blocked');
      return;
    }

    const task = this.createTask('Codex 编程任务', intent.goal, 'medium', [
      {
        id: createId('step'),
        title: '生成 handoff 并启动 Codex',
        tool: 'codex',
        inputSummary: text,
        risk: 'medium',
        requiresApproval: true,
        status: 'pending'
      }
    ]);

    const handoff = this.codexBridge.buildHandoff(text, `Taffy workspace: ${this.workspace}`);
    const call: ToolCall = {
      id: createId('call'),
      taskId: task.id,
      stepId: task.steps[0].id,
      tool: 'codex',
      action: 'exec',
      args: { summary: handoff.goal, workspace: handoff.workspace },
      risk: 'medium',
      timeoutMs: 20 * 60 * 1000,
      requiresApproval: true
    };

    await this.requestApproval(call, async (decision) => {
      if (decision !== 'approve') {
        task.status = decision === 'manual' ? 'waiting_user' : 'canceled';
        task.summary = decision === 'manual' ? '等待你手动处理 Codex。' : '用户取消了 Codex 任务。';
        await this.say(task.summary);
        await this.setStatus(decision === 'manual' ? 'waiting_user' : 'idle');
        return;
      }

      task.status = 'running';
      task.steps[0].status = 'running';
      await this.setStatus('executing');
      await this.emitEvent('tool_call', 'info', '启动 Codex exec', call);
      const result = await this.codexBridge.run(handoff);
      task.steps[0].status = result.exitCode === 0 ? 'completed' : 'failed';
      task.status = result.exitCode === 0 ? 'completed' : 'failed';
      task.summary = result.summary;
      await this.emitToolResult(call, {
        callId: call.id,
        status: result.exitCode === 0 ? 'success' : 'failed',
        summary: result.summary,
        data: result
      });
      await this.say(result.summary);
      await this.setStatus(result.exitCode === 0 ? 'success' : 'error');
    });
  }

  private async handleShell(text: string, intent: RoutedIntent): Promise<void> {
    const command = extractCommand(text);
    if (!command) {
      await this.say('我需要一条明确的命令。可以用反引号包起来，比如 `npm run build`。');
      await this.setStatus('waiting_user');
      return;
    }

    const risk = inferRisk('shell', command);
    const task = this.createTask('本地命令', intent.goal, risk, [
      {
        id: createId('step'),
        title: command,
        tool: 'shell',
        inputSummary: command,
        risk,
        requiresApproval: true,
        status: 'pending'
      }
    ]);

    const call: ToolCall = {
      id: createId('call'),
      taskId: task.id,
      stepId: task.steps[0].id,
      tool: 'shell',
      action: command,
      args: { summary: command },
      risk,
      timeoutMs: 120000,
      requiresApproval: true
    };

    await this.requestApproval(call, async (decision) => {
      if (decision !== 'approve') {
        task.status = decision === 'manual' ? 'waiting_user' : 'canceled';
        await this.say(decision === 'manual' ? '好，这条命令交给你手动处理。' : '已取消运行命令。');
        await this.setStatus(decision === 'manual' ? 'waiting_user' : 'idle');
        return;
      }

      task.status = 'running';
      task.steps[0].status = 'running';
      await this.setStatus('executing');
      const result = await this.shellBridge.run(command);
      const success = result.exitCode === 0;
      task.steps[0].status = success ? 'completed' : 'failed';
      task.status = success ? 'completed' : 'failed';
      task.summary = success ? `命令完成：${command}` : `命令失败：${command}`;
      await this.emitToolResult(call, {
        callId: call.id,
        status: success ? 'success' : 'failed',
        summary: task.summary,
        data: result
      });
      await this.say(`${task.summary}\n${truncate(result.stdout || result.stderr || '没有输出。', 1600)}`);
      await this.setStatus(success ? 'success' : 'error');
    });
  }

  private async handleFile(_text: string, intent: RoutedIntent): Promise<void> {
    const task = this.createTask('文件查看', intent.goal, 'low', [
      {
        id: createId('step'),
        title: '列出工作区文件',
        tool: 'file',
        inputSummary: this.workspace,
        risk: 'low',
        requiresApproval: false,
        status: 'pending'
      }
    ]);
    await this.setStatus('executing');
    try {
      const files = await this.fileBridge.list('.');
      task.steps[0].status = 'completed';
      task.status = 'completed';
      task.summary = `工作区 ${path.basename(this.workspace)} 有 ${files.length} 个顶层条目。`;
      await this.say(`${task.summary}\n${files.slice(0, 40).join('\n')}`);
      await this.setStatus('success');
    } catch (error) {
      await this.failTask(task, error);
    }
  }

  private async routeIntent(text: string): Promise<RoutedIntent> {
    const heuristic = heuristicIntent(text);
    try {
      const response = await this.provider.chat({
        json: true,
        temperature: 0,
        maxTokens: 500,
        model: this.config.llm.defaultModel,
        messages: [
          {
            role: 'system',
            content:
              '你是 Taffy Agent 的意图路由器。只输出 JSON，字段为 kind, confidence, goal, risk, requiresApproval, reason。kind 只能是 chat/browser/codex/shell/file/settings。'
          },
          { role: 'user', content: text }
        ]
      });
      return intentSchema.parse(JSON.parse(response.content));
    } catch {
      return heuristic;
    }
  }

  private async chatWithPersona(text: string): Promise<string> {
    try {
      const response = await this.provider.chat({
        model: this.config.llm.defaultModel,
        temperature: 0.7,
        maxTokens: 900,
        messages: [
          {
            role: 'system',
            content: TAFFY_PERSONA_SYSTEM_PROMPT
          },
          { role: 'user', content: text }
        ]
      });
      return response.content;
    } catch (error) {
      await this.emitEvent('error', 'error', 'LLM 调用失败', error instanceof Error ? error.message : String(error));
      return '模型这边暂时没接上。我先切回本地判断，UI 和工具仍然可以继续测试。';
    }
  }

  private createTask(title: string, goal: string, risk: TaskRecord['risk'], steps: TaskRecord['steps']): TaskRecord {
    const task: TaskRecord = {
      id: createId('task'),
      title,
      goal,
      status: 'planned',
      risk,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      workspace: this.workspace,
      currentStepId: steps[0]?.id,
      steps
    };
    this.tasks.unshift(task);
    void this.emitEvent('state', 'info', `创建任务：${title}`, task);
    return task;
  }

  private async requestApproval(call: ToolCall, handler: ApprovalHandler): Promise<void> {
    const approval = buildApproval(call, call.taskId);
    this.pendingApproval = approval;
    this.approvals.set(approval.id, handler);
    const task = this.tasks.find((item) => item.id === call.taskId);
    if (task) {
      task.status = 'waiting_approval';
      task.updatedAt = nowIso();
    }
    await this.emitEvent('approval', 'warn', approval.title, approval);
    await this.say(`这一步需要你确认：${approval.summary}`);
    await this.setStatus('waiting_user');

    if (!needsApproval(call)) {
      await this.decideApproval(approval.id, 'approve');
    }
  }

  private async emitToolResult(call: ToolCall, result: ToolResult): Promise<void> {
    await this.emitEvent('tool_result', result.status === 'success' ? 'info' : 'error', result.summary, { call, result });
  }

  private async failTask(task: TaskRecord, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    task.status = 'failed';
    task.summary = message;
    task.updatedAt = nowIso();
    await this.emitEvent('error', 'error', message, error);
    await this.say(`这一步卡住了：${message}`);
    await this.setStatus('error');
  }

  private async say(content: string): Promise<void> {
    await this.addMessage('assistant', sanitizeTaffySpeech(content));
  }

  private async addMessage(role: ChatMessage['role'], content: string): Promise<void> {
    const message: ChatMessage = {
      id: createId('msg'),
      role,
      content,
      createdAt: nowIso(),
      tone: inferTone(content)
    };
    this.messages.push(message);
    await this.emitEvent('message', 'info', `${role}: ${truncate(content, 160)}`, message);
  }

  private async setStatus(status: AgentStatus): Promise<void> {
    this.status = status;
    await this.emitEvent('state', 'debug', `状态：${status}`);
  }

  private async emitEvent(type: AgentEvent['type'], level: AgentEvent['level'], summary: string, data?: unknown): Promise<void> {
    const event: AgentEvent = {
      id: createId('evt'),
      type,
      level,
      summary,
      data,
      createdAt: nowIso()
    };
    await this.store.appendEvent(event).catch(() => undefined);
    this.emit('event', event);
  }
}

function heuristicIntent(text: string): RoutedIntent {
  const lower = text.toLowerCase();
  const kind =
    /codex|代码|编程|修复|项目|仓库|组件|接口|bug/i.test(text)
      ? 'codex'
      : /浏览器|打开|网页|搜索|登录|网址|http/i.test(text)
        ? 'browser'
        : /命令|终端|shell|npm|pnpm|git|运行/i.test(text)
          ? 'shell'
          : /文件|目录|读取|写入|列出/i.test(text)
            ? 'file'
            : /设置|配置|模型|声音|key/i.test(lower)
              ? 'settings'
              : 'chat';
  const risk = /删除|付款|支付|发布|推送|push|rm |remove|del /i.test(text)
    ? 'high'
    : /运行|命令|codex|写入|安装|npm|git|项目/i.test(text)
      ? 'medium'
      : 'low';
  return {
    kind,
    confidence: 0.7,
    goal: text,
    risk,
    requiresApproval: risk !== 'low' || kind === 'codex' || kind === 'shell',
    reason: 'local heuristic'
  };
}

function extractCommand(text: string): string {
  const fenced = text.match(/```(?:powershell|pwsh|bash|sh|cmd)?\s*([\s\S]+?)```/i);
  if (fenced) return fenced[1].trim();
  const inline = text.match(/`([^`]+)`/);
  if (inline) return inline[1].trim();
  const afterRun = text.match(/(?:运行|执行|run)\s+(.+)$/i);
  if (afterRun) return afterRun[1].trim();
  return '';
}

function inferTone(content: string): ChatMessage['tone'] {
  if (/搞定|完成|成功|好了/.test(content)) return 'happy';
  if (/确认|风险|危险|需要你/.test(content)) return 'serious';
  if (/失败|错误|卡住|不可用/.test(content)) return 'confused';
  return 'neutral';
}
