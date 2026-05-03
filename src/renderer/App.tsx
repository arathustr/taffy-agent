import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardList,
  Images,
  MessageCircle,
  PanelRightOpen,
  SendHorizontal,
  Settings,
  TerminalSquare,
  X,
  Minus,
  Pin,
  Maximize2
} from 'lucide-react';
import { decideApproval, detectCodex, getSnapshot, onEvent, saveConfig, sendMessage, windowAction, windowDrag } from './api';
import { useTaffyStore } from './store';
import { PetAvatar } from './components/PetAvatar';
import { ChatPanel } from './components/ChatPanel';
import { TaskTimeline } from './components/TaskTimeline';
import { SettingsPanel } from './components/SettingsPanel';
import { LogPanel } from './components/LogPanel';
import { ApprovalCard } from './components/ApprovalCard';
import { SpriteStudioPanel } from './components/SpriteStudioPanel';
import { speakTaffyLine } from './voice';
import type { RuntimeConfig } from '../shared/contracts';

export function App() {
  const { snapshot, activeTab, events, setSnapshot, pushEvent, setActiveTab } = useTaffyStore();
  const [busy, setBusy] = useState(false);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickText, setQuickText] = useState('');
  const [petDragged, setPetDragged] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [bubblePinned, setBubblePinned] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);
  const dragPointerRef = useRef<number | null>(null);
  const dragMoveQueuedRef = useRef(false);
  const lastSpokenMessageIdRef = useRef<string | undefined>();
  const lastBubbleMessageIdRef = useRef<string | undefined>();

  useEffect(() => {
    let alive = true;
    const load = async (attempt = 0) => {
      try {
        const next = await getSnapshot();
        if (alive) setSnapshot(next);
      } catch {
        if (alive && attempt < 12) {
          window.setTimeout(() => void load(attempt + 1), 250);
        }
      }
    };
    void load();
    const unsubscribe = onEvent((event) => {
      pushEvent(event);
      void getSnapshot().then(setSnapshot);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [pushEvent, setSnapshot]);

  const latestBubbleMessage = useMemo(() => snapshot?.messages.at(-1), [snapshot?.messages]);
  const latestMessage = latestBubbleMessage?.content ?? '塔菲启动中...';

  useEffect(() => {
    if (quickOpen) {
      quickInputRef.current?.focus();
    }
  }, [quickOpen]);

  useEffect(() => {
    if (!latestBubbleMessage) return undefined;
    if (lastBubbleMessageIdRef.current !== latestBubbleMessage.id) {
      lastBubbleMessageIdRef.current = latestBubbleMessage.id;
      setBubbleVisible(true);
    }
    if (bubblePinned) return undefined;

    const timeout = window.setTimeout(() => setBubbleVisible(false), 10000);
    return () => window.clearTimeout(timeout);
  }, [latestBubbleMessage?.id, bubblePinned]);

  useEffect(() => {
    const currentSnapshot = snapshot;
    const latestAssistantMessage = currentSnapshot?.messages.filter((message) => message.role === 'assistant').at(-1);
    if (!latestAssistantMessage || !currentSnapshot?.config.voice.enabled) return;
    if (lastSpokenMessageIdRef.current === latestAssistantMessage.id) return;
    lastSpokenMessageIdRef.current = latestAssistantMessage.id;
    void speakTaffyLine(latestAssistantMessage.content, currentSnapshot.config.voice);
  }, [snapshot?.messages, snapshot?.config.voice]);

  function queueWindowDragMove() {
    if (dragMoveQueuedRef.current) return;
    dragMoveQueuedRef.current = true;
    window.requestAnimationFrame(() => {
      dragMoveQueuedRef.current = false;
      void windowDrag('move');
    });
  }

  function finishPetDrag(target: EventTarget | null, pointerId: number) {
    if (dragPointerRef.current !== pointerId) return;
    if (target instanceof HTMLElement && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    dragPointerRef.current = null;
    setPetDragged(false);
    void windowDrag('end');
  }

  async function handleSend(text: string) {
    setBusy(true);
    try {
      setSnapshot(await sendMessage({ text }));
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickSubmit(event: FormEvent) {
    event.preventDefault();
    const value = quickText.trim();
    if (!value || busy) return;
    setQuickText('');
    setQuickOpen(false);
    await handleSend(value);
  }

  async function handleApproval(id: string, decision: 'approve' | 'deny' | 'manual') {
    setBusy(true);
    try {
      setSnapshot(await decideApproval(id, decision));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveConfig(config: RuntimeConfig) {
    setSnapshot(await saveConfig(config));
  }

  async function handleDetectCodex() {
    await detectCodex();
    setSnapshot(await getSnapshot());
  }

  async function openWorkbench(tab = activeTab) {
    setActiveTab(tab);
    setWorkbenchOpen(true);
    await windowAction('workbench-mode');
  }

  async function closeWorkbench() {
    setWorkbenchOpen(false);
    await windowAction('pet-mode');
  }

  if (!snapshot) {
    return <div className="boot">永雏塔菲</div>;
  }

  return (
    <main className={`pet-app ${workbenchOpen ? 'workbench-open' : 'pet-only'} status-${snapshot.status}`}>
      <section
        className={`pet-surface ${petDragged ? 'dragging' : ''}`}
        onDoubleClick={() => setQuickOpen(true)}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          if (
            (event.target as HTMLElement).closest(
              'button,input,select,textarea,a,.speech,.pet-hotbar,.quick-composer,.approval-card'
            )
          ) {
            return;
          }
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          dragPointerRef.current = event.pointerId;
          setPetDragged(true);
          void windowDrag('start');
        }}
        onPointerMove={(event) => {
          if (dragPointerRef.current !== event.pointerId) return;
          queueWindowDragMove();
        }}
        onPointerCancel={(event) => finishPetDrag(event.currentTarget, event.pointerId)}
        onPointerUp={(event) => finishPetDrag(event.currentTarget, event.pointerId)}
        onLostPointerCapture={(event) => {
          if (dragPointerRef.current !== event.pointerId) return;
          dragPointerRef.current = null;
          setPetDragged(false);
          void windowDrag('end');
        }}
      >
        <PetAvatar
          status={snapshot.status}
          message={latestMessage}
          bubbleVisible={bubbleVisible}
          bubblePinned={bubblePinned}
          onBubbleClose={() => setBubbleVisible(false)}
          onBubblePinToggle={() => {
            setBubblePinned((value) => !value);
            setBubbleVisible(true);
          }}
          overrideAction={petDragged ? 'dragged' : quickOpen ? 'listening' : busy ? 'typing' : undefined}
        />

        <div className="pet-hotbar">
          <button title="输入" onClick={() => setQuickOpen((value) => !value)}>
            <MessageCircle size={16} />
          </button>
          <button title="工作台" onClick={() => openWorkbench('tasks')}>
            <PanelRightOpen size={16} />
          </button>
          <button title="置顶" onClick={() => windowAction('toggle-always-on-top')}>
            <Pin size={15} />
          </button>
          <button title="最小化" onClick={() => windowAction('minimize')}>
            <Minus size={15} />
          </button>
          <button title="退出" onClick={() => windowAction('close')}>
            <X size={15} />
          </button>
        </div>

        <form className={`quick-composer ${quickOpen || busy ? 'show' : ''}`} onSubmit={handleQuickSubmit}>
          <input
            ref={quickInputRef}
            value={quickText}
            disabled={busy}
            onChange={(event) => setQuickText(event.target.value)}
            placeholder="告诉塔菲"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuickOpen(false);
            }}
          />
          <button type="submit" disabled={busy || !quickText.trim()} title="发送">
            <SendHorizontal size={17} />
          </button>
        </form>

        {snapshot.pendingApproval && (
          <ApprovalCard approval={snapshot.pendingApproval} disabled={busy} onDecision={handleApproval} />
        )}
      </section>

      {workbenchOpen && (
        <aside className="workbench">
          <header className="workbench-header">
            <div>
              <strong>塔菲工作台</strong>
              <span>{snapshot.status}</span>
            </div>
            <div className="workbench-actions">
              <button title="放大" onClick={() => windowAction('workbench-mode')}>
                <Maximize2 size={15} />
              </button>
              <button title="收回桌宠" onClick={closeWorkbench}>
                <X size={16} />
              </button>
            </div>
          </header>

          <nav className="tabs" aria-label="Taffy panels">
            <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')} title="聊天">
              <MessageCircle size={17} />
            </button>
            <button className={activeTab === 'tasks' ? 'active' : ''} onClick={() => setActiveTab('tasks')} title="任务">
              <ClipboardList size={17} />
            </button>
            <button className={activeTab === 'logs' ? 'active' : ''} onClick={() => setActiveTab('logs')} title="日志">
              <TerminalSquare size={17} />
            </button>
            <button
              className={activeTab === 'sprites' ? 'active' : ''}
              onClick={() => setActiveTab('sprites')}
              title="精灵"
            >
              <Images size={17} />
            </button>
            <button
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={() => setActiveTab('settings')}
              title="设置"
            >
              <Settings size={17} />
            </button>
          </nav>

          <section className="panel">
            {activeTab === 'chat' && <ChatPanel messages={snapshot.messages} busy={busy} onSend={handleSend} />}
            {activeTab === 'tasks' && <TaskTimeline tasks={snapshot.tasks} status={snapshot.status} />}
            {activeTab === 'logs' && <LogPanel events={events} />}
            {activeTab === 'sprites' && <SpriteStudioPanel />}
            {activeTab === 'settings' && (
              <SettingsPanel snapshot={snapshot} onSave={handleSaveConfig} onDetectCodex={handleDetectCodex} />
            )}
          </section>
        </aside>
      )}
    </main>
  );
}
