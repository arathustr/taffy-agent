import { AlertCircle, CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import type { AgentStatus, TaskRecord } from '../../shared/contracts';

interface Props {
  tasks: TaskRecord[];
  status: AgentStatus;
}

export function TaskTimeline({ tasks, status }: Props) {
  if (!tasks.length) {
    return (
      <div className="empty-state">
        <Clock3 size={28} />
        <p>还没有任务。当前状态：{status}</p>
      </div>
    );
  }

  return (
    <div className="task-list">
      {tasks.map((task) => (
        <article className={`task-card risk-${task.risk}`} key={task.id}>
          <header>
            <div>
              <h3>{task.title}</h3>
              <p>{task.goal}</p>
            </div>
            <span className={`task-status ${task.status}`}>{task.status}</span>
          </header>
          <ol>
            {task.steps.map((step) => (
              <li key={step.id}>
                {step.status === 'completed' ? (
                  <CheckCircle2 size={15} />
                ) : step.status === 'failed' ? (
                  <AlertCircle size={15} />
                ) : step.status === 'running' ? (
                  <Loader2 className="spin" size={15} />
                ) : (
                  <Clock3 size={15} />
                )}
                <span>{step.title}</span>
                <em>{step.tool}</em>
              </li>
            ))}
          </ol>
          {task.summary && <p className="task-summary">{task.summary}</p>}
        </article>
      ))}
    </div>
  );
}

