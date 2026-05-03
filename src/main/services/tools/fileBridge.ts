import fs from 'node:fs/promises';
import path from 'node:path';

export class FileBridge {
  constructor(private readonly workspace: string) {}

  async list(relativePath = '.'): Promise<string[]> {
    const target = this.resolveInside(relativePath);
    const entries = await fs.readdir(target, { withFileTypes: true });
    return entries
      .filter((entry) => !['node_modules', '.git', 'dist', 'dist-electron'].includes(entry.name))
      .map((entry) => `${entry.isDirectory() ? '[dir] ' : '[file] '}${entry.name}`)
      .slice(0, 200);
  }

  async read(relativePath: string): Promise<string> {
    const target = this.resolveInside(relativePath);
    return fs.readFile(target, 'utf8');
  }

  async write(relativePath: string, content: string): Promise<void> {
    const target = this.resolveInside(relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf8');
  }

  private resolveInside(relativePath: string): string {
    const root = path.resolve(this.workspace);
    const target = path.resolve(root, relativePath);
    if (!target.startsWith(root)) {
      throw new Error('Refusing to access a path outside workspace');
    }
    return target;
  }
}

