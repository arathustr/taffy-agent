# Sprite Asset Contracts

## 目的

本文件定义 Character Sprite Studio 的稳定工程合同。生成器、质检器、桌宠运行时和导出器都围绕这些格式协作。

## 角色资源包结构

```text
<characterId>/
  pet-sprite-manifest.json
  preview.webp
  sprites/
    <state>/
      sheet.png
      frame-000.png
      frame-001.png
      frame-002.png
  qa/
    release-report.json
  source/
    character-profile.json
    generation-log.jsonl
```

`source/` 可以在公开导出时选择不包含，避免泄露用户原始图信息和生成服务参数。

## State 名称

桌宠运行时必须支持这些状态：

- `idle`
- `listening`
- `thinking`
- `typing`
- `executing`
- `waiting_user`
- `success`
- `error`
- `sleep`
- `dragged`

允许资源包只提供子集。缺失状态按以下顺序 fallback：

| 缺失状态 | fallback |
| --- | --- |
| listening | idle |
| thinking | typing, idle |
| executing | typing, thinking, idle |
| waiting_user | listening, idle |
| success | idle |
| error | idle |
| sleep | idle |
| dragged | idle |

## Manifest 示例

```json
{
  "schemaVersion": "1.0.0",
  "characterId": "sample-character",
  "displayName": "Sample Character",
  "style": "pixel",
  "canvas": {
    "width": 192,
    "height": 192,
    "scale": 2
  },
  "defaultState": "idle",
  "states": {
    "idle": {
      "fps": 8,
      "loop": true,
      "sheet": "sprites/idle/sheet.png",
      "frames": [
        "sprites/idle/frame-000.png",
        "sprites/idle/frame-001.png",
        "sprites/idle/frame-002.png"
      ],
      "anchor": {
        "x": 96,
        "y": 178
      },
      "hitbox": {
        "x": 44,
        "y": 24,
        "width": 104,
        "height": 154
      }
    }
  },
  "qa": {
    "releaseReady": true,
    "report": "qa/release-report.json"
  }
}
```

## Character Profile 示例

```json
{
  "schemaVersion": "1.0.0",
  "characterId": "sample-character",
  "displayName": "Sample Character",
  "sourceImageHash": "sha256-placeholder",
  "target": {
    "canvasWidth": 192,
    "canvasHeight": 192,
    "frameCountPreset": "standard",
    "pixelStyle": "clean-chibi"
  },
  "appearance": {
    "hair": "short pink hair with side bangs",
    "outfit": "dark jacket, light collar, compact silhouette",
    "accessories": ["small hair ornament"],
    "mustKeep": ["pink hair", "dark outfit", "small chibi proportions"],
    "mustAvoid": ["extra people", "large weapon", "photorealistic rendering"]
  },
  "palette": {
    "maxColors": 32,
    "dominant": ["#f0a8c0", "#2a2430", "#ffffff"]
  }
}
```

## QA Report 示例

```json
{
  "schemaVersion": "1.0.0",
  "characterId": "sample-character",
  "releaseReady": true,
  "summary": {
    "statesChecked": 10,
    "framesChecked": 66,
    "regenerations": 4,
    "warnings": 1,
    "errors": 0
  },
  "metrics": {
    "maxAnchorDriftPx": 2,
    "maxPaletteDrift": 0.08,
    "minAlphaCleanliness": 0.98,
    "minLoopContinuity": 0.86
  },
  "warnings": [
    {
      "state": "typing",
      "frame": 5,
      "code": "minor_silhouette_drift",
      "message": "Hair outline differs slightly but remains within release threshold."
    }
  ]
}
```

## Runtime 加载规则

桌宠运行时加载资源包时：

- 先校验 manifest schema。
- 再校验所有图片文件存在。
- 再校验图片尺寸等于 manifest canvas。
- 按 state 预加载当前状态和 fallback 状态。
- 播放时固定窗口尺寸，不根据帧 bbox 改变窗口。
- hitbox 用于拖动、点击、悬停，而不是用整张透明画布。

## 导入安全规则

导入外部资源包时：

- 禁止路径穿越，例如 `../`。
- 禁止加载远程图片 URL。
- 只允许 `.png`、`.webp`、`.json`、`.txt`。
- 限制单个资源包大小。
- 限制单张图片尺寸。
- schema 不通过则拒绝安装。

## 版本兼容

`schemaVersion` 使用语义版本：

- `1.x`：像素 sprite manifest。
- `2.x`：未来可加入 Live2D/GLB 混合资源。

运行时只保证向后兼容同主版本。

