import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import type { AgentEvent, RuntimeConfig, TaskRecord } from '../../shared/contracts';

interface PersistedState {
  config?: Partial<RuntimeConfig>;
  tasks?: TaskRecord[];
}

function mergeConfig(base: RuntimeConfig, override?: Partial<RuntimeConfig>): RuntimeConfig {
  if (!override) {
    return base;
  }

  const voice = { ...base.voice, ...override.voice };
  if (base.voice.referenceAudio && !voice.referenceAudio) {
    voice.referenceAudio = base.voice.referenceAudio;
  }
  if (base.voice.promptText && !voice.promptText) {
    voice.promptText = base.voice.promptText;
  }

  return {
    llm: { ...base.llm, ...override.llm },
    ui: { ...base.ui, ...override.ui },
    permissions: { ...base.permissions, ...override.permissions },
    voice
  };
}

export class RuntimeStore {
  private readonly dataDir: string;
  private readonly statePath: string;
  private readonly eventsPath: string;

  constructor(private readonly defaultConfig: RuntimeConfig) {
    this.dataDir = path.join(app.getPath('userData'), 'runtime');
    this.statePath = path.join(this.dataDir, 'state.json');
    this.eventsPath = path.join(this.dataDir, 'events.jsonl');
  }

  async ensure(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
  }

  async load(): Promise<{ config: RuntimeConfig; tasks: TaskRecord[] }> {
    await this.ensure();
    try {
      const raw = await fs.readFile(this.statePath, 'utf8');
      const parsed = JSON.parse(raw) as PersistedState;
      return {
        config: mergeConfig(this.defaultConfig, parsed.config),
        tasks: parsed.tasks ?? []
      };
    } catch {
      return {
        config: this.defaultConfig,
        tasks: []
      };
    }
  }

  async save(config: RuntimeConfig, tasks: TaskRecord[]): Promise<void> {
    await this.ensure();
    const state: PersistedState = { config: sanitizeConfig(config), tasks: tasks.slice(0, 80) };
    await fs.writeFile(this.statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  }

  async appendEvent(event: AgentEvent): Promise<void> {
    await this.ensure();
    await fs.appendFile(this.eventsPath, `${JSON.stringify(event)}\n`, 'utf8');
  }

  getEventsPath(): string {
    return this.eventsPath;
  }
}

function sanitizeConfig(config: RuntimeConfig): RuntimeConfig {
  return {
    ...config,
    llm: {
      ...config.llm,
      provider: config.llm.useMock ? 'mock' : config.llm.provider
    }
  };
}
