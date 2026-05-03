export type AgentStatus =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'planning'
  | 'executing'
  | 'waiting_user'
  | 'success'
  | 'blocked'
  | 'error';

export type TaskStatus =
  | 'proposed'
  | 'planned'
  | 'waiting_approval'
  | 'running'
  | 'waiting_user'
  | 'paused'
  | 'reviewing'
  | 'completed'
  | 'failed'
  | 'canceled';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ToolName = 'none' | 'browser' | 'codex' | 'shell' | 'file' | 'app';
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  tone?: 'neutral' | 'happy' | 'serious' | 'confused' | 'soft';
}

export interface PlanStep {
  id: string;
  title: string;
  tool: ToolName;
  inputSummary: string;
  risk: RiskLevel;
  requiresApproval: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}

export interface TaskRecord {
  id: string;
  title: string;
  goal: string;
  status: TaskStatus;
  risk: RiskLevel;
  createdAt: string;
  updatedAt: string;
  workspace: string;
  currentStepId?: string;
  steps: PlanStep[];
  summary?: string;
}

export interface AgentEvent {
  id: string;
  taskId?: string;
  type: 'state' | 'message' | 'tool_call' | 'tool_result' | 'approval' | 'error' | 'memory' | 'ui';
  level: 'debug' | 'info' | 'warn' | 'error';
  summary: string;
  data?: unknown;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  taskId: string;
  stepId?: string;
  tool: Exclude<ToolName, 'none'>;
  action: string;
  args: Record<string, unknown>;
  risk: RiskLevel;
  timeoutMs: number;
  requiresApproval: boolean;
}

export interface ToolArtifact {
  type: 'screenshot' | 'file' | 'log' | 'diff' | 'url';
  path?: string;
  url?: string;
  label?: string;
}

export interface ToolResult {
  callId: string;
  status: 'success' | 'failed' | 'canceled' | 'blocked';
  summary: string;
  data?: unknown;
  artifacts?: ToolArtifact[];
  error?: {
    type: 'ProviderFailure' | 'ToolFailure' | 'ContractFailure' | 'UserBlocked' | 'Unknown';
    message: string;
    recoverable: boolean;
  };
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  toolCallId?: string;
  title: string;
  summary: string;
  impact: string[];
  reversible: boolean;
  choices: ApprovalDecision[];
  risk: RiskLevel;
  expiresAt?: string;
}

export type ApprovalDecision = 'approve' | 'deny' | 'manual';

export interface BrowserSnapshot {
  url: string;
  title: string;
  visibleText: string;
  loginState: 'unknown' | 'logged_in' | 'logged_out' | 'blocked';
  forms: Array<{ label: string; fields: string[] }>;
  buttons: string[];
  links: Array<{ text: string; href: string }>;
  screenshotPath?: string;
}

export interface CodexHandoff {
  workspace: string;
  goal: string;
  prompt: string;
  constraints: string[];
  expectedVerification: string[];
  risk: RiskLevel;
}

export interface RuntimeConfig {
  llm: {
    provider: 'deepseek' | 'mock';
    baseUrl: string;
    defaultModel: string;
    advancedModel: string;
    timeoutMs: number;
    useMock: boolean;
  };
  ui: {
    alwaysOnTop: boolean;
    petScale: number;
    compactMode: boolean;
  };
  permissions: {
    allowShell: boolean;
    allowBrowser: boolean;
    allowCodex: boolean;
    trustedWorkspaces: string[];
  };
  voice: {
    enabled: boolean;
    provider: 'taffy-bert-vits2' | 'system' | 'gpt-sovits' | 'fish-audio' | 'none';
    endpoint: string;
    volume: number;
  };
}

export interface AgentSnapshot {
  status: AgentStatus;
  messages: ChatMessage[];
  tasks: TaskRecord[];
  pendingApproval?: ApprovalRequest;
  config: RuntimeConfig;
  codexAvailable?: boolean;
  lastEvent?: AgentEvent;
}

export interface UserCommand {
  text: string;
  workspace?: string;
}

export interface CodexRunResult {
  available: boolean;
  exitCode?: number | null;
  stdout: string;
  stderr: string;
  summary: string;
}

export interface ShellRunResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  command: string;
}

export type SpriteActionName =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'typing'
  | 'executing'
  | 'waiting_user'
  | 'success'
  | 'error'
  | 'sleep'
  | 'dragged';

export type SpriteCanvasSize = 128 | 192 | 256;
export type SpriteFramePreset = 'compact' | 'standard' | 'rich';
export type SpritePixelStyle = 'clean-chibi' | 'rpg' | 'soft-chibi' | 'crisp-outline';

export interface SpriteStudioOptions {
  characterName: string;
  characterId?: string;
  canvasSize: SpriteCanvasSize;
  framePreset: SpriteFramePreset;
  pixelStyle: SpritePixelStyle;
  actions: SpriteActionName[];
}

export interface SpriteStudioGenerateRequest {
  fileName: string;
  imageData: ArrayBuffer;
  options: SpriteStudioOptions;
}

export interface SpriteStudioActionResult {
  name: SpriteActionName;
  fps: number;
  loop: boolean;
  frameCount: number;
  sheetPath: string;
  sheetDataUrl: string;
  frames: string[];
  warnings: string[];
}

export interface SpriteStudioReport {
  releaseReady: boolean;
  warnings: string[];
  metrics: {
    maxAnchorDriftPx: number;
    maxPaletteDrift: number;
    minAlphaCleanliness: number;
    minLoopContinuity: number;
    regenerations: number;
  };
}

export interface SpriteStudioGenerateResult {
  jobId: string;
  characterId: string;
  displayName: string;
  exportPath: string;
  manifestPath: string;
  previewPath: string;
  previewDataUrl: string;
  actions: SpriteStudioActionResult[];
  report: SpriteStudioReport;
}
