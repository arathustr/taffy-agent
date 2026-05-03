import type { ShellRunResult } from '../../../shared/contracts';
import { runProcess } from './processRunner';

export class ShellBridge {
  constructor(private readonly workspace: string) {}

  async run(command: string, timeoutMs = 120000): Promise<ShellRunResult> {
    const result = await runProcess({
      command: 'powershell',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
      cwd: this.workspace,
      timeoutMs,
      shell: false
    });

    return {
      ...result,
      command
    };
  }
}

