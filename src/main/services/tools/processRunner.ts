import { spawn } from 'node:child_process';
import { truncate } from '../utils';

interface RunOptions {
  command: string;
  args?: string[];
  cwd: string;
  timeoutMs?: number;
  input?: string;
  shell?: boolean;
}

export async function runProcess(options: RunOptions): Promise<{
  exitCode: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn(options.command, options.args ?? [], {
      cwd: options.cwd,
      shell: options.shell ?? false,
      windowsHide: true,
      env: process.env
    });

    let stdout = '';
    let stderr = '';
    let finished = false;
    const timeout = setTimeout(() => {
      if (!finished) {
        stderr += `\nProcess timed out after ${options.timeoutMs}ms`;
        child.kill();
      }
    }, options.timeoutMs ?? 120000);

    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve({ exitCode: null, stdout: truncate(stdout), stderr: truncate(`${stderr}\n${error.message}`) });
    });

    child.on('close', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve({ exitCode: code, stdout: truncate(stdout), stderr: truncate(stderr) });
    });

    if (options.input) {
      child.stdin?.write(options.input);
      child.stdin?.end();
    }
  });
}

