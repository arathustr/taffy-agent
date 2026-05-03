import type { ApprovalRequest, RiskLevel, ToolCall } from '../../shared/contracts';
import { nowIso } from '../../shared/time';
import { createId } from './utils';

const highRiskActions = ['delete', 'remove', 'push', 'publish', 'payment', 'submit', 'login', 'upload'];

export function inferRisk(tool: ToolCall['tool'], action: string): RiskLevel {
  const lower = `${tool}:${action}`.toLowerCase();
  if (highRiskActions.some((word) => lower.includes(word))) {
    return 'high';
  }
  if (tool === 'shell' || tool === 'codex') {
    return 'medium';
  }
  if (tool === 'file') {
    return 'medium';
  }
  return 'low';
}

export function needsApproval(call: ToolCall): boolean {
  if (call.risk === 'high' || call.risk === 'critical') {
    return true;
  }
  if (call.tool === 'shell' || call.tool === 'codex') {
    return true;
  }
  if (call.tool === 'file' && ['write', 'delete', 'move'].includes(call.action)) {
    return true;
  }
  return call.requiresApproval;
}

export function buildApproval(call: ToolCall, taskId: string): ApprovalRequest {
  const impact = describeImpact(call);
  return {
    id: createId('approval'),
    taskId,
    toolCallId: call.id,
    title: titleFor(call),
    summary: String(call.args.summary ?? call.action),
    impact,
    reversible: call.risk !== 'critical' && !impact.some((line) => line.includes('不可撤销')),
    choices: ['approve', 'deny', 'manual'],
    risk: call.risk,
    expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString()
  };
}

function titleFor(call: ToolCall): string {
  if (call.tool === 'codex') return '启动 Codex 执行任务';
  if (call.tool === 'shell') return '即将运行本地命令';
  if (call.tool === 'browser') return '即将操作浏览器';
  if (call.tool === 'file') return '即将修改文件';
  return `即将执行 ${call.action}`;
}

function describeImpact(call: ToolCall): string[] {
  if (call.tool === 'codex') {
    return ['会把任务交给本机 Codex', 'Codex 会使用自己的账号和权限', '可能修改当前工作区文件'];
  }
  if (call.tool === 'shell') {
    return ['会在本机运行命令', '可能改变当前项目文件或安装依赖'];
  }
  if (call.tool === 'browser') {
    return ['会打开浏览器窗口', '登录、验证码或提交表单会交给你确认'];
  }
  if (call.tool === 'file') {
    return ['会读取或写入本地文件', '不会访问工作区外路径'];
  }
  return [`动作创建于 ${nowIso()}`];
}

