import { contextBridge, ipcRenderer } from 'electron';
import type {
  AgentEvent,
  AgentSnapshot,
  ApprovalDecision,
  RuntimeConfig,
  SpriteStudioGenerateRequest,
  SpriteStudioGenerateResult,
  UserCommand
} from '../shared/contracts';

contextBridge.exposeInMainWorld('taffy', {
  getSnapshot: (): Promise<AgentSnapshot> => ipcRenderer.invoke('agent:get-snapshot'),
  sendMessage: (command: UserCommand): Promise<AgentSnapshot> => ipcRenderer.invoke('agent:send-message', command),
  decideApproval: (id: string, decision: ApprovalDecision): Promise<AgentSnapshot> =>
    ipcRenderer.invoke('agent:approval', id, decision),
  saveConfig: (config: RuntimeConfig): Promise<AgentSnapshot> => ipcRenderer.invoke('agent:save-config', config),
  detectCodex: (): Promise<boolean> => ipcRenderer.invoke('agent:detect-codex'),
  generateSprites: (request: SpriteStudioGenerateRequest): Promise<SpriteStudioGenerateResult> =>
    ipcRenderer.invoke('sprite:generate', request),
  windowDrag: (phase: 'start' | 'move' | 'end'): Promise<void> => ipcRenderer.invoke('window:drag', phase),
  windowAction: (
    action: 'minimize' | 'close' | 'toggle-always-on-top' | 'focus-browser' | 'pet-mode' | 'workbench-mode'
  ): Promise<void> => ipcRenderer.invoke('window:action', action),
  onEvent: (callback: (event: AgentEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: AgentEvent) => callback(payload);
    ipcRenderer.on('agent:event', listener);
    return () => ipcRenderer.off('agent:event', listener);
  }
});
