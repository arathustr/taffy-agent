import { useState } from 'react';
import { CheckCircle2, RefreshCcw, Save, Volume2 } from 'lucide-react';
import { speakTaffyLine } from '../voice';
import type { AgentSnapshot, RuntimeConfig } from '../../shared/contracts';

interface Props {
  snapshot: AgentSnapshot;
  onSave: (config: RuntimeConfig) => Promise<void>;
  onDetectCodex: () => Promise<void>;
}

const deepSeekModelOptions = [
  { value: 'deepseek-v4-flash', label: 'V4 Flash' },
  { value: 'deepseek-v4-pro', label: 'V4 Pro' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat' },
  { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }
];

const taffyVoiceEndpoint = 'https://xzjosh-taffy1-2-bert-vits2.ms.show';
const localGptSoVitsEndpoint = 'http://127.0.0.1:9880/tts';

export function SettingsPanel({ snapshot, onSave, onDetectCodex }: Props) {
  const [config, setConfig] = useState<RuntimeConfig>(snapshot.config);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave(config);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-panel">
      <section>
        <h3>模型</h3>
        <label>
          <span>Mock 模式</span>
          <input
            type="checkbox"
            checked={config.llm.useMock}
            onChange={(event) =>
              setConfig({
                ...config,
                llm: { ...config.llm, useMock: event.target.checked, provider: event.target.checked ? 'mock' : 'deepseek' }
              })
            }
          />
        </label>
        <div className="model-switcher" role="group" aria-label="DeepSeek quick model">
          <button
            className={config.llm.defaultModel === 'deepseek-v4-flash' ? 'active' : ''}
            onClick={() => setConfig({ ...config, llm: { ...config.llm, defaultModel: 'deepseek-v4-flash' } })}
          >
            Flash
          </button>
          <button
            className={config.llm.defaultModel === 'deepseek-v4-pro' ? 'active' : ''}
            onClick={() => setConfig({ ...config, llm: { ...config.llm, defaultModel: 'deepseek-v4-pro' } })}
          >
            Pro
          </button>
        </div>
        <label>
          <span>响应模型</span>
          <select
            value={config.llm.defaultModel}
            onChange={(event) => setConfig({ ...config, llm: { ...config.llm, defaultModel: event.target.value } })}
          >
            {deepSeekModelOptions.map((model) => (
              <option value={model.value} key={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>高级模型</span>
          <select
            value={config.llm.advancedModel}
            onChange={(event) => setConfig({ ...config, llm: { ...config.llm, advancedModel: event.target.value } })}
          >
            {deepSeekModelOptions.map((model) => (
              <option value={model.value} key={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h3>工具</h3>
        <label>
          <span>CodexBridge</span>
          <input
            type="checkbox"
            checked={config.permissions.allowCodex}
            onChange={(event) =>
              setConfig({ ...config, permissions: { ...config.permissions, allowCodex: event.target.checked } })
            }
          />
        </label>
        <label>
          <span>BrowserBridge</span>
          <input
            type="checkbox"
            checked={config.permissions.allowBrowser}
            onChange={(event) =>
              setConfig({ ...config, permissions: { ...config.permissions, allowBrowser: event.target.checked } })
            }
          />
        </label>
        <label>
          <span>ShellBridge</span>
          <input
            type="checkbox"
            checked={config.permissions.allowShell}
            onChange={(event) =>
              setConfig({ ...config, permissions: { ...config.permissions, allowShell: event.target.checked } })
            }
          />
        </label>
        <button className="inline-action" onClick={onDetectCodex}>
          <RefreshCcw size={15} />
          <span>检测 Codex</span>
        </button>
        <div className="health">
          <CheckCircle2 size={15} />
          <span>Codex：{snapshot.codexAvailable ? '可用' : '未检测到'}</span>
        </div>
      </section>

      <section>
        <h3>语音</h3>
        <label>
          <span>TTS</span>
          <input
            type="checkbox"
            checked={config.voice.enabled}
            onChange={(event) => setConfig({ ...config, voice: { ...config.voice, enabled: event.target.checked } })}
          />
        </label>
        <label>
          <span>音源</span>
          <select
            value={config.voice.provider}
            onChange={(event) =>
              setConfig({
                ...config,
                voice: {
                  ...config.voice,
                  provider: event.target.value as RuntimeConfig['voice']['provider'],
                  endpoint:
                    event.target.value === 'taffy-bert-vits2'
                      ? taffyVoiceEndpoint
                      : event.target.value === 'gpt-sovits'
                        ? localGptSoVitsEndpoint
                        : config.voice.endpoint,
                  enabled: event.target.value !== 'none' && config.voice.enabled
                }
              })
            }
          >
            <option value="taffy-bert-vits2">塔菲 Bert-VITS2</option>
            <option value="system">系统语音</option>
            <option value="gpt-sovits">GPT-SoVITS</option>
            <option value="fish-audio">Fish Audio</option>
            <option value="none">关闭</option>
          </select>
        </label>
        <label>
          <span>实时分句</span>
          <input
            type="checkbox"
            checked={config.voice.realtime}
            disabled={config.voice.provider === 'system' || config.voice.provider === 'none'}
            onChange={(event) => setConfig({ ...config, voice: { ...config.voice, realtime: event.target.checked } })}
          />
        </label>
        <label>
          <span>缓存短句</span>
          <input
            type="checkbox"
            checked={config.voice.cache}
            disabled={config.voice.provider === 'system' || config.voice.provider === 'none'}
            onChange={(event) => setConfig({ ...config, voice: { ...config.voice, cache: event.target.checked } })}
          />
        </label>
        <label>
          <span>切句长度 {config.voice.chunkChars ?? 52}</span>
          <input
            type="range"
            min="24"
            max="120"
            step="4"
            value={config.voice.chunkChars ?? 52}
            disabled={config.voice.provider === 'system' || config.voice.provider === 'none'}
            onChange={(event) =>
              setConfig({ ...config, voice: { ...config.voice, chunkChars: Number(event.target.value) } })
            }
          />
        </label>
        <label>
          <span>语速 {(config.voice.speed ?? 1).toFixed(2)}x</span>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.05"
            value={config.voice.speed ?? 1}
            disabled={config.voice.provider === 'system' || config.voice.provider === 'none'}
            onChange={(event) =>
              setConfig({ ...config, voice: { ...config.voice, speed: Number(event.target.value) } })
            }
          />
        </label>
        <label>
          <span>音量 {Math.round((config.voice.volume ?? 0.78) * 100)}%</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={config.voice.volume ?? 0.78}
            onChange={(event) =>
              setConfig({ ...config, voice: { ...config.voice, volume: Number(event.target.value) } })
            }
          />
        </label>
        <input
          value={config.voice.endpoint}
          disabled={config.voice.provider === 'system' || config.voice.provider === 'none'}
          onChange={(event) => setConfig({ ...config, voice: { ...config.voice, endpoint: event.target.value } })}
        />
        {config.voice.provider === 'gpt-sovits' && (
          <>
            <input
              value={config.voice.referenceAudio}
              placeholder="参考音频路径，GPT-SoVITS 必填"
              onChange={(event) =>
                setConfig({ ...config, voice: { ...config.voice, referenceAudio: event.target.value } })
              }
            />
            <input
              value={config.voice.promptText}
              placeholder="参考音频对应文本，建议填写"
              onChange={(event) => setConfig({ ...config, voice: { ...config.voice, promptText: event.target.value } })}
            />
          </>
        )}
        <button className="inline-action" onClick={() => speakTaffyLine('塔菲在这里。', { ...config.voice, enabled: true })}>
          <Volume2 size={15} />
          <span>试听</span>
        </button>
      </section>

      <button className="save-button" disabled={saving} onClick={save}>
        <Save size={16} />
        <span>{saving ? '保存中' : '保存设置'}</span>
      </button>
    </div>
  );
}
