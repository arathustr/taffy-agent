# Sprite Studio Implementation Files

This folder contains concrete preparation files for Character Sprite Studio.

| File | Purpose |
| --- | --- |
| `character-profile.schema.json` | Validates the extracted role profile from the reference image. |
| `pet-sprite-manifest.schema.json` | Validates exported desktop-pet sprite packs. |
| `quality-rules.json` | Default QA thresholds and regeneration limits. |
| `action-presets.json` | Default action plans and frame counts. |
| `prompt-templates.md` | Generation prompts for canonical sheets and action sheets. |

The app should treat these as versioned contracts. Runtime code may copy them into `src/shared` later, but keeping the first version in docs makes the design reviewable before implementation.

