import type {
  AgentEvent,
  AgentSnapshot,
  ApprovalDecision,
  RuntimeConfig,
  SpriteStudioGenerateRequest,
  SpriteStudioGenerateResult,
  UserCommand
} from '../shared/contracts';

declare global {
  interface Window {
    taffy: {
      getSnapshot: () => Promise<AgentSnapshot>;
      sendMessage: (command: UserCommand) => Promise<AgentSnapshot>;
      decideApproval: (id: string, decision: ApprovalDecision) => Promise<AgentSnapshot>;
      saveConfig: (config: RuntimeConfig) => Promise<AgentSnapshot>;
      detectCodex: () => Promise<boolean>;
      generateSprites: (request: SpriteStudioGenerateRequest) => Promise<SpriteStudioGenerateResult>;
      windowDrag: (phase: 'start' | 'move' | 'end') => Promise<void>;
      windowAction: (
        action: 'minimize' | 'close' | 'toggle-always-on-top' | 'focus-browser' | 'pet-mode' | 'workbench-mode'
      ) => Promise<void>;
      onEvent: (callback: (event: AgentEvent) => void) => () => void;
    };
  }
}
