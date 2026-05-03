import path from 'node:path';
import { BrowserWindow, app } from 'electron';
import type { BrowserSnapshot } from '../../../shared/contracts';
import { createId } from '../utils';

export class BrowserBridge {
  private window?: BrowserWindow;

  async openOrSearch(input: string): Promise<BrowserSnapshot> {
    const url = toUrl(input);
    await this.ensureWindow();
    await this.window!.loadURL(url);
    return this.snapshot();
  }

  async focus(): Promise<void> {
    await this.ensureWindow();
    this.window!.show();
    this.window!.focus();
  }

  async snapshot(): Promise<BrowserSnapshot> {
    await this.ensureWindow();
    const win = this.window!;
    const data = (await win.webContents.executeJavaScript(`
      (() => {
        const text = document.body?.innerText || '';
        const links = [...document.querySelectorAll('a')]
          .map(a => ({ text: (a.innerText || a.getAttribute('aria-label') || '').trim(), href: a.href }))
          .filter(a => a.text || a.href)
          .slice(0, 60);
        const buttons = [...document.querySelectorAll('button, [role="button"], input[type="submit"]')]
          .map(b => (b.innerText || b.value || b.getAttribute('aria-label') || '').trim())
          .filter(Boolean)
          .slice(0, 40);
        const forms = [...document.querySelectorAll('form')].slice(0, 20).map((form, index) => ({
          label: form.getAttribute('aria-label') || form.id || 'form-' + index,
          fields: [...form.querySelectorAll('input, textarea, select')]
            .map(field => field.getAttribute('name') || field.getAttribute('placeholder') || field.id || field.type || 'field')
            .slice(0, 20)
        }));
        const loginWords = /登录|登陆|sign in|log in|password|验证码|2fa|verify/i;
        return {
          url: location.href,
          title: document.title,
          visibleText: text.slice(0, 12000),
          loginState: loginWords.test(text) ? 'logged_out' : 'unknown',
          links,
          buttons,
          forms
        };
      })();
    `)) as Omit<BrowserSnapshot, 'screenshotPath'>;

    const screenshotPath = path.join(app.getPath('userData'), 'runtime', `${createId('browser')}.png`);
    await win.webContents.capturePage().then((image) => image.toPNG()).then((bytes) => import('node:fs/promises').then((fs) => fs.writeFile(screenshotPath, bytes)));

    return { ...data, screenshotPath };
  }

  private async ensureWindow(): Promise<void> {
    if (this.window && !this.window.isDestroyed()) {
      return;
    }

    this.window = new BrowserWindow({
      width: 1280,
      height: 900,
      title: 'Taffy Browser',
      show: true,
      webPreferences: {
        partition: 'persist:taffy-agent-browser',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });
  }
}

function toUrl(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/https?:\/\/\S+/i);
  if (urlMatch) return urlMatch[0];
  if (/^[\w.-]+\.[a-z]{2,}(\S*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return `https://www.bing.com/search?q=${encodeURIComponent(trimmed.replace(/^搜索/, '').trim())}`;
}

