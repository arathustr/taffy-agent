import type { CodexHandoff, CodexRunResult } from '../../../shared/contracts';
import { runProcess } from './processRunner';
import { truncate } from '../utils';

export class CodexBridge {
  constructor(private readonly workspace: string) {}

  async detect(): Promise<boolean> {
    const result = await runProcess({
      command: 'codex',
      args: ['--version'],
      cwd: this.workspace,
      timeoutMs: 15000,
      shell: true
    });
    return result.exitCode === 0;
  }

  buildHandoff(goal: string, context = ''): CodexHandoff {
    return {
      workspace: this.workspace,
      goal,
      prompt: [
        '你是 Codex，请在当前工作区完成以下任务。',
        '',
        `目标：${goal}`,
        '',
        '约束：',
        '- 先理解项目结构，再修改。',
        '- 不读取、不保存、不输出任何密钥或登录凭据。',
        '- 不改无关文件。',
        '- 完成后运行相关验证。',
        '- 最后总结修改、验证和剩余风险。',
        '',
        context ? `已知上下文：\n${context}` : ''
      ]
        .filter(Boolean)
        .join('\n'),
      constraints: ['不接管 Codex 账号', '不越权修改无关文件', '完成后验证'],
      expectedVerification: ['npm test', 'npm run build'],
      risk: 'medium'
    };
  }

  async run(handoff: CodexHandoff): Promise<CodexRunResult> {
    const available = await this.detect();
    if (!available) {
      return {
        available: false,
        stdout: '',
        stderr: 'Codex CLI is not available or not logged in.',
        summary: '没有检测到可用的 Codex。请先安装或登录 Codex。'
      };
    }

    const result = await runProcess({
      command: 'codex',
      args: [
        'exec',
        '--json',
        '--skip-git-repo-check',
        '--sandbox',
        'workspace-write',
        '--ask-for-approval',
        'never',
        '--cd',
        this.workspace,
        '-'
      ],
      cwd: this.workspace,
      input: handoff.prompt,
      timeoutMs: 20 * 60 * 1000,
      shell: true
    });

    return {
      available: true,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      summary: summarizeCodexOutput(result.stdout, result.stderr, result.exitCode)
    };
  }
}

function summarizeCodexOutput(stdout: string, stderr: string, exitCode: number | null): string {
  if (exitCode === 0) {
    const lastMessage = extractLastMessage(stdout);
    return lastMessage || 'Codex 任务完成。';
  }
  return `Codex 任务未成功结束，退出码 ${exitCode ?? 'unknown'}。\n${truncate(stderr || stdout, 1600)}`;
}

function extractLastMessage(stdout: string): string {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const line of lines.reverse()) {
    try {
      const parsed = JSON.parse(line) as { msg?: string; message?: string; type?: string };
      const content = parsed.msg || parsed.message;
      if (content && /assistant|message|final/i.test(parsed.type ?? 'message')) {
        return truncate(content, 1800);
      }
    } catch {
      if (line.length > 40 && !line.startsWith('{')) return truncate(line, 1800);
    }
  }
  return '';
}

