import path from 'node:path';
import fs from 'node:fs';
import { app, BrowserWindow, ipcMain, nativeTheme, screen } from 'electron';
import type { ApprovalDecision, RuntimeConfig, UserCommand } from '../shared/contracts';
import { loadRuntimeConfig } from './env';
import { AgentService } from './services/agentService';
import { RuntimeStore } from './services/runtimeStore';
import { SpriteStudioService } from './services/spriteStudioService';

let mainWindow: BrowserWindow | undefined;
let agent: AgentService | undefined;
let spriteStudio: SpriteStudioService | undefined;
let dragSession:
  | {
      startPoint: Electron.Point;
      startBounds: Electron.Rectangle;
    }
  | undefined;

function logWindow(message: string): void {
  if (process.env.TAFFY_DEBUG_WINDOW !== 'true') return;
  try {
    const dir = path.join(app.getPath('userData'), 'runtime');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'window-load.log'), `${new Date().toISOString()} ${message}\n`, 'utf8');
  } catch {
    // Diagnostics must never break app startup.
  }
}

async function createMainWindow(): Promise<void> {
  nativeTheme.themeSource = 'dark';
  const workArea = screen.getPrimaryDisplay().workArea;
  const petWidth = 360;
  const petHeight = 430;

  mainWindow = new BrowserWindow({
    x: Math.max(workArea.x, workArea.x + workArea.width - petWidth - 24),
    y: Math.max(workArea.y, workArea.y + workArea.height - petHeight - 24),
    width: petWidth,
    height: petHeight,
    minWidth: 280,
    minHeight: 320,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: '永雏塔菲',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  raisePetWindow();
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    logWindow(`did-fail-load code=${code} description=${description} url=${url}`);
  });
  mainWindow.webContents.on('did-finish-load', () => {
    logWindow('did-finish-load');
    raisePetWindow();
    void mainWindow?.webContents
      .executeJavaScript(
        `JSON.stringify({ href: location.href, hasRoot: Boolean(document.querySelector('#root')), text: document.body?.innerText?.slice(0, 120) || '', htmlLength: document.body?.innerHTML?.length || 0 })`
      )
      .then((result) => logWindow(`page=${result}`))
      .catch((error) => logWindow(`page-check-error=${error instanceof Error ? error.message : String(error)}`));
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    logWindow(`loadURL ${devUrl}`);
    await mainWindow.loadURL(devUrl);
  } else {
    const filePath = path.join(app.getAppPath(), 'dist', 'index.html');
    logWindow(`loadFile ${filePath}`);
    await mainWindow.loadFile(filePath);
  }
}

function raisePetWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.showInactive();
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.moveTop();
}

async function bootstrap(): Promise<void> {
  const defaultConfig = loadRuntimeConfig();
  const store = new RuntimeStore(defaultConfig);
  agent = new AgentService(defaultConfig, store);
  spriteStudio = new SpriteStudioService(path.join(app.getPath('userData'), 'sprite-studio'));
  await agent.init();

  agent.on('event', (event) => {
    mainWindow?.webContents.send('agent:event', event);
  });

  registerIpc();
  await createMainWindow();
}

function registerIpc(): void {
  ipcMain.handle('agent:get-snapshot', () => agent?.snapshot());
  ipcMain.handle('agent:send-message', (_event, command: UserCommand) => agent?.handleUserMessage(command));
  ipcMain.handle('agent:approval', (_event, id: string, decision: ApprovalDecision) => agent?.decideApproval(id, decision));
  ipcMain.handle('agent:save-config', (_event, config: RuntimeConfig) => agent?.saveConfig(config));
  ipcMain.handle('agent:detect-codex', () => agent?.detectCodex());
  ipcMain.handle('sprite:generate', (_event, request) => spriteStudio?.generate(request));
  ipcMain.handle('window:drag', (_event, phase: 'start' | 'move' | 'end') => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (phase === 'start') {
      dragSession = {
        startPoint: screen.getCursorScreenPoint(),
        startBounds: mainWindow.getBounds()
      };
      return;
    }
    if (phase === 'end') {
      dragSession = undefined;
      return;
    }
    if (!dragSession) return;

    const currentPoint = screen.getCursorScreenPoint();
    const x = dragSession.startBounds.x + currentPoint.x - dragSession.startPoint.x;
    const y = dragSession.startBounds.y + currentPoint.y - dragSession.startPoint.y;
    mainWindow.setPosition(Math.round(x), Math.round(y), false);
  });
  ipcMain.handle('window:action', async (_event, action: string) => {
    if (!mainWindow) return;
    if (action === 'minimize') mainWindow.minimize();
    if (action === 'close') app.quit();
    if (action === 'toggle-always-on-top') mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
    if (action === 'focus-browser') await agent?.focusBrowser();
    if (action === 'pet-mode') {
      mainWindow.setResizable(true);
      mainWindow.setSize(360, 430, true);
      const currentArea = screen.getDisplayMatching(mainWindow.getBounds()).workArea;
      const bounds = mainWindow.getBounds();
      mainWindow.setPosition(
        Math.min(bounds.x, currentArea.x + currentArea.width - 360 - 24),
        Math.min(bounds.y, currentArea.y + currentArea.height - 430 - 24),
        true
      );
    }
    if (action === 'workbench-mode') {
      mainWindow.setResizable(true);
      mainWindow.setSize(880, 660, true);
      mainWindow.focus();
    }
  });
}

app.whenReady().then(bootstrap).catch((error) => {
  console.error(error);
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createMainWindow();
  }
});
