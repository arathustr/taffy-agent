# Generated Pet Sprite Packs

Character Sprite Studio exports generated pixel desktop-pet packs into this folder during development.

Expected structure:

```text
generated/
  <characterId>/
    pet-sprite-manifest.json
    preview.webp
    sprites/
      idle/
        sheet.png
        frame-000.png
      thinking/
      typing/
      success/
      error/
    qa/
      release-report.json
```

Do not commit user-provided reference images. Generated packs should be committed only when they are intentionally released as demo assets and their generation process is documented.

The included `taffy-rich-pack` is a fan-made generated sample for this app. It was drawn as new pixel-art sprite sheets from a local reference image, then post-processed into transparent frames and sprite sheets. It is not an official Live2D model, extracted texture set, stream capture, or bundled voice asset.
