import { FormEvent, useEffect, useRef, useState } from 'react';
import { SendHorizontal } from 'lucide-react';
import type { ChatMessage } from '../../shared/contracts';

interface Props {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => Promise<void>;
}

export function ChatPanel({ messages, busy, onSend }: Props) {
  const [text, setText] = useState('');
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setText('');
    await onSend(value);
  }

  return (
    <div className="chat-panel">
      <div className="message-list" ref={scrollerRef}>
        {messages.map((message) => (
          <article className={`message ${message.role}`} key={message.id}>
            <div className="message-meta">{message.role === 'user' ? '你' : 'Taffy'}</div>
            <p>{message.content}</p>
          </article>
        ))}
      </div>
      <form className="composer" onSubmit={submit}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="说一句任务，比如：搜索 DeepSeek API 文档"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !text.trim()} title="发送">
          <SendHorizontal size={18} />
        </button>
      </form>
    </div>
  );
}

