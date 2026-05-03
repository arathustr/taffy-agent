from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PACK_DIR = ROOT / "src" / "renderer" / "assets" / "pet" / "generated" / "taffy-rich-pack"
MANIFEST_PATH = PACK_DIR / "manifest.json"
OUT_DIR = ROOT / ".taffy" / "promo-gifs"
FONT_PATH = Path("C:/Windows/Fonts/NotoSansSC-VF.ttf")
FALLBACK_FONT_PATH = Path("C:/Windows/Fonts/msyh.ttc")


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    actions = manifest["actions"]
    (OUT_DIR / "transparent").mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "cards").mkdir(parents=True, exist_ok=True)

    prepared: list[dict] = []
    for action in actions:
        frames = load_frames(action)
        duration = round(1000 / action["fps"])
        save_transparent_gif(action, frames, duration)
        save_card_gif(action, frames, duration)
        prepared.append({**action, "frames": frames})

    save_grid_gif(prepared)
    save_reel_gif(prepared)
    save_readme(actions)
    save_preview_html(actions)


def load_frames(action: dict) -> list[Image.Image]:
    frames_dir = PACK_DIR / action["frames"]
    frames = []
    for index in range(action["frameCount"]):
        frame = Image.open(frames_dir / f"frame-{index:03}.png").convert("RGBA")
        frames.append(frame)
    return frames


def save_transparent_gif(action: dict, frames: list[Image.Image], duration: int) -> None:
    output = OUT_DIR / "transparent" / f"{action['id']}.gif"
    frames[0].save(
        output,
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=0,
        disposal=2,
        optimize=False,
    )


def save_card_gif(action: dict, frames: list[Image.Image], duration: int) -> None:
    output = OUT_DIR / "cards" / f"{action['id']}-card.gif"
    card_frames = [make_card(action, frame, 512, 512) for frame in frames]
    card_frames[0].save(
        output,
        save_all=True,
        append_images=card_frames[1:],
        duration=duration,
        loop=0,
        disposal=2,
        optimize=True,
    )


def save_grid_gif(actions: list[dict]) -> None:
    output = OUT_DIR / "taffy-all-states-grid.gif"
    frame_count = 24
    frame_ms = 83
    grid_frames = []
    for tick in range(frame_count):
        canvas = Image.new("RGBA", (960, 720), (20, 25, 31, 255))
        draw_gradient(canvas, (20, 25, 31), (46, 28, 41))
        for action_index, action in enumerate(actions):
            x = (action_index % 4) * 240
            y = (action_index // 4) * 240
            time_sec = tick * frame_ms / 1000
            frame_index = int(time_sec * action["fps"]) % action["frameCount"]
            draw_grid_cell(canvas, action, action["frames"][frame_index], x, y)
        grid_frames.append(canvas.convert("P", palette=Image.Palette.ADAPTIVE, colors=255))
    grid_frames[0].save(output, save_all=True, append_images=grid_frames[1:], duration=frame_ms, loop=0, disposal=2, optimize=True)


def save_reel_gif(actions: list[dict]) -> None:
    output = OUT_DIR / "taffy-state-reel.gif"
    reel_frames = []
    durations = []
    for action in actions:
        duration = round(1000 / action["fps"])
        for repeat in range(2):
            for frame in action["frames"]:
                reel_frames.append(make_card(action, frame, 512, 512).convert("P", palette=Image.Palette.ADAPTIVE, colors=255))
                durations.append(duration if repeat or len(durations) else 700)
    reel_frames[0].save(output, save_all=True, append_images=reel_frames[1:], duration=durations, loop=0, disposal=2, optimize=True)


def make_card(action: dict, frame: Image.Image, width: int, height: int) -> Image.Image:
    card = Image.new("RGBA", (width, height), (23, 27, 34, 255))
    draw_gradient(card, (24, 28, 34), (53, 32, 48))
    draw = ImageDraw.Draw(card)
    draw.rounded_rectangle((28, 28, width - 28, height - 28), radius=28, fill=(255, 255, 255, 18), outline=(255, 255, 255, 52), width=2)

    sprite = frame.resize((330, 330), Image.Resampling.NEAREST)
    card.alpha_composite(sprite, ((width - sprite.width) // 2, 78))

    title_font = font(34, bold=True)
    caption_font = font(18)
    title = action["displayName"]
    caption = action["id"]
    draw_centered(draw, title, width // 2, 46, title_font, (249, 246, 241, 255))
    draw_centered(draw, caption, width // 2, height - 60, caption_font, (144, 224, 207, 255))
    return card


def draw_grid_cell(canvas: Image.Image, action: dict, frame: Image.Image, x: int, y: int) -> None:
    draw = ImageDraw.Draw(canvas)
    margin = 12
    draw.rounded_rectangle(
        (x + margin, y + margin, x + 240 - margin, y + 240 - margin),
        radius=18,
        fill=(255, 255, 255, 18),
        outline=(255, 255, 255, 38),
        width=1,
    )
    sprite = frame.resize((166, 166), Image.Resampling.NEAREST)
    canvas.alpha_composite(sprite, (x + 37, y + 42))
    title_font = font(20, bold=True)
    small_font = font(13)
    draw_centered(draw, action["displayName"], x + 120, y + 22, title_font, (249, 246, 241, 255))
    draw_centered(draw, action["id"], x + 120, y + 211, small_font, (144, 224, 207, 255))


def draw_gradient(image: Image.Image, top: tuple[int, int, int], bottom: tuple[int, int, int]) -> None:
    width, height = image.size
    pixels = image.load()
    for y in range(height):
        ratio = y / max(1, height - 1)
        color = tuple(round(top[i] * (1 - ratio) + bottom[i] * ratio) for i in range(3)) + (255,)
        for x in range(width):
            pixels[x, y] = color


def draw_centered(draw: ImageDraw.ImageDraw, text: str, center_x: int, y: int, font_obj: ImageFont.FreeTypeFont, fill: tuple[int, int, int, int]) -> None:
    bbox = draw.textbbox((0, 0), text, font=font_obj)
    draw.text((center_x - (bbox[2] - bbox[0]) / 2, y), text, font=font_obj, fill=fill)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    if bold and FALLBACK_FONT_PATH.exists():
        return ImageFont.truetype(str(FALLBACK_FONT_PATH), size=size, index=1)
    if FONT_PATH.exists():
        return ImageFont.truetype(str(FONT_PATH), size=size)
    if FALLBACK_FONT_PATH.exists():
        return ImageFont.truetype(str(FALLBACK_FONT_PATH), size=size)
    return ImageFont.load_default(size=size)


def save_readme(actions: list[dict]) -> None:
    lines = [
        "# Taffy Promo GIFs",
        "",
        "- `transparent/`: transparent GIFs for direct compositing.",
        "- `cards/`: square title-card GIFs for social posts.",
        "- `taffy-all-states-grid.gif`: all states animating together.",
        "- `taffy-state-reel.gif`: one state after another.",
        "",
        "## States",
        "",
    ]
    for action in actions:
        lines.append(f"- `{action['id']}`: {action['displayName']}")
    (OUT_DIR / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def save_preview_html(actions: list[dict]) -> None:
    cards = "\n".join(
        f"""
        <figure>
          <img src="cards/{action['id']}-card.gif" alt="{action['displayName']}">
          <figcaption>{action['displayName']} <code>{action['id']}</code></figcaption>
        </figure>
        """
        for action in actions
    )
    html = f"""<!doctype html>
<meta charset="utf-8">
<title>Taffy Promo GIFs</title>
<style>
  body {{
    margin: 0;
    background: #171b22;
    color: #f5f1ed;
    font-family: "Microsoft YaHei UI", "Microsoft YaHei", system-ui, sans-serif;
  }}
  main {{
    max-width: 1180px;
    margin: 0 auto;
    padding: 28px;
  }}
  h1 {{
    margin: 0 0 18px;
    font-size: 28px;
  }}
  .hero {{
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 420px);
    gap: 18px;
    align-items: center;
    margin-bottom: 22px;
  }}
  img {{
    max-width: 100%;
    border-radius: 10px;
  }}
  .grid {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }}
  figure {{
    margin: 0;
    padding: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.06);
  }}
  figcaption {{
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 8px;
    color: #c8d6d0;
    font-size: 13px;
  }}
  code {{
    color: #90e0cf;
  }}
</style>
<main>
  <h1>永雏塔菲桌宠宣传 GIF</h1>
  <section class="hero">
    <img src="taffy-all-states-grid.gif" alt="all states">
    <img src="taffy-state-reel.gif" alt="state reel">
  </section>
  <section class="grid">
    {cards}
  </section>
</main>
"""
    (OUT_DIR / "preview.html").write_text(html, encoding="utf-8")


if __name__ == "__main__":
    main()
