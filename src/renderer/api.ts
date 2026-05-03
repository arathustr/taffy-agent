import type {
  AgentEvent,
  AgentSnapshot,
  ApprovalDecision,
  RuntimeConfig,
  SpriteStudioGenerateRequest,
  SpriteStudioGenerateResult,
  UserCommand
} from '../shared/contracts';

export async function getSnapshot(): Promise<AgentSnapshot> {
  return window.taffy.getSnapshot();
}

export async function sendMessage(command: UserCommand): Promise<AgentSnapshot> {
  return window.taffy.sendMessage(command);
}

export async function decideApproval(id: string, decision: ApprovalDecision): Promise<AgentSnapshot> {
  return window.taffy.decideApproval(id, decision);
}

export async function saveConfig(config: RuntimeConfig): Promise<AgentSnapshot> {
  return window.taffy.saveConfig(config);
}

export async function detectCodex(): Promise<boolean> {
  return window.taffy.detectCodex();
}

export async function generateSprites(request: SpriteStudioGenerateRequest): Promise<SpriteStudioGenerateResult> {
  return window.taffy.generateSprites(request);
}

export async function windowDrag(phase: 'start' | 'move' | 'end'): Promise<void> {
  return window.taffy.windowDrag(phase);
}

export async function windowAction(
  action: 'minimize' | 'close' | 'toggle-always-on-top' | 'focus-browser' | 'pet-mode' | 'workbench-mode'
): Promise<void> {
  return window.taffy.windowAction(action);
}

export function onEvent(callback: (event: AgentEvent) => void): () => void {
  return window.taffy.onEvent(callback);
}
