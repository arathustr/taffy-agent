# Sprite Studio Prompt Templates

These templates are provider-neutral. Replace variables in braces before sending to an image generation provider or to a Codex image-generation task.

## Global Style Block

```text
Create clean pixel art for a transparent desktop pet sprite.
Use a compact chibi body, readable silhouette, crisp pixel edges, limited color palette, no photorealism, no painterly shading, no complex background.
The final art must work at {canvasWidth}x{canvasHeight} pixels per frame.
Keep the character inside each frame with consistent scale and stable proportions.
Do not add extra people, watermarks, captions, UI, speech bubbles, logos, or large props.
```

## Character Lock Block

```text
Character profile:
{appearanceSummary}

Must keep:
{mustKeepList}

Must avoid:
{mustAvoidList}

Palette guidance:
{paletteList}

The character must remain recognizable across all frames. Preserve hair silhouette, outfit color blocks, body proportion, and main accessories.
```

## Canonical Sheet Prompt

```text
{globalStyleBlock}

{characterLockBlock}

Generate a canonical pixel-art character sheet on a clean grid.
Layout:
1. front idle pose
2. side idle pose
3. back idle pose
4. neutral face
5. happy face
6. focused face
7. upset or confused face
8. small palette strip

Use equal-size cells. Keep each pose centered. Use a flat removable background or transparent background. Avoid text labels.
```

## Action Sheet Prompt

```text
{globalStyleBlock}

{characterLockBlock}

Use the canonical sheet as the visual source of truth.
Generate one sprite sheet for the "{actionName}" desktop-pet animation.
Frame count: {frameCount}
Frame size: {canvasWidth}x{canvasHeight}
FPS target: {fps}
Loop: {loop}

Motion arc:
{motionArc}

Allowed changes:
{allowedChanges}

Forbidden changes:
{forbiddenChanges}

Output a single horizontal sprite sheet with exactly {frameCount} frames.
Each frame must have the same camera angle, same scale, same floor contact point, and transparent or flat removable background.
The first and last frames must connect naturally for playback.
```

## Bad Frame Regeneration Prompt

```text
{globalStyleBlock}

{characterLockBlock}

Regenerate only the bad frames for action "{actionName}".
Keep all accepted frames unchanged in style, scale, palette, and pose language.

Problems to fix:
{badFrameReport}

Do not redesign the character. Do not change outfit, hair, accessories, or color palette.
Return replacement frames with the same frame size and transparent or flat removable background.
```

## Background Removal Instruction

```text
Remove the background while preserving crisp pixel-art edges.
Keep the character fully opaque except intentional transparent holes.
Do not blur the outline.
Do not add glow, shadow, or antialiasing.
Return transparent PNG frames.
```

## QA Repair Instruction

```text
Repair the sprite frames according to the QA report.
Keep the same canvas size, frame count, anchor point, and palette.
Fix only the reported issue:
{repairIssue}

Do not introduce new motion, props, characters, text, or background.
```

