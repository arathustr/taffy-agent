import { AlertTriangle, Check, Hand, X } from 'lucide-react';
import type { ApprovalDecision, ApprovalRequest } from '../../shared/contracts';

interface Props {
  approval: ApprovalRequest;
  disabled: boolean;
  onDecision: (id: string, decision: ApprovalDecision) => Promise<void>;
}

export function ApprovalCard({ approval, disabled, onDecision }: Props) {
  return (
    <aside className={`approval-card risk-${approval.risk}`}>
      <header>
        <AlertTriangle size={18} />
        <h3>{approval.title}</h3>
      </header>
      <p>{approval.summary}</p>
      <ul>
        {approval.impact.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="approval-actions">
        <button disabled={disabled} onClick={() => onDecision(approval.id, 'approve')} title="允许">
          <Check size={16} />
          <span>允许</span>
        </button>
        <button disabled={disabled} onClick={() => onDecision(approval.id, 'manual')} title="我来处理">
          <Hand size={16} />
          <span>手动</span>
        </button>
        <button disabled={disabled} onClick={() => onDecision(approval.id, 'deny')} title="拒绝">
          <X size={16} />
          <span>拒绝</span>
        </button>
      </div>
    </aside>
  );
}

