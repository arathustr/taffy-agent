import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, PackageCheck, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { generateSprites } from '../api';
import type {
  SpriteActionName,
  SpriteCanvasSize,
  SpriteFramePreset,
  SpritePixelStyle,
  SpriteStudioActionResult,
  SpriteStudioGenerateResult
} from '../../shared/contracts';

const ACTION_LABELS: Array<{ name: SpriteActionName; label: string }> = [
  { name: 'idle', label: '待机' },
  { name: 'listening', label: '聆听' },
  { name: 'thinking', label: '思考' },
  { name: 'typing', label: '敲字' },
  { name: 'executing', label: '执行' },
  { name: 'waiting_user', label: '等待' },
  { name: 'success', label: '完成' },
  { name: 'error', label: '出错' },
  { name: 'sleep', label: '休眠' },
  { name: 'dragged', label: '拖动' }
];

const DEFAULT_ACTIONS: SpriteActionName[] = ['idle', 'thinking', 'typing', 'success', 'error'];

export function SpriteStudioPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [objectUrl, setObjectUrl] = useState<string>();
  const [characterName, setCharacterName] = useState('Taffy Reference');
  const [canvasSize, setCanvasSize] = useState<SpriteCanvasSize>(192);
  const [framePreset, setFramePreset] = useState<SpriteFramePreset>('standard');
  const [pixelStyle, setPixelStyle] = useState<SpritePixelStyle>('clean-chibi');
  const [actions, setActions] = useState<SpriteActionName[]>(DEFAULT_ACTIONS);
  const [result, setResult] = useState<SpriteStudioGenerateResult>();
  const [activeAction, setActiveAction] = useState<SpriteActionName>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const pasted = Array.from(event.clipboardData?.files ?? []).find((item) => item.type.startsWith('image/'));
      if (!pasted) return;
      event.preventDefault();
      acceptFile(pasted);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [characterName]);

  const selectedAction = useMemo(
    () => result?.actions.find((action) => action.name === activeAction) ?? result?.actions[0],
    [activeAction, result?.actions]
  );

  async function generate(fileToUse = file) {
    if (!fileToUse || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const imageData = await fileToUse.arrayBuffer();
      const next = await generateSprites({
        fileName: fileToUse.name,
        imageData,
        options: {
          characterName,
          canvasSize,
          framePreset,
          pixelStyle,
          actions
        }
      });
      setResult(next);
      setActiveAction(next.actions[0]?.name ?? 'idle');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0];
    if (!next) return;
    acceptFile(next);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const next = event.dataTransfer.files?.[0];
    if (!next || !next.type.startsWith('image/')) return;
    acceptFile(next);
  }

  function acceptFile(next: File) {
    setFile(next);
    setResult(undefined);
    if (!characterName.trim() || characterName === 'Taffy Reference') {
      setCharacterName(nameFromFile(next.name));
    }
  }

  function toggleAction(action: SpriteActionName) {
    setActions((current) => {
      if (action === 'idle') return current.includes('idle') ? current : ['idle', ...current];
      if (current.includes(action)) return current.filter((item) => item !== action);
      return [...current, action];
    });
  }

  return (
    <div className="sprite-studio">
      <section className="sprite-config">
        <div
          className={`sprite-dropzone ${file ? 'has-file' : ''}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} />
          {objectUrl ? (
            <img src={objectUrl} alt="" />
          ) : (
            <div className="drop-placeholder">
              <ImagePlus size={28} />
              <span>导入主图</span>
            </div>
          )}
        </div>

        <div className="sprite-fields">
          <label>
            <span>角色名</span>
            <input value={characterName} onChange={(event) => setCharacterName(event.target.value)} />
          </label>
          <label>
            <span>尺寸</span>
            <select value={canvasSize} onChange={(event) => setCanvasSize(Number(event.target.value) as SpriteCanvasSize)}>
              <option value={128}>128</option>
              <option value={192}>192</option>
              <option value={256}>256</option>
            </select>
          </label>
          <label>
            <span>帧数</span>
            <select value={framePreset} onChange={(event) => setFramePreset(event.target.value as SpriteFramePreset)}>
              <option value="compact">fast</option>
              <option value="standard">std</option>
              <option value="rich">rich</option>
            </select>
          </label>
          <label>
            <span>风格</span>
            <select value={pixelStyle} onChange={(event) => setPixelStyle(event.target.value as SpritePixelStyle)}>
              <option value="clean-chibi">chibi</option>
              <option value="crisp-outline">outline</option>
              <option value="soft-chibi">soft</option>
              <option value="rpg">rpg</option>
            </select>
          </label>
        </div>

        <div className="action-chips">
          {ACTION_LABELS.map((action) => (
            <button
              key={action.name}
              className={actions.includes(action.name) ? 'active' : ''}
              disabled={action.name === 'idle'}
              onClick={() => toggleAction(action.name)}
            >
              {action.label}
            </button>
          ))}
        </div>

        <button className="sprite-generate" disabled={!file || busy} onClick={() => generate()}>
          {busy ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}
          <span>{busy ? '生成中' : '生成资源包'}</span>
        </button>
      </section>

      <section className="sprite-preview-panel">
        {selectedAction ? (
          <>
            <div className="sprite-preview-stage">
              <AnimatedSprite action={selectedAction} />
            </div>
            <div className="sprite-action-tabs">
              {result?.actions.map((action) => (
                <button
                  key={action.name}
                  className={activeAction === action.name ? 'active' : ''}
                  onClick={() => setActiveAction(action.name)}
                >
                  {ACTION_LABELS.find((item) => item.name === action.name)?.label ?? action.name}
                </button>
              ))}
            </div>
            <img className="sprite-sheet" src={selectedAction.sheetDataUrl} alt="" />
          </>
        ) : (
          <div className="sprite-empty">
            <Upload size={30} />
            <span>等待资源</span>
          </div>
        )}
      </section>

      <section className="sprite-report">
        {result ? (
          <>
            <header>
              <PackageCheck size={18} />
              <div>
                <strong>{result.displayName}</strong>
                <span>{result.report.releaseReady ? 'release-ready' : 'needs-review'}</span>
              </div>
            </header>
            <dl>
              <div>
                <dt>动作</dt>
                <dd>{result.actions.length}</dd>
              </div>
              <div>
                <dt>透明</dt>
                <dd>{Math.round(result.report.metrics.minAlphaCleanliness * 100)}%</dd>
              </div>
              <div>
                <dt>重抽</dt>
                <dd>{result.report.metrics.regenerations}</dd>
              </div>
            </dl>
            <button className="inline-action" disabled={!file || busy} onClick={() => generate()}>
              <RefreshCw size={15} />
              重新生成
            </button>
            <p className="sprite-path" title={result.exportPath}>
              {compactPath(result.exportPath)}
            </p>
          </>
        ) : (
          <p className="sprite-muted">本地流水线会输出透明帧、sprite sheet、manifest 和 QA 报告。</p>
        )}
        {error && <p className="sprite-error">{error}</p>}
      </section>
    </div>
  );
}

function AnimatedSprite({ action }: { action: SpriteStudioActionResult }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    const interval = window.setInterval(() => {
      setFrame((value) => (value + 1) % action.frames.length);
    }, Math.max(40, Math.round(1000 / action.fps)));
    return () => window.clearInterval(interval);
  }, [action]);

  return <img src={action.frames[frame] ?? action.frames[0]} alt="" />;
}

function nameFromFile(fileName: string): string {
  return fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim() || 'Imported Character';
}

function compactPath(value: string): string {
  if (value.length <= 72) return value;
  const parts = value.split(/[\\/]/).filter(Boolean);
  return `...\\${parts.slice(-4).join('\\')}`;
}
