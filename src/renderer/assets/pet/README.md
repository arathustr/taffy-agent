# Pet Asset Pipeline

The default renderer uses a CSS stand-in pet instead of a meme GIF. Real Taffy assets should be added here as stateful desktop-pet assets.

Recommended structure:

```text
pet/
  manifest.json
  live2d/
    taffy.model3.json
  sprites/
    idle.png
    listening.png
    thinking.png
    executing.png
    waiting_user.png
    success.png
    error.png
  motions/
    idle.motion3.json
    tap.motion3.json
    typing.motion3.json
```

Generated pixel sprite packs should use:

```text
pet/generated/<characterId>/
  pet-sprite-manifest.json
  preview.webp
  sprites/
    idle/sheet.png
    thinking/sheet.png
    typing/sheet.png
```

The generation workflow and contracts are documented in:

- `docs/14-character-sprite-studio.md`
- `docs/15-sprite-generation-pipeline.md`
- `docs/16-sprite-asset-contracts.md`

For the Taffy-specific route, the best candidate found so far is the BongoCat/Live2D model shown at:

https://www.bilibili.com/video/BV1mVxheREq5/

That model claims keyboard/mouse/controller modes, two states, and three expressions. It is not bundled because it must be obtained from the creator and its redistribution terms need to be checked.
