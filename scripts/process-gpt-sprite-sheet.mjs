import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = parseArgs(process.argv.slice(2));
const input = must(args.input, '--input');
const outDir = must(args.outDir, '--out-dir');
const action = args.action ?? 'action';
const frames = Number(args.frames ?? 8);
const frameSize = Number(args.frameSize ?? 256);
const key = hexToRgb(args.key ?? '#00ff00');

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true });

const source = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data, info } = source;
const cells = detectCells(data, info.width, info.height, key, frames);
const frameBuffers = [];

for (let i = 0; i < frames; i += 1) {
  const cell = cells[i];
  const crop = await sharp(input)
    .extract({
      left: cell.left,
      top: cell.top,
      width: cell.width,
      height: cell.height
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const keyed = chromaKeyAndDespill(Buffer.from(crop.data), crop.info.width, crop.info.height, key);
  const bbox = alphaBounds(keyed, crop.info.width, crop.info.height);
  const extracted = await sharp(keyed, { raw: { width: crop.info.width, height: crop.info.height, channels: 4 } })
    .extract(bbox)
    .resize({ width: Math.round(frameSize * 0.92), height: Math.round(frameSize * 0.92), fit: 'inside', kernel: 'nearest' })
    .png()
    .toBuffer();
  const meta = await sharp(extracted).metadata();
  const frame = await sharp({
    create: {
      width: frameSize,
      height: frameSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      {
        input: extracted,
        left: Math.round((frameSize - (meta.width ?? frameSize)) / 2),
        top: Math.round(frameSize - (meta.height ?? frameSize) - Math.max(6, Math.round(frameSize * 0.03)))
      }
    ])
    .png()
    .toBuffer();

  const framePath = path.join(outDir, 'frames', `frame-${String(i).padStart(3, '0')}.png`);
  fs.writeFileSync(framePath, frame);
  frameBuffers.push(frame);
}

const sheetPath = path.join(outDir, `${action}-sheet-transparent.png`);
await sharp({
  create: {
    width: frameSize * frames,
    height: frameSize,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
})
  .composite(frameBuffers.map((inputBuffer, index) => ({ input: inputBuffer, left: index * frameSize, top: 0 })))
  .png()
  .toFile(sheetPath);

const checkerPath = path.join(outDir, `${action}-sheet-checker.png`);
await makeCheckerPreview(sheetPath, checkerPath, frameSize * frames, frameSize);
const htmlPath = path.join(outDir, 'preview.html');
writePreviewHtml(htmlPath, action, frames);
const quality = await collectQuality(outDir, frames, frameSize, key);

const report = {
  input: path.resolve(input),
  action,
  frames,
  frameSize,
  sourceSize: { width: info.width, height: info.height },
  detectedCells: cells,
  sheetPath,
  checkerPath,
  htmlPath,
  alphaCorners: quality[0]?.alphaCorners ?? [0, 0, 0, 0],
  greenResidue: Math.max(...quality.map((item) => item.greenResidue)),
  quality
};
fs.writeFileSync(path.join(outDir, 'process-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));

function parseArgs(argv) {
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const keyName = item.slice(2).replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
    parsed[keyName] = argv[i + 1];
    i += 1;
  }
  return parsed;
}

function must(value, name) {
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function hexToRgb(hex) {
  const clean = hex.replace(/^#/, '');
  return [Number.parseInt(clean.slice(0, 2), 16), Number.parseInt(clean.slice(2, 4), 16), Number.parseInt(clean.slice(4, 6), 16)];
}

function detectCells(raw, width, height, keyColor, frameCount) {
  const greenYBands = findBands(raw, width, height, keyColor, 'y', null)
    .filter((band) => band.end - band.start + 1 >= Math.max(36, height * 0.08));
  const yBands = splitBandsByWhiteSeparators(raw, width, greenYBands)
    .filter((band) => band.end - band.start + 1 >= Math.max(36, height * 0.08));
  const cells = [];

  for (const yBand of yBands) {
    const xBands = rangesBetweenWhiteColumns(raw, width, yBand);
    const fallbackXBands = findBands(raw, width, height, keyColor, 'x', yBand)
      .filter((band) => band.end - band.start + 1 >= Math.max(36, width * 0.035));
    for (const xBand of (xBands.length > 1 ? xBands : fallbackXBands)) {
      cells.push(insetCell({
        left: xBand.start,
        top: yBand.start,
        width: xBand.end - xBand.start + 1,
        height: yBand.end - yBand.start + 1
      }, width, height, 3));
    }
  }

  if (cells.length >= frameCount) return cells.slice(0, frameCount);
  return fallbackCells(width, height, yBands.length ? yBands : greenYBands, frameCount);
}

function findBands(raw, width, height, keyColor, axis, yBand) {
  const limit = axis === 'y' ? height : width;
  const samples = axis === 'y' ? width : yBand.end - yBand.start + 1;
  const threshold = samples * (axis === 'y' ? 0.12 : 0.06);
  const positions = [];

  for (let position = 0; position < limit; position += 1) {
    let count = 0;
    if (axis === 'y') {
      for (let x = 0; x < width; x += 2) {
        const offset = (position * width + x) * 4;
        if (isKeyLike(raw[offset], raw[offset + 1], raw[offset + 2], keyColor)) count += 2;
      }
    } else {
      for (let y = yBand.start; y <= yBand.end; y += 2) {
        const offset = (y * width + position) * 4;
        if (isKeyLike(raw[offset], raw[offset + 1], raw[offset + 2], keyColor)) count += 2;
      }
    }
    if (count >= threshold) positions.push(position);
  }

  return groupPositions(positions, axis === 'y' ? 1 : 2);
}

function splitBandsByWhiteSeparators(raw, width, bands) {
  const split = [];
  for (const band of bands) {
    const separators = [];
    for (let y = band.start; y <= band.end; y += 1) {
      let white = 0;
      for (let x = 0; x < width; x += 2) {
        const offset = (y * width + x) * 4;
        if (isWhite(raw[offset], raw[offset + 1], raw[offset + 2])) white += 2;
      }
      if (white > width * 0.68) separators.push(y);
    }
    split.push(...rangesBetweenSeparators(band.start, band.end, groupPositions(separators, 1)));
  }
  return split;
}

function rangesBetweenWhiteColumns(raw, width, yBand) {
  const separators = [];
  const bandHeight = yBand.end - yBand.start + 1;
  for (let x = 0; x < width; x += 1) {
    let white = 0;
    for (let y = yBand.start; y <= yBand.end; y += 2) {
      const offset = (y * width + x) * 4;
      if (isWhite(raw[offset], raw[offset + 1], raw[offset + 2])) white += 2;
    }
    if (white > bandHeight * 0.68) separators.push(x);
  }
  return rangesBetweenSeparators(0, width - 1, groupPositions(separators, 1))
    .filter((band) => band.end - band.start + 1 >= Math.max(36, width * 0.03));
}

function rangesBetweenSeparators(start, end, separators) {
  const ranges = [];
  let cursor = start;
  for (const separator of separators) {
    if (separator.start > cursor) ranges.push({ start: cursor, end: separator.start - 1 });
    cursor = separator.end + 1;
  }
  if (cursor <= end) ranges.push({ start: cursor, end });
  return ranges;
}

function groupPositions(positions, maxGap) {
  const groups = [];
  for (const position of positions) {
    const last = groups.at(-1);
    if (last && position <= last.end + maxGap + 1) last.end = position;
    else groups.push({ start: position, end: position });
  }
  return groups;
}

function fallbackCells(width, height, yBands, frameCount) {
  const band = yBands.sort((a, b) => (b.end - b.start) - (a.end - a.start))[0] ?? {
    start: Math.round(height * 0.18),
    end: Math.round(height * 0.82)
  };
  const cellWidth = width / frameCount;
  const cells = [];
  for (let i = 0; i < frameCount; i += 1) {
    cells.push(insetCell({
      left: Math.round(i * cellWidth),
      top: band.start,
      width: Math.max(1, Math.round((i + 1) * cellWidth) - Math.round(i * cellWidth)),
      height: Math.max(1, band.end - band.start + 1)
    }, width, height, 3));
  }
  return cells;
}

function insetCell(cell, sourceWidth, sourceHeight, inset) {
  const left = Math.min(sourceWidth - 1, Math.max(0, cell.left + inset));
  const top = Math.min(sourceHeight - 1, Math.max(0, cell.top + inset));
  const right = Math.min(sourceWidth, Math.max(left + 1, cell.left + cell.width - inset));
  const bottom = Math.min(sourceHeight, Math.max(top + 1, cell.top + cell.height - inset));
  return { left, top, width: right - left, height: bottom - top };
}

function isKeyLike(r, g, b, keyColor) {
  const distance = Math.hypot(r - keyColor[0], g - keyColor[1], b - keyColor[2]);
  const greenDominance = g - Math.max(r, b);
  return (
    (distance < 150 && greenDominance > 32 && g > 105)
    || (greenDominance > 42 && g > 78 && r < 120 && b < 120)
    || (greenDominance > 18 && g > 90 && r < 170 && b < 170)
  );
}

function isWhite(r, g, b) {
  return r > 238 && g > 238 && b > 238;
}

function chromaKeyAndDespill(raw, width, height, keyColor) {
  const alpha = new Uint8Array(width * height);
  const keyed = Buffer.from(raw);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      const r = keyed[offset];
      const g = keyed[offset + 1];
      const b = keyed[offset + 2];
      const keyedOut = isKeyLike(r, g, b, keyColor);
      alpha[index] = keyedOut ? 0 : 255;
    }
  }

  const cleaned = removeTinyAlpha(alpha, width, height);
  const contracted = contractAlpha(cleaned, width, height);
  const softened = softenAlpha(contracted, width, height);

  for (let i = 0; i < softened.length; i += 1) {
    const offset = i * 4;
    const a = softened[i];
    keyed[offset + 3] = a;
    if (a === 0) {
      keyed[offset] = 0;
      keyed[offset + 1] = 0;
      keyed[offset + 2] = 0;
      continue;
    }
    const greenExcess = keyed[offset + 1] - Math.max(keyed[offset], keyed[offset + 2]);
    if (greenExcess > 8) {
      keyed[offset + 1] = Math.max(0, keyed[offset + 1] - Math.min(90, greenExcess * 0.9));
    }
  }
  return keyed;
}

function removeTinyAlpha(alpha, width, height) {
  const next = new Uint8Array(alpha);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (!alpha[index]) continue;
      let neighbors = 0;
      for (let yy = -1; yy <= 1; yy += 1) {
        for (let xx = -1; xx <= 1; xx += 1) {
          if (alpha[(y + yy) * width + x + xx]) neighbors += 1;
        }
      }
      if (neighbors <= 2) next[index] = 0;
    }
  }
  return next;
}

function contractAlpha(alpha, width, height) {
  const next = new Uint8Array(alpha);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (!alpha[index]) continue;
      let transparentNeighbors = 0;
      for (let yy = -1; yy <= 1; yy += 1) {
        for (let xx = -1; xx <= 1; xx += 1) {
          if (!alpha[(y + yy) * width + x + xx]) transparentNeighbors += 1;
        }
      }
      if (transparentNeighbors >= 5) next[index] = 0;
    }
  }
  return next;
}

function softenAlpha(alpha, width, height) {
  const next = new Uint8Array(alpha);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (!alpha[index]) continue;
      let transparentNeighbors = 0;
      for (let yy = -1; yy <= 1; yy += 1) {
        for (let xx = -1; xx <= 1; xx += 1) {
          if (!alpha[(y + yy) * width + x + xx]) transparentNeighbors += 1;
        }
      }
      if (transparentNeighbors >= 2) next[index] = 230;
    }
  }
  return next;
}

function alphaBounds(raw, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = raw[(y * width + x) * 4 + 3];
      if (alpha <= 12) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (minX > maxX || minY > maxY) return { left: 0, top: 0, width, height };
  const padding = 4;
  const left = Math.max(0, minX - padding);
  const top = Math.max(0, minY - padding);
  const right = Math.min(width - 1, maxX + padding);
  const bottom = Math.min(height - 1, maxY + padding);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function makeCheckerPreview(sheetPath, outPath, width, height) {
  const checker = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><pattern id="c" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#223238"/><rect x="16" y="16" width="16" height="16" fill="#223238"/><rect x="16" width="16" height="16" fill="#162326"/><rect y="16" width="16" height="16" fill="#162326"/></pattern></defs><rect width="100%" height="100%" fill="url(#c)"/></svg>`;
  await sharp(Buffer.from(checker)).composite([{ input: sheetPath, left: 0, top: 0 }]).png().toFile(outPath);
}

function writePreviewHtml(htmlPath, actionName, frameCount) {
  const html = `<!doctype html><meta charset="utf-8"><title>${actionName} sprite preview</title><style>body{margin:0;background:#101719;color:#eef4f1;font-family:system-ui,"Microsoft YaHei";display:grid;place-items:center;min-height:100vh}.wrap{display:grid;gap:16px;place-items:center}.stage{width:384px;height:384px;display:grid;place-items:center;background-image:linear-gradient(45deg,#1f3034 25%,transparent 25% 75%,#1f3034 75%),linear-gradient(45deg,#1f3034 25%,transparent 25% 75%,#1f3034 75%);background-position:0 0,12px 12px;background-size:24px 24px;border:1px solid #284044;border-radius:16px}img{width:320px;height:320px;image-rendering:pixelated;object-fit:contain}h1{font-size:18px;margin:0;color:#dff5ee}.sheet{width:min(92vw,900px);height:auto;image-rendering:pixelated;background:#172326;border-radius:8px}</style><div class="wrap"><h1>${actionName}</h1><div class="stage"><img id="sprite" src="frames/frame-000.png"></div><img class="sheet" src="${actionName}-sheet-transparent.png"></div><script>let i=0;setInterval(()=>{i=(i+1)%${frameCount};document.getElementById('sprite').src='frames/frame-'+String(i).padStart(3,'0')+'.png';},120)</script>`;
  fs.writeFileSync(htmlPath, html, 'utf8');
}

async function alphaCorners(framePath, size) {
  const { data } = await sharp(framePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return [
    data[3],
    data[((size - 1) * 4) + 3],
    data[((size - 1) * size * 4) + 3],
    data[((size * size - 1) * 4) + 3]
  ];
}

async function collectQuality(rootDir, frameCount, size, keyColor) {
  const reports = [];
  for (let i = 0; i < frameCount; i += 1) {
    const framePath = path.join(rootDir, 'frames', `frame-${String(i).padStart(3, '0')}.png`);
    reports.push({
      frame: i,
      alphaCorners: await alphaCorners(framePath, size),
      greenResidue: await greenResidue(framePath, size, keyColor)
    });
  }
  return reports;
}

async function greenResidue(framePath, size, keyColor) {
  const { data } = await sharp(framePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let residue = 0;
  let opaque = 0;
  for (let i = 0; i < size * size; i += 1) {
    const offset = i * 4;
    if (data[offset + 3] <= 12) continue;
    opaque += 1;
    const distance = Math.hypot(data[offset] - keyColor[0], data[offset + 1] - keyColor[1], data[offset + 2] - keyColor[2]);
    if (distance < 90 && data[offset + 1] > data[offset] * 1.3 && data[offset + 1] > data[offset + 2] * 1.3) residue += 1;
  }
  return opaque ? Math.round((residue / opaque) * 10000) / 10000 : 0;
}
