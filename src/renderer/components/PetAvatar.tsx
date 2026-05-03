import type { CSSProperties } from 'react';
import { Pin, X } from 'lucide-react';
import type { AgentStatus } from '../../shared/contracts';

interface Props {
  status: AgentStatus;
  message: string;
  bubbleVisible: boolean;
  bubblePinned: boolean;
  onBubbleClose: () => void;
  onBubblePinToggle: () => void;
  overrideAction?: PetSpriteAction;
}

type PetSpriteAction =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'greeting'
  | 'typing'
  | 'success'
  | 'error'
  | 'sleep'
  | 'dragged'
  | 'browser'
  | 'approval_wait'
  | 'dance';

const statusLabel: Record<AgentStatus, string> = {
  idle: '待机',
  listening: '倾听',
  thinking: '思考',
  planning: '规划',
  executing: '执行',
  waiting_user: '等待确认',
  success: '完成',
  blocked: '阻塞',
  error: '错误'
};

const spriteSheets: Record<PetSpriteAction, string> = {
  idle: new URL('../assets/pet/generated/taffy-rich-pack/processed/idle/idle-sheet-transparent.png', import.meta.url).href,
  listening: new URL('../assets/pet/generated/taffy-rich-pack/processed/listening/listening-sheet-transparent.png', import.meta.url).href,
  thinking: new URL('../assets/pet/generated/taffy-rich-pack/processed/thinking/thinking-sheet-transparent.png', import.meta.url).href,
  greeting: new URL('../assets/pet/generated/taffy-rich-pack/processed/greeting/greeting-sheet-transparent.png', import.meta.url).href,
  typing: new URL('../assets/pet/generated/taffy-rich-pack/processed/typing/typing-sheet-transparent.png', import.meta.url).href,
  success: new URL('../assets/pet/generated/taffy-rich-pack/processed/success/success-sheet-transparent.png', import.meta.url).href,
  error: new URL('../assets/pet/generated/taffy-rich-pack/processed/error/error-sheet-transparent.png', import.meta.url).href,
  sleep: new URL('../assets/pet/generated/taffy-rich-pack/processed/sleep/sleep-sheet-transparent.png', import.meta.url).href,
  dragged: new URL('../assets/pet/generated/taffy-rich-pack/processed/dragged/dragged-sheet-transparent.png', import.meta.url).href,
  browser: new URL('../assets/pet/generated/taffy-rich-pack/processed/browser/browser-sheet-transparent.png', import.meta.url).href,
  approval_wait: new URL('../assets/pet/generated/taffy-rich-pack/processed/approval_wait/approval_wait-sheet-transparent.png', import.meta.url).href,
  dance: new URL('../assets/pet/generated/taffy-rich-pack/processed/dance/dance-sheet-transparent.png', import.meta.url).href
};

const statusAction: Record<AgentStatus, PetSpriteAction> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  planning: 'thinking',
  executing: 'typing',
  waiting_user: 'approval_wait',
  success: 'success',
  blocked: 'error',
  error: 'error'
};

const actionFps: Record<PetSpriteAction, number> = {
  idle: 8,
  listening: 8,
  thinking: 7,
  greeting: 9,
  typing: 10,
  success: 10,
  error: 8,
  sleep: 5,
  dragged: 10,
  browser: 9,
  approval_wait: 7,
  dance: 12
};

export function PetAvatar({
  status,
  message,
  bubbleVisible,
  bubblePinned,
  onBubbleClose,
  onBubblePinToggle,
  overrideAction
}: Props) {
  const action = overrideAction ?? statusAction[status];
  const spriteStyle = {
    '--sprite-sheet': `url("${spriteSheets[action]}")`,
    '--sprite-duration': `${8 / actionFps[action]}s`
  } as CSSProperties & Record<'--sprite-sheet' | '--sprite-duration', string>;

  return (
    <div className="pet-avatar" data-status={status} data-action={action} title="双击输入任务，拖动我移动位置">
      {bubbleVisible && (
        <div className={`speech ${bubblePinned ? 'pinned' : ''}`}>
          <span className="status-dot" aria-label={statusLabel[status]} title={statusLabel[status]} />
          <div className="speech-actions">
            <button
              className={bubblePinned ? 'active' : ''}
              type="button"
              title={bubblePinned ? '取消保持' : '保持气泡'}
              onClick={onBubblePinToggle}
            >
              <Pin size={12} />
            </button>
            <button type="button" title="关闭气泡" onClick={onBubbleClose}>
              <X size={13} />
            </button>
          </div>
          <p>{message}</p>
        </div>
      )}
      <div className="avatar-ring" aria-label="Taffy desktop pet">
        <div className="taffy-sprite" style={spriteStyle} />
      </div>
      <div className="signal-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}
