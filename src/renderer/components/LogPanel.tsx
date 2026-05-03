import type { AgentEvent } from '../../shared/contracts';

interface Props {
  events: AgentEvent[];
}

export function LogPanel({ events }: Props) {
  if (!events.length) {
    return <div className="empty-state">暂无事件。</div>;
  }

  return (
    <div className="log-list">
      {events.map((event) => (
        <article className={`log-line ${event.level}`} key={event.id}>
          <time>{new Date(event.createdAt).toLocaleTimeString()}</time>
          <span>{event.type}</span>
          <p>{event.summary}</p>
        </article>
      ))}
    </div>
  );
}

