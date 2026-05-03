import { describe, expect, it } from 'vitest';
import { intentSchema } from '../shared/schemas';
import { MockProvider } from '../main/services/llm/mockProvider';
import { buildApproval, inferRisk } from '../main/services/policy';

describe('intent schema', () => {
  it('accepts a valid routed intent', () => {
    const parsed = intentSchema.parse({
      kind: 'codex',
      confidence: 0.9,
      goal: '修复按钮错位',
      risk: 'medium',
      requiresApproval: true,
      reason: 'programming task'
    });

    expect(parsed.kind).toBe('codex');
  });
});

describe('mock provider', () => {
  it('routes coding requests to codex', async () => {
    const provider = new MockProvider();
    const response = await provider.chat({
      json: true,
      messages: [{ role: 'user', content: '让 Codex 修复这个 React 项目' }]
    });

    expect(JSON.parse(response.content).kind).toBe('codex');
  });
});

describe('policy', () => {
  it('marks push commands as high risk', () => {
    expect(inferRisk('shell', 'git push origin main')).toBe('high');
  });

  it('builds a confirmation request for shell calls', () => {
    const approval = buildApproval(
      {
        id: 'call_1',
        taskId: 'task_1',
        tool: 'shell',
        action: 'npm install',
        args: { summary: 'npm install' },
        risk: 'medium',
        timeoutMs: 1000,
        requiresApproval: true
      },
      'task_1'
    );

    expect(approval.title).toContain('命令');
    expect(approval.choices).toContain('approve');
  });
});

