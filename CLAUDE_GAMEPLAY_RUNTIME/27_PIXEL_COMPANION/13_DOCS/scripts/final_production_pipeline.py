"""Build the locked-reference MAHFITT pixel companion production package.

The untouched GLBs and existing canonical camera renders remain the geometry
source.  This stage deterministically translates those renders into the final
owner-approved pixel language, derives a reusable 2D animation master, packs
theme-index atlases, and writes the local runtime package.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "07_ANIMATION_SOURCE" / "RAW_RENDER"
RAW_HQ = ROOT / "07_ANIMATION_SOURCE" / "RAW_RENDER_QUALITY_PASS_04"
SOURCE = ROOT / "00_SOURCE_UNTOUCHED"
STYLE = ROOT / "03_PIXEL_STYLE" / "FINAL_APPROVED"
MASTERS = ROOT / "05_PIXEL_MASTERS" / "FINAL_APPROVED"
THEMES = ROOT / "06_THEME_MASKS" / "FINAL_APPROVED"
FRAMES = ROOT / "08_SPRITE_FRAMES" / "FINAL_APPROVED"
ATLASES = ROOT / "09_ATLASES" / "FINAL_APPROVED"
MANIFESTS = ROOT / "10_MANIFEST" / "FINAL_APPROVED"
RUNTIME = ROOT / "11_PROTOTYPE" / "FINAL_APPROVED"
REVIEW = ROOT / "12_REVIEW_PROOFS" / "FINAL_APPROVED"

CANVAS = 512
WORK = 256
UPSCALE = CANVAS // WORK
ATLAS_COLS = 4
ATLAS_ROWS = 4
ATLAS_CAPACITY = ATLAS_COLS * ATLAS_ROWS

DIRECTION_ORDER = [
    "front", "front_3q_a", "side_a", "rear_3q_a",
    "back", "rear_3q_b", "side_b", "front_3q_b",
]

NEUTRAL = np.array(
    [
        [2, 5, 11],
        [7, 12, 22],
        [17, 25, 40],
        [35, 46, 67],
        [66, 81, 108],
        [112, 132, 163],
        [173, 195, 224],
        [238, 247, 255],
    ], dtype=np.uint8,
)

PALETTES = {
    "blue": [[2, 11, 35], [4, 33, 91], [7, 84, 213], [24, 166, 255], [194, 244, 255]],
    "gold": [[35, 20, 2], [91, 54, 3], [202, 126, 10], [255, 193, 48], [255, 244, 183]],
    "red": [[40, 3, 8], [102, 7, 18], [217, 24, 43], [255, 77, 91], [255, 220, 224]],
    "purple": [[24, 5, 54], [61, 16, 121], [132, 45, 222], [196, 105, 255], [241, 219, 255]],
    "pink": [[43, 3, 27], [102, 7, 66], [221, 25, 135], [255, 94, 193], [255, 222, 246]],
    "green": [[2, 31, 22], [4, 83, 55], [11, 180, 111], [52, 239, 162], [215, 255, 236]],
}

NEUTRAL_THRESHOLDS = np.array([0.045, 0.095, 0.17, 0.29, 0.44, 0.63, 0.82])
THEME_THRESHOLDS = np.array([0.12, 0.28, 0.50, 0.73])


@dataclass
class PixelFrame:
    neutral: Image.Image
    theme: Image.Image

    def copy(self) -> "PixelFrame":
        return PixelFrame(self.neutral.copy(), self.theme.copy())


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    filename = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / filename), size)


def hsv(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    arr = rgb.astype(np.float32) / 255.0
    mx, mn = arr.max(axis=2), arr.min(axis=2)
    delta = mx - mn
    hue = np.zeros_like(mx)
    nz = delta > 1e-6
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    sel = nz & (mx == r)
    hue[sel] = ((g[sel] - b[sel]) / delta[sel]) % 6
    sel = nz & (mx == g)
    hue[sel] = (b[sel] - r[sel]) / delta[sel] + 2
    sel = nz & (mx == b)
    hue[sel] = (r[sel] - g[sel]) / delta[sel] + 4
    hue /= 6.0
    sat = np.zeros_like(mx)
    sat[mx > 1e-6] = delta[mx > 1e-6] / mx[mx > 1e-6]
    return hue, sat, mx


def neighbor_count(mask: np.ndarray) -> np.ndarray:
    padded = np.pad(mask.astype(np.uint8), 1)
    total = np.zeros_like(mask, dtype=np.uint8)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx or dy:
                total += padded[1 + dy:1 + dy + mask.shape[0], 1 + dx:1 + dx + mask.shape[1]]
    return total


def dilate(mask: np.ndarray, passes: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(passes):
        out |= neighbor_count(out) > 0
    return out


def binary_outline(mask: np.ndarray) -> np.ndarray:
    return mask & (neighbor_count(mask) < 8)


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    a = np.asarray(image.convert("RGBA"))[:, :, 3]
    ys, xs = np.where(a >= 24)
    if not len(xs):
        raise RuntimeError("Empty render")
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def sequence_entries(character: str, sequence: str) -> list[tuple[str, Path, Path]]:
    base = RAW / character / sequence
    if sequence == "directional":
        names = DIRECTION_ORDER
    elif sequence == "idle":
        names = [f"idle_{i:02d}" for i in range(8)]
    elif sequence == "turn":
        names = [f"turn_{i:02d}" for i in range(16)]
    elif sequence == "master":
        names = ["front_3q_master"]
    else:
        raise ValueError(sequence)
    return [(name, base / name / "lit" / f"{name}.png", base / name / "albedo" / f"{name}.png") for name in names]


def canonical_crop(character: str, high_quality: bool = False) -> tuple[int, int, int, int]:
    if high_quality:
        base = RAW_HQ / character / "directional"
        paths = [base / name / "lit" / f"{name}.png" for name in ("front", "front_3q_a", "side_a")]
    else:
        paths = []
        for seq in ("directional", "idle", "turn", "master"):
            paths.extend(lit for _, lit, _ in sequence_entries(character, seq))
    boxes = [alpha_bbox(Image.open(path)) for path in paths]
    left, top = min(b[0] for b in boxes), min(b[1] for b in boxes)
    right, bottom = max(b[2] for b in boxes), max(b[3] for b in boxes)
    width, height = right - left, bottom - top
    side = int(math.ceil(max(width * 1.08, height * 1.055)))
    cx = (left + right) / 2
    cy = (top + bottom) / 2 - height * 0.006
    return int(round(cx - side / 2)), int(round(cy - side / 2)), int(round(cx + side / 2)), int(round(cy + side / 2))


def remove_tiny_level(levels: np.ndarray, mask: np.ndarray, level: int, minimum: int) -> np.ndarray:
    out = levels.copy()
    target = mask & (levels == level)
    seen = np.zeros_like(target)
    h, w = target.shape
    for sy in range(h):
        for sx in range(w):
            if not target[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]
            seen[sy, sx] = True
            pixels = []
            while stack:
                y, x = stack.pop()
                pixels.append((y, x))
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and target[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if len(pixels) < minimum:
                for y, x in pixels:
                    out[y, x] = max(0, level - 1)
    return out


def author_face(neutral: np.ndarray, theme: np.ndarray, alpha: np.ndarray, character: str, view: str) -> None:
    if view in ("back", "rear_3q_a", "rear_3q_b"):
        return
    ys, xs = np.where(alpha)
    top, bottom = int(ys.min()), int(ys.max())
    h = bottom - top + 1
    eye_y = top + int(round(h * (0.106 if character == "male" else 0.096)))
    band = alpha[max(top, eye_y - 3):min(alpha.shape[0], eye_y + 4)]
    _, bx = np.where(band)
    cx = int(round(float(np.median(bx)))) if len(bx) else int(round(float(np.median(xs))))
    if view in ("front_3q_a", "side_a"):
        cx += max(1, int(h * 0.008))
    half = max(8, int(round(h * 0.052)))
    eye_offset = max(4, int(round(h * 0.024)))
    mouth_y = eye_y + max(6, int(round(h * 0.034)))
    top_y = eye_y - max(5, int(round(h * 0.027)))
    bottom_y = mouth_y + max(4, int(round(h * 0.018)))
    points = [
        (cx - int(half * 0.70), top_y), (cx + int(half * 0.70), top_y),
        (cx + half, eye_y), (cx + int(half * 0.88), mouth_y),
        (cx + int(half * 0.45), bottom_y), (cx, bottom_y + 1),
        (cx - int(half * 0.45), bottom_y), (cx - int(half * 0.88), mouth_y),
        (cx - half, eye_y),
    ]
    shell_img = Image.new("1", (alpha.shape[1], alpha.shape[0]), 0)
    ImageDraw.Draw(shell_img).polygon(points, fill=1)
    shell = np.asarray(shell_img, dtype=bool) & alpha
    frame = dilate(shell, 1) & alpha & ~shell
    neutral[frame] = [0, 0, 0, 0]
    theme[frame] = [64, 64, 64, 255]
    neutral[shell] = [*NEUTRAL[0], 255]
    theme[shell] = [0, 0, 0, 0]

    draw_n_image = Image.fromarray(neutral, "RGBA")
    draw_n = ImageDraw.Draw(draw_n_image)
    draw_t_image = Image.fromarray(theme, "RGBA")
    draw_t = ImageDraw.Draw(draw_t_image)

    def eye(ex: int, radius: int = 3):
        # Compact octagonal ring, matching the approved round luminous eye read.
        ring = [
            (ex - radius, eye_y - 1), (ex - 1, eye_y - radius),
            (ex + 1, eye_y - radius), (ex + radius, eye_y - 1),
            (ex + radius, eye_y + 1), (ex + 1, eye_y + radius),
            (ex - 1, eye_y + radius), (ex - radius, eye_y + 1),
        ]
        draw_t.polygon(ring, fill=(192, 192, 192, 255))
        draw_t.rectangle((ex - 1, eye_y - 1, ex + 1, eye_y + 1), fill=(0, 0, 0, 0))
        draw_n.rectangle((ex - 1, eye_y - 1, ex + 1, eye_y + 1), fill=(*NEUTRAL[0], 255))
        draw_t.point((ex - 1, eye_y - 2), fill=(255, 255, 255, 255))

    if view == "front":
        eye(cx - eye_offset)
        eye(cx + eye_offset)
        mouth_cx = cx
    elif view == "front_3q_a":
        eye(cx - max(3, eye_offset // 2), 2)
        eye(cx + max(4, int(eye_offset * 0.75)), 3)
        mouth_cx = cx + 1
    else:
        eye(cx + 1, 3)
        mouth_cx = cx + 1
    draw_t.line((mouth_cx - 5, mouth_y, mouth_cx - 2, mouth_y + 2, mouth_cx + 2, mouth_y + 2, mouth_cx + 5, mouth_y), fill=(192, 192, 192, 255), width=2)
    draw_t.line((mouth_cx - 2, mouth_y + 2, mouth_cx + 2, mouth_y + 2), fill=(255, 255, 255, 255), width=1)
    neutral[:] = np.asarray(draw_n_image, dtype=np.uint8)
    theme[:] = np.asarray(draw_t_image, dtype=np.uint8)


def process_render(lit_path: Path, albedo_path: Path, crop: tuple[int, int, int, int],
                   character: str, view: str) -> PixelFrame:
    lit = Image.open(lit_path).convert("RGBA").crop(crop).resize((WORK, WORK), Image.Resampling.BOX)
    albedo = Image.open(albedo_path).convert("RGBA").crop(crop).resize((WORK, WORK), Image.Resampling.BOX)
    lit_a = np.asarray(lit, dtype=np.uint8)
    alb_a = np.asarray(albedo, dtype=np.uint8)
    alpha = (lit_a[:, :, 3] >= 48) & (alb_a[:, :, 3] >= 24)
    for _ in range(2):
        count = neighbor_count(alpha)
        alpha &= count >= 2
        alpha |= (~alpha) & (count >= 7)

    rgb = lit_a[:, :, :3].astype(np.float32) / 255.0
    lum = np.clip(0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2], 0, 1)
    lum = np.clip(lum ** 0.84 * 1.06, 0, 1)
    hue, sat, val = hsv(alb_a[:, :, :3])
    lit_hue, lit_sat, _ = hsv(lit_a[:, :, :3])
    blue_dist = np.minimum(np.abs(hue - 0.61), 1.0 - np.abs(hue - 0.61))
    lit_blue_dist = np.minimum(np.abs(lit_hue - 0.61), 1.0 - np.abs(lit_hue - 0.61))
    visibly_blue = ((lit_sat >= 0.27) & (lit_blue_dist <= 0.17)) | ((lum < 0.16) & (sat >= 0.66))
    seed = alpha & (sat >= 0.48) & (val >= 0.06) & (blue_dist <= 0.14) & visibly_blue
    candidate = alpha & (sat >= 0.20) & (blue_dist <= 0.17)
    theme_mask = seed | (dilate(seed, 1) & candidate)

    # The approved reference keeps the crystalline crown predominantly neutral
    # silver/platinum while retaining blue seams and emissive details.
    ys, _ = np.where(alpha)
    top, bottom = int(ys.min()), int(ys.max())
    ygrid = np.indices(alpha.shape)[0]
    head = alpha & (ygrid <= top + int((bottom - top + 1) * 0.19))
    theme_mask[head & (lum >= 0.28) & (lit_sat < 0.58)] = False

    neutral_level = np.digitize(lum, NEUTRAL_THRESHOLDS).astype(np.uint8)
    theme_lum = np.maximum(lum, val * 0.68)
    theme_level = np.digitize(theme_lum, THEME_THRESHOLDS).astype(np.uint8)
    neutral_level = remove_tiny_level(neutral_level, alpha & ~theme_mask, 7, 2)
    theme_level = remove_tiny_level(theme_level, theme_mask, 4, 2)
    edge = binary_outline(alpha)
    neutral_level[edge] = 0
    theme_mask[edge] = False

    neutral = np.zeros((WORK, WORK, 4), dtype=np.uint8)
    nm = alpha & ~theme_mask
    neutral[nm, :3] = NEUTRAL[neutral_level[nm]]
    neutral[nm, 3] = 255
    theme = np.zeros_like(neutral)
    codes = np.array([0, 64, 128, 192, 255], dtype=np.uint8)
    theme[theme_mask, :3] = codes[theme_level[theme_mask]][:, None]
    theme[theme_mask, 3] = 255
    author_face(neutral, theme, alpha, character, view)

    n_img = Image.fromarray(neutral, "RGBA").resize((CANVAS, CANVAS), Image.Resampling.NEAREST)
    t_img = Image.fromarray(theme, "RGBA").resize((CANVAS, CANVAS), Image.Resampling.NEAREST)
    return PixelFrame(n_img, t_img)


def compose(frame: PixelFrame, palette: str = "blue") -> Image.Image:
    neutral = np.asarray(frame.neutral, dtype=np.uint8)
    theme = np.asarray(frame.theme, dtype=np.uint8)
    out = neutral.copy()
    mask = theme[:, :, 3] == 255
    if np.any(mask):
        codes = theme[:, :, 0]
        levels = np.clip(np.rint(codes / 64.0), 0, 4).astype(np.uint8)
        colors = np.asarray(PALETTES[palette], dtype=np.uint8)
        out[mask, :3] = colors[levels[mask]]
        out[mask, 3] = 255
    return Image.fromarray(out, "RGBA")


def save_frame(frame: PixelFrame, base: Path, palette: str = "blue") -> None:
    base.parent.mkdir(parents=True, exist_ok=True)
    compose(frame, palette).save(base, optimize=True)
    frame.neutral.save(base.with_name(base.stem + "_neutral.png"), optimize=True)
    frame.theme.save(base.with_name(base.stem + "_theme.png"), optimize=True)


def build_static_masters() -> dict[str, dict[str, PixelFrame]]:
    result: dict[str, dict[str, PixelFrame]] = {}
    for character in ("female", "male"):
        result[character] = {}
        hq_crop = canonical_crop(character, True)
        raw_crop = canonical_crop(character, False)
        for view in DIRECTION_ORDER:
            if view in ("front", "front_3q_a", "side_a"):
                base = RAW_HQ / character / "directional" / view
                crop = hq_crop
            else:
                base = RAW / character / "directional" / view
                crop = raw_crop
            frame = process_render(base / "lit" / f"{view}.png", base / "albedo" / f"{view}.png", crop, character, view)
            result[character][view] = frame
            save_frame(frame, MASTERS / character / f"{view}.png")
    return result


def build_theme_system(masters_by_character: dict[str, dict[str, PixelFrame]]) -> Path:
    THEMES.mkdir(parents=True, exist_ok=True)
    (THEMES / "palettes.json").write_text(json.dumps({"levels": 5, "palettes": PALETTES}, indent=2), encoding="utf-8")
    canvas = review_background((2500, 1080))
    draw = ImageDraw.Draw(canvas)
    label(draw, (48, 30), "MAHFITT INDEXED THEME SYSTEM", 40, (221, 239, 255), True)
    label(draw, (48, 84), "BLACK / GRAPHITE / SILVER LOCKED • FIVE REPLACEABLE THEME LEVELS", 20, (112, 203, 255))
    for row, character in enumerate(("female", "male")):
        label(draw, (48, 190 + row * 420), character.upper(), 24, (130, 211, 255), True)
        for col, theme_name in enumerate(PALETTES):
            image = compose(masters_by_character[character]["front"], theme_name)
            out_dir = THEMES / character
            out_dir.mkdir(parents=True, exist_ok=True)
            image.save(out_dir / f"front_{theme_name}.png", optimize=True)
            x0, y0 = 140 + col * 385, 135 + row * 420
            paste_center(canvas, image, (x0, y0, x0 + 350, y0 + 350))
            label(draw, (x0 + 130, y0 + 345), theme_name.upper(), 16, (180, 216, 244), True)
    path = THEMES / "THEME_SYSTEM_PREVIEW.png"
    canvas.save(path, optimize=True)
    return path


def alpha_union(frame: PixelFrame) -> np.ndarray:
    n = np.asarray(frame.neutral, dtype=np.uint8)
    t = np.asarray(frame.theme, dtype=np.uint8)
    return (n[:, :, 3] > 0) | (t[:, :, 3] > 0)


def replace_alpha(image: Image.Image, mask: np.ndarray) -> Image.Image:
    arr = np.asarray(image, dtype=np.uint8).copy()
    arr[:, :, 3] = np.where(mask, arr[:, :, 3], 0)
    return Image.fromarray(arr, "RGBA")


def transform_about(image: Image.Image, angle: float, pivot: tuple[int, int]) -> Image.Image:
    return image.rotate(angle, resample=Image.Resampling.NEAREST, center=pivot, expand=False)


def translate(image: Image.Image, dx: int, dy: int) -> Image.Image:
    out = Image.new("RGBA", image.size)
    out.alpha_composite(image, (int(dx), int(dy)))
    return out


def scale_from_anchor(image: Image.Image, sx: float, sy: float, anchor: tuple[int, int]) -> Image.Image:
    width = max(1, int(round(image.width * sx)))
    height = max(1, int(round(image.height * sy)))
    resized = image.resize((width, height), Image.Resampling.NEAREST)
    ax, ay = anchor
    x = int(round(ax - ax * sx))
    y = int(round(ay - ay * sy))
    out = Image.new("RGBA", image.size)
    out.alpha_composite(resized, (x, y))
    return out


def pose_frame(frame: PixelFrame, left_arm: float = 0.0, right_arm: float = 0.0,
               head_angle: float = 0.0, head_dx: int = 0, head_dy: int = 0,
               dx: int = 0, dy: int = 0, sx: float = 1.0, sy: float = 1.0) -> PixelFrame:
    mask = alpha_union(frame)
    ys, xs = np.where(mask)
    top, bottom = int(ys.min()), int(ys.max())
    left, right = int(xs.min()), int(xs.max())
    h = bottom - top + 1
    cx = int(round(float(np.median(xs))))
    ygrid, xgrid = np.indices(mask.shape)
    shoulder_y = top + int(h * 0.235)
    left_pivot = (cx - int(h * 0.125), shoulder_y)
    right_pivot = (cx + int(h * 0.125), shoulder_y)
    arm_bottom = top + int(h * 0.65)
    left_mask = mask & (ygrid >= shoulder_y - int(h * 0.025)) & (ygrid <= arm_bottom) & (xgrid <= left_pivot[0] + int(h * 0.020))
    right_mask = mask & (ygrid >= shoulder_y - int(h * 0.025)) & (ygrid <= arm_bottom) & (xgrid >= right_pivot[0] - int(h * 0.020))
    head_cut = top + int(h * 0.205)
    head_mask = mask & (ygrid <= head_cut)
    neck_pivot = (cx, head_cut)

    def pose_layer(image: Image.Image) -> Image.Image:
        arr = np.asarray(image, dtype=np.uint8).copy()
        base = Image.fromarray(arr, "RGBA")
        for part_mask, angle, pivot, part_dx, part_dy in (
            (left_mask, left_arm, left_pivot, 0, 0),
            (right_mask, right_arm, right_pivot, 0, 0),
            (head_mask, head_angle, neck_pivot, head_dx, head_dy),
        ):
            if abs(angle) < 0.01 and part_dx == 0 and part_dy == 0:
                continue
            base_arr = np.asarray(base, dtype=np.uint8).copy()
            part_arr = base_arr.copy()
            part_arr[~part_mask] = 0
            base_arr[part_mask] = 0
            base = Image.fromarray(base_arr, "RGBA")
            part = transform_about(Image.fromarray(part_arr, "RGBA"), angle, pivot)
            if part_dx or part_dy:
                part = translate(part, part_dx, part_dy)
            base.alpha_composite(part)
        if sx != 1.0 or sy != 1.0:
            base = scale_from_anchor(base, sx, sy, (cx, bottom))
        if dx or dy:
            base = translate(base, dx, dy)
        return base

    return PixelFrame(pose_layer(frame.neutral), pose_layer(frame.theme))


def face_expression(frame: PixelFrame, character: str, state: str) -> PixelFrame:
    if state == "normal":
        return frame.copy()
    out = frame.copy()
    mask = alpha_union(out)
    ys, xs = np.where(mask)
    top, bottom = int(ys.min()), int(ys.max())
    h = bottom - top + 1
    eye_y = top + int(h * (0.106 if character == "male" else 0.096))
    cx = int(round(float(np.median(xs[(ys >= eye_y - 6) & (ys <= eye_y + 6)])))) if np.any((ys >= eye_y - 6) & (ys <= eye_y + 6)) else int(round(float(np.median(xs))))
    eye_offset = max(8, int(h * 0.024))
    mouth_y = eye_y + max(12, int(h * 0.034))
    n = out.neutral.copy()
    t = out.theme.copy()
    nd, td = ImageDraw.Draw(n), ImageDraw.Draw(t)
    black = tuple(NEUTRAL[0]) + (255,)
    transparent = (0, 0, 0, 0)
    nd.rectangle((cx - eye_offset - 10, eye_y - 8, cx + eye_offset + 10, eye_y + 8), fill=black)
    td.rectangle((cx - eye_offset - 10, eye_y - 8, cx + eye_offset + 10, eye_y + 8), fill=transparent)
    nd.rectangle((cx - 14, mouth_y - 5, cx + 14, mouth_y + 8), fill=black)
    td.rectangle((cx - 14, mouth_y - 5, cx + 14, mouth_y + 8), fill=transparent)

    def ring(ex: int, wide: int = 6, tall: int = 6, shift: int = 0):
        td.ellipse((ex - wide, eye_y - tall, ex + wide, eye_y + tall), fill=(192, 192, 192, 255))
        nd.ellipse((ex - 2 + shift, eye_y - 2, ex + 2 + shift, eye_y + 2), fill=black)
        td.point((ex - 2, eye_y - tall + 2), fill=(255, 255, 255, 255))

    if state in ("blink", "sleep"):
        td.line((cx - eye_offset - 5, eye_y, cx - eye_offset + 5, eye_y), fill=(192, 192, 192, 255), width=2)
        td.line((cx + eye_offset - 5, eye_y, cx + eye_offset + 5, eye_y), fill=(192, 192, 192, 255), width=2)
    elif state == "wide":
        ring(cx - eye_offset, 7, 7)
        ring(cx + eye_offset, 7, 7)
    elif state == "look_left":
        ring(cx - eye_offset, shift=-2)
        ring(cx + eye_offset, shift=-2)
    elif state == "look_right":
        ring(cx - eye_offset, shift=2)
        ring(cx + eye_offset, shift=2)
    elif state == "concerned":
        ring(cx - eye_offset, 6, 5)
        ring(cx + eye_offset, 6, 5)
        td.line((cx - eye_offset - 6, eye_y - 8, cx - eye_offset + 5, eye_y - 5), fill=(128, 128, 128, 255), width=2)
        td.line((cx + eye_offset - 5, eye_y - 5, cx + eye_offset + 6, eye_y - 8), fill=(128, 128, 128, 255), width=2)
    else:
        ring(cx - eye_offset)
        ring(cx + eye_offset)

    if state in ("talk_open", "excited", "surprised"):
        td.ellipse((cx - 7, mouth_y - 2, cx + 7, mouth_y + 7), fill=(192, 192, 192, 255))
        nd.rectangle((cx - 3, mouth_y + 1, cx + 3, mouth_y + 4), fill=black)
    elif state in ("flat", "focused", "concerned", "sleep"):
        td.line((cx - 8, mouth_y + 2, cx + 8, mouth_y + 2), fill=(192, 192, 192, 255), width=2)
    elif state == "talk_small":
        td.line((cx - 5, mouth_y, cx + 5, mouth_y), fill=(255, 255, 255, 255), width=3)
    else:
        td.line((cx - 9, mouth_y, cx - 4, mouth_y + 4, cx + 4, mouth_y + 4, cx + 9, mouth_y), fill=(192, 192, 192, 255), width=2)
        td.line((cx - 3, mouth_y + 4, cx + 3, mouth_y + 4), fill=(255, 255, 255, 255), width=1)
    return PixelFrame(n, t)


def tween_pose(base: PixelFrame, count: int, left_target: float = 0, right_target: float = 0,
               head_target: float = 0, dx_target: int = 0, dy_target: int = 0,
               sy_target: float = 1.0, expression: str = "normal", reverse: bool = False) -> list[PixelFrame]:
    source = face_expression(base, "female" if "female" in str(base.neutral.info.get("character", "")) else "male", expression) if False else base
    frames = []
    for i in range(count):
        t = i / max(1, count - 1)
        eased = t * t * (3 - 2 * t)
        if reverse:
            eased = 1 - eased
        frames.append(pose_frame(source, left_target * eased, right_target * eased,
                                 head_target * eased, dx=int(dx_target * eased), dy=int(dy_target * eased),
                                 sy=1.0 + (sy_target - 1.0) * eased))
    return frames


def process_raw_sequence(character: str, sequence: str) -> list[PixelFrame]:
    crop = canonical_crop(character, False)
    frames = []
    turn_views = ["front", "front_3q_a", "front_3q_a", "side_a", "side_a", "rear_3q_a", "rear_3q_a", "back",
                  "back", "rear_3q_b", "rear_3q_b", "side_b", "side_b", "front_3q_b", "front_3q_b", "front"]
    for i, (name, lit, albedo) in enumerate(sequence_entries(character, sequence)):
        view = name if sequence == "directional" else (turn_views[i] if sequence == "turn" else "front")
        frames.append(process_render(lit, albedo, crop, character, view))
    return frames


def posed_cycle(base: PixelFrame, character: str, poses: list[dict], expressions: list[str] | None = None) -> list[PixelFrame]:
    output = []
    for i, pose in enumerate(poses):
        expression = expressions[i % len(expressions)] if expressions else "normal"
        source = face_expression(base, character, expression)
        output.append(pose_frame(source, **pose))
    return output


def animation_library(character: str, masters: dict[str, PixelFrame]) -> dict[str, dict]:
    front = masters["front"]
    three_left = masters["front_3q_a"]
    three_right = masters["front_3q_b"]
    idle = process_raw_sequence(character, "idle")
    turn = process_raw_sequence(character, "turn")

    def entry(frames, durations, loop, purpose, interruptible=True, transition="idle_neutral"):
        if isinstance(durations, int):
            durations = [durations] * len(frames)
        return {"frames_data": frames, "durationsMs": durations, "loop": loop,
                "purpose": purpose, "interruptible": interruptible, "transition": transition}

    bob = [{"dy": y} for y in (0, -2, -4, -2, 0, 2, 0)]
    talk_expr = ["talk_small", "talk_open", "talk_small", "normal"]
    animations: dict[str, dict] = {}
    animations["idle_neutral"] = entry(idle, [130, 120, 130, 150, 130, 100, 90, 150], True, "primary resting loop")
    animations["idle_look_left"] = entry(posed_cycle(three_left, character, bob[:5], ["look_left", "look_left", "blink", "look_left", "normal"]), 150, True, "quiet leftward idle")
    animations["idle_look_right"] = entry(posed_cycle(three_right, character, bob[:5], ["look_right", "look_right", "blink", "look_right", "normal"]), 150, True, "quiet rightward idle")
    animations["idle_curious"] = entry(posed_cycle(front, character, [{"head_angle": a, "dy": y} for a, y in ((0,0),(-4,-2),(-7,-3),(-4,-2),(0,0))], ["normal","wide","wide","wide","normal"]), [120,110,260,110,140], True, "curious reaction")
    animations["idle_long"] = entry(idle + posed_cycle(three_left, character, bob[:4], ["normal","look_left","blink","normal"]) + idle[:4] + posed_cycle(three_right, character, bob[:4], ["normal","look_right","blink","normal"]), 160, True, "long anti-repetition idle")

    think_pose = [{"head_angle": a, "head_dx": x, "dy": y} for a, x, y in ((0,0,0),(-3,-2,-1),(-6,-3,-2),(-8,-3,-2))]
    animations["think_start"] = entry(posed_cycle(front, character, think_pose, ["normal","focused","focused","focused"]), [90,90,110,180], False, "enter thinking state", True, "think_loop")
    animations["think_loop"] = entry(posed_cycle(front, character, think_pose[2:] + think_pose[:0:-1], ["focused","look_left","focused","blink","focused"]), [160,140,170,110,160], True, "processing loop")
    animations["think_end"] = entry(list(reversed(animations["think_start"]["frames_data"])), [100,90,90,130], False, "leave thinking state")
    animations["talk_neutral"] = entry(posed_cycle(front, character, bob[:4], talk_expr), [110,90,110,130], True, "neutral conversation")
    animations["talk_excited"] = entry(posed_cycle(front, character, [{"dy": y, "sx": s, "sy": s} for y, s in ((0,1),(-4,1.02),(-7,1.03),(-3,1.01),(0,1))], ["talk_small","excited","talk_open","excited","normal"]), [90,80,100,80,130], True, "excited conversation")
    animations["talk_concerned"] = entry(posed_cycle(front, character, [{"head_angle": a, "dy": y} for a, y in ((0,0),(3,1),(5,2),(3,1),(0,0))], ["concerned","talk_small","concerned","talk_small","concerned"]), 130, True, "concerned conversation")
    animations["talk_helpful"] = entry(posed_cycle(front, character, [{"head_angle": a, "right_arm": r} for a, r in ((0,0),(-2,8),(-4,16),(-2,8),(0,0))], talk_expr + ["normal"]), [110,100,130,100,140], True, "helpful explanation")

    wave_poses = [{"right_arm": a, "dy": y} for a, y in ((0,0),(45,-2),(95,-4),(125,-4),(95,-3),(125,-4),(45,-2),(0,0))]
    animations["wave"] = entry(posed_cycle(front, character, wave_poses, ["normal","happy","happy","excited","happy","excited","happy","normal"]), [90,80,90,110,90,110,80,140], False, "friendly wave")
    animations["hello"] = entry(posed_cycle(front, character, wave_poses[:6], ["normal","talk_small","talk_open","happy","talk_small","normal"]), [90,80,100,120,90,150], False, "greeting")
    animations["happy"] = entry(posed_cycle(front, character, [{"dy": y, "sy": s} for y, s in ((0,1),(-4,1.01),(-7,1.025),(-4,1.01),(0,1))], ["happy"]), [100,90,150,90,140], False, "positive response")
    small_celebrate = [{"left_arm": -a, "right_arm": a, "dy": y} for a, y in ((0,0),(30,-2),(58,-5),(72,-7),(58,-5),(30,-2),(0,0))]
    big_celebrate = [{"left_arm": -a, "right_arm": a, "dy": y, "sy": s} for a, y, s in ((0,0,1),(45,-4,1.01),(90,-8,1.03),(135,-12,1.04),(160,-14,1.05),(135,-10,1.04),(90,-6,1.02),(0,0,1))]
    animations["celebrate_small"] = entry(posed_cycle(front, character, small_celebrate, ["happy","happy","excited","excited","happy","happy","normal"]), [90,80,100,170,100,80,150], False, "small success celebration", False)
    animations["celebrate_big"] = entry(posed_cycle(front, character, big_celebrate, ["happy","excited","excited","excited","excited","happy","happy","normal"]), [80,80,90,100,220,100,90,160], False, "large success celebration", False)
    animations["nod_yes"] = entry(posed_cycle(front, character, [{"head_dy": y} for y in (0,4,8,3,0,-2,0)], ["normal"]), [90,80,100,80,100,80,130], False, "affirmation")
    animations["shake_no"] = entry(posed_cycle(front, character, [{"head_dx": x} for x in (0,-5,6,-6,5,0)], ["normal"]), [90,80,90,90,80,140], False, "negative response")
    animations["shrug"] = entry(posed_cycle(front, character, [{"left_arm": -a, "right_arm": a, "head_dy": y} for a, y in ((0,0),(15,-2),(28,-4),(28,-4),(15,-2),(0,0))], ["normal","concerned","concerned","concerned","normal","normal"]), [90,90,120,200,100,140], False, "uncertainty shrug")
    animations["surprised"] = entry(posed_cycle(front, character, [{"dy": y, "sy": s} for y, s in ((0,1),(-5,1.03),(-8,1.05),(-4,1.02),(0,1))], ["normal","wide","surprised","wide","normal"]), [80,80,220,100,150], False, "surprise reaction")
    animations["concerned"] = entry(posed_cycle(front, character, [{"head_angle": a} for a in (0,3,5,3,0)], ["concerned"]), [100,110,220,110,140], False, "concerned reaction")
    animations["focused"] = entry(posed_cycle(front, character, [{"dy": y} for y in (0,-1,-2,-1,0)], ["focused"]), [140,130,220,130,150], True, "focused state")

    point_specs = {
        "point_left": (-95, 0), "point_right": (0, 95), "point_up": (0, 160), "point_down": (0, 25),
        "point_up_left": (-145, 0), "point_up_right": (0, 145),
        "point_down_left": (-35, 0), "point_down_right": (0, 35),
    }
    for name, (la, ra) in point_specs.items():
        poses = []
        for k in (0.0, 0.45, 0.78, 1.0, 1.0, 0.72, 0.35, 0.0):
            poses.append({"left_arm": la * k, "right_arm": ra * k, "head_angle": (-3 if la else 3) * k})
        animations[name] = entry(posed_cycle(front, character, poses, ["normal","focused","focused","happy","happy","focused","normal","normal"]), [80,80,90,160,260,90,80,140], False, f"tutorial {name.replace('_',' ')}", False)

    # Spatial actions use the actual canonical turn renders.
    animations["turn_left_45"] = entry(turn[:3], [90,90,140], False, "turn left 45 degrees")
    animations["turn_right_45"] = entry([turn[0], turn[-1], turn[-2]], [90,90,140], False, "turn right 45 degrees")
    animations["turn_left_90"] = entry(turn[:5], [85,85,85,85,150], False, "turn left 90 degrees")
    animations["turn_right_90"] = entry([turn[0]] + list(reversed(turn[12:])), [85,85,85,85,150], False, "turn right 90 degrees")
    animations["turn_to_back"] = entry(turn[:9], [85] * 8 + [170], False, "turn from front to back", False)
    animations["turn_back_to_front"] = entry(list(reversed(turn[:9])), [85] * 8 + [170], False, "turn from back to front", False)
    animations["look_over_shoulder"] = entry([masters["back"], masters["rear_3q_a"], masters["rear_3q_a"], masters["back"]], [120,140,320,160], False, "look over shoulder")
    animations["full_turn_showcase"] = entry(turn, [95] * len(turn), True, "full turn showcase", False)

    stretch = [{"left_arm": -a, "right_arm": a, "dy": y, "sy": s} for a, y, s in ((0,0,1),(50,-3,1.01),(100,-7,1.03),(150,-10,1.05),(165,-12,1.06),(150,-10,1.05),(90,-6,1.03),(0,0,1))]
    animations["stretch_upper"] = entry(posed_cycle(front, character, stretch, ["normal","normal","happy","happy","happy","happy","normal","normal"]), [90,90,100,120,300,120,100,160], False, "upper-body stretch")
    animations["shoulder_roll"] = entry(posed_cycle(front, character, [{"left_arm": -a, "right_arm": a, "head_dy": y} for a, y in ((0,0),(8,-2),(15,-4),(8,-5),(0,-3),(-8,-1),(-12,1),(0,0))], ["normal"]), 110, True, "shoulder roll")
    flex = [{"left_arm": -a, "right_arm": a, "dy": y} for a, y in ((0,0),(35,-2),(75,-4),(115,-5),(125,-5),(115,-5),(55,-2),(0,0))]
    animations["arm_flex"] = entry(posed_cycle(front, character, flex, ["normal","focused","happy","happy","excited","happy","normal","normal"]), [90,80,100,140,240,120,90,150], False, "arm flex")
    curl = [{"right_arm": a, "head_angle": -a * 0.025} for a in (0,35,75,115,75,35,0)]
    animations["mini_curl"] = entry(posed_cycle(front, character, curl, ["normal","focused","focused","happy","focused","normal","normal"]), [90,80,100,180,100,80,150], False, "mini curl")
    warm = [{"left_arm": la, "right_arm": ra, "dy": y} for la, ra, y in ((0,0,0),(-45,20,-3),(-90,45,-6),(-20,90,-3),(45,20,-5),(0,0,0))]
    animations["quick_warmup"] = entry(posed_cycle(front, character, warm, ["focused","focused","happy","focused","happy","normal"]), [90,90,110,110,100,150], False, "quick warmup")
    breathe = [{"sy": s, "dy": y} for s, y in ((1,0),(1.01,-1),(1.02,-2),(1.025,-3),(1.02,-2),(1.01,-1),(1,0))]
    animations["recovery_breathe"] = entry(posed_cycle(front, character, breathe, ["normal","normal","normal","happy","normal","normal","normal"]), [160,150,160,260,160,150,180], True, "recovery breathing")
    animations["ready_to_train"] = entry(posed_cycle(front, character, flex[:5], ["focused","focused","happy","happy","excited"]), [90,90,100,130,260], False, "ready to train", False)
    animations["workout_complete"] = entry(animations["celebrate_small"]["frames_data"], animations["celebrate_small"]["durationsMs"], False, "workout complete", False)
    animations["personal_record"] = entry(animations["celebrate_big"]["frames_data"], animations["celebrate_big"]["durationsMs"], False, "personal record celebration", False)

    rest = [{"sy": s, "dy": y} for s, y in ((1,0),(.97,4),(.93,10),(.90,16),(.90,16),(.94,9),(.98,3),(1,0))]
    animations["sit_or_rest"] = entry(posed_cycle(front, character, rest, ["normal","normal","sleep","sleep","sleep","blink","normal","normal"]), [100,100,120,220,320,120,100,160], False, "rest pose")
    animations["sleepy"] = entry(posed_cycle(front, character, [{"head_angle": a, "head_dy": y, "sy": s} for a, y, s in ((0,0,1),(3,2,.99),(6,4,.98),(8,5,.98),(6,4,.98))], ["normal","blink","sleep","sleep","sleep"]), [140,130,180,300,220], True, "sleepy idle")
    animations["wake"] = entry(list(reversed(animations["sleepy"]["frames_data"])), [100,100,90,90,150], False, "wake up")
    animations["inspect_ui"] = entry(posed_cycle(three_left, character, [{"head_angle": a, "head_dx": x} for a, x in ((0,0),(-3,-2),(-6,-4),(-4,-3),(0,0))], ["focused","look_left","focused","look_left","normal"]), [120,120,260,120,160], False, "inspect interface")
    dance = [{"dx": x, "dy": y, "head_angle": a, "left_arm": la, "right_arm": ra} for x, y, a, la, ra in ((0,0,0,0,0),(-5,-4,-4,-25,15),(5,-7,4,-10,30),(-6,-4,-5,-35,10),(6,-7,5,-10,35),(0,0,0,0,0))]
    animations["little_dance"] = entry(posed_cycle(front, character, dance, ["happy","happy","excited","happy","excited","happy"]), [100,90,110,90,110,160], False, "little dance", False)
    animations["look_around"] = entry([front, three_left, three_left, front, three_right, three_right, front], [140,130,240,140,130,240,160], False, "look around")
    special_a = [{"dy": y, "head_angle": a, "sx": s, "sy": s} for y, a, s in ((0,0,1),(-4,-4,1.01),(-8,4,1.03),(-12,-4,1.04),(-8,4,1.03),(-4,-4,1.01),(0,0,1))]
    animations["rare_special_idle_a"] = entry(posed_cycle(front, character, special_a, ["normal","wide","happy","excited","happy","wide","normal"]), [100,100,110,220,110,100,170], False, "rare playful hover", False)
    special_b = [{"left_arm": -a, "right_arm": a, "head_angle": h} for a, h in ((0,0),(20,-3),(45,3),(70,-3),(45,3),(20,-3),(0,0))]
    animations["rare_special_idle_b"] = entry(posed_cycle(front, character, special_b, ["normal","happy","wide","excited","wide","happy","normal"]), [110,100,110,240,110,100,170], False, "rare special pose", False)
    return animations


def write_animation_assets(character: str, animations: dict[str, dict]) -> tuple[dict, list[dict]]:
    records: list[dict] = []
    manifest_animations: dict[str, dict] = {}
    for name, spec in animations.items():
        out_dir = FRAMES / character / name
        layer_dir = out_dir / "layers"
        out_dir.mkdir(parents=True, exist_ok=True)
        layer_dir.mkdir(parents=True, exist_ok=True)
        frame_records = []
        for i, frame in enumerate(spec["frames_data"]):
            preview_path = out_dir / f"frame_{i:03d}.png"
            neutral_path = layer_dir / f"frame_{i:03d}_neutral.png"
            theme_path = layer_dir / f"frame_{i:03d}_theme.png"
            compose(frame, "blue").save(preview_path, optimize=True)
            frame.neutral.save(neutral_path, optimize=True)
            frame.theme.save(theme_path, optimize=True)
            record = {
                "animation": name,
                "frame": i,
                "preview": preview_path,
                "neutral": neutral_path,
                "theme": theme_path,
                "durationMs": int(spec["durationsMs"][i]),
            }
            records.append(record)
            frame_records.append(record)
        manifest_animations[name] = {
            "frames": [],
            "durationsMs": [int(v) for v in spec["durationsMs"]],
            "loop": bool(spec["loop"]),
            "preferredUiPurpose": spec["purpose"],
            "interruptible": bool(spec["interruptible"]),
            "transition": spec["transition"],
        }
    return manifest_animations, records


def pack_atlases(character: str, records: list[dict], manifest_animations: dict[str, dict]) -> list[dict]:
    out_dir = ATLASES / character
    out_dir.mkdir(parents=True, exist_ok=True)
    pages = []
    for page_index, start in enumerate(range(0, len(records), ATLAS_CAPACITY)):
        chunk = records[start:start + ATLAS_CAPACITY]
        size = (ATLAS_COLS * CANVAS, ATLAS_ROWS * CANVAS)
        neutral_page = Image.new("RGBA", size)
        theme_page = Image.new("RGBA", size)
        preview_page = Image.new("RGBA", size)
        for local_index, record in enumerate(chunk):
            col, row = local_index % ATLAS_COLS, local_index // ATLAS_COLS
            xy = (col * CANVAS, row * CANVAS)
            neutral_page.alpha_composite(Image.open(record["neutral"]).convert("RGBA"), xy)
            theme_page.alpha_composite(Image.open(record["theme"]).convert("RGBA"), xy)
            preview_page.alpha_composite(Image.open(record["preview"]).convert("RGBA"), xy)
            frame_meta = {
                "page": page_index,
                "cell": local_index,
                "rect": [xy[0], xy[1], CANVAS, CANVAS],
                "durationMs": record["durationMs"],
            }
            manifest_animations[record["animation"]]["frames"].append(frame_meta)
        neutral_name = f"neutral_{page_index:02d}.png"
        theme_name = f"theme_index_{page_index:02d}.png"
        preview_name = f"blue_preview_{page_index:02d}.png"
        neutral_page.save(out_dir / neutral_name, optimize=True)
        theme_page.save(out_dir / theme_name, optimize=True)
        preview_page.save(out_dir / preview_name, optimize=True)
        pages.append({
            "neutral": f"../../09_ATLASES/FINAL_APPROVED/{character}/{neutral_name}",
            "themeIndex": f"../../09_ATLASES/FINAL_APPROVED/{character}/{theme_name}",
            "bluePreview": f"../../09_ATLASES/FINAL_APPROVED/{character}/{preview_name}",
            "grid": [ATLAS_COLS, ATLAS_ROWS],
            "usedCells": len(chunk),
        })
    return pages


def write_manifest(character: str, manifest_animations: dict[str, dict], pages: list[dict]) -> Path:
    source_name = "MAH_FEMALE_SOURCE.glb" if character == "female" else "MAH_MALE_SOURCE.glb"
    payload = {
        "version": 2,
        "artDirection": "owner-approved pixel reference locked",
        "character": character,
        "sourceGlb": f"../../00_SOURCE_UNTOUCHED/{source_name}",
        "nativeCanvas": [CANVAS, CANVAS],
        "effectivePixelGrid": [WORK, WORK],
        "anchor": {"x": 0.5, "y": 0.955, "basis": "stable fused lower-body centerline"},
        "atlases": {"cell": [CANVAS, CANVAS], "pages": pages},
        "animations": manifest_animations,
        "rendering": {"imageSmoothingEnabled": False, "integerScalePreferred": True, "background": "transparent"},
        "themeArchitecture": {
            "levels": ["THEME_SHADOW", "THEME_DARK", "THEME_BASE", "THEME_LIGHT", "THEME_EMISSIVE"],
            "blackGraphiteLocked": True,
            "neutralSilverLocked": True,
            "palettes": PALETTES,
        },
        "reducedMotion": {
            "idle": "static first frame",
            "stateChanges": "first and final key only",
            "tutorialActions": "retain informative held pose",
        },
    }
    path = MANIFESTS / f"{character}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def build_animation_package(masters_by_character: dict[str, dict[str, PixelFrame]]) -> dict[str, dict]:
    package = {}
    for character in ("female", "male"):
        animations = animation_library(character, masters_by_character[character])
        manifest_animations, records = write_animation_assets(character, animations)
        pages = pack_atlases(character, records, manifest_animations)
        manifest_path = write_manifest(character, manifest_animations, pages)
        package[character] = {
            "animations": animations,
            "records": records,
            "manifest": manifest_path,
            "pages": pages,
        }
    index = {
        "defaultCharacter": "female",
        "defaultTheme": "blue",
        "characters": {
            "female": "female.json",
            "male": "male.json",
        },
        "behaviorPriority": ["event", "ai_communication", "tutorial", "personality", "idle"],
        "quietWhile": ["user_typing", "critical_modal", "tutorial_hold", "important_action"],
    }
    MANIFESTS.mkdir(parents=True, exist_ok=True)
    (MANIFESTS / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    return package


def paste_center(canvas: Image.Image, image: Image.Image, box: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = box
    max_w, max_h = x1 - x0, y1 - y0
    scale = min(max_w / image.width, max_h / image.height)
    # Nearest-neighbor only; dimensions are rounded to even values so the 2×
    # authored pixel clusters remain stable in owner proofs.
    width = max(2, int(image.width * scale) // 2 * 2)
    height = max(2, int(image.height * scale) // 2 * 2)
    shown = image.resize((width, height), Image.Resampling.NEAREST)
    x = x0 + (max_w - width) // 2
    y = y0 + (max_h - height) // 2
    canvas.paste(shown, (x, y), shown)


def label(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, size: int, color=(220, 235, 251), bold=False) -> None:
    draw.text(xy, text, font=font(size, bold), fill=color)


def review_background(size: tuple[int, int]) -> Image.Image:
    w, h = size
    y, x = np.indices((h, w))
    cx, cy = w * 0.52, h * 0.42
    radius = np.sqrt(((x - cx) / w) ** 2 + ((y - cy) / h) ** 2)
    glow = np.clip(1.0 - radius * 2.2, 0, 1)
    arr = np.zeros((h, w, 3), dtype=np.uint8)
    arr[:, :, 0] = 3 + (glow * 3).astype(np.uint8)
    arr[:, :, 1] = 9 + (glow * 7).astype(np.uint8)
    arr[:, :, 2] = 18 + (glow * 15).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def build_character_review(character: str, masters: dict[str, PixelFrame], package: dict) -> Path:
    canvas = review_background((2600, 1400))
    draw = ImageDraw.Draw(canvas)
    label(draw, (54, 38), f"MAHFITT {character.upper()} — FINAL PIXEL COMPANION", 42, (114, 208, 255), True)
    label(draw, (54, 92), "LOCKED OWNER REFERENCE • TRUE PIXEL CLUSTERS • LOCAL THEMEABLE RUNTIME", 20)
    front = compose(masters["front"])
    threeq = compose(masters["front_3q_a"])
    paste_center(canvas, front, (50, 145, 640, 790))
    paste_center(canvas, threeq, (650, 145, 1240, 790))
    label(draw, (260, 785), "FRONT", 24, (150, 215, 255), True)
    label(draw, (850, 785), "FRONT 3/4", 24, (150, 215, 255), True)
    samples = [
        ("idle_neutral", 2, "IDLE"), ("think_loop", 1, "THINK"),
        ("point_right", 3, "POINT"), ("celebrate_small", 3, "CELEBRATE"),
    ]
    for i, (anim, idx, title) in enumerate(samples):
        frame = compose(package["animations"][anim]["frames_data"][idx])
        x0 = 1270 + (i % 2) * 640
        y0 = 135 + (i // 2) * 575
        paste_center(canvas, frame, (x0, y0, x0 + 600, y0 + 500))
        label(draw, (x0 + 220, y0 + 485), title, 21, (150, 215, 255), True)
    # Palette strip confirms deterministic theme support without competing with art.
    y = 1245
    for i, name in enumerate(PALETTES):
        x = 60 + i * 410
        label(draw, (x, y - 34), name.upper(), 17, (186, 205, 229), True)
        for j, color in enumerate(PALETTES[name]):
            draw.rectangle((x + j * 68, y, x + j * 68 + 60, y + 54), fill=tuple(color))
    path = REVIEW / f"{character.upper()}_FINAL.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path, optimize=True)
    return path


def build_owner_review(masters_by_character: dict[str, dict[str, PixelFrame]], package: dict[str, dict]) -> Path:
    canvas = review_background((3200, 1800))
    draw = ImageDraw.Draw(canvas)
    label(draw, (58, 34), "MAHFITT PIXEL COMPANION — FINAL OWNER REVIEW", 44, (221, 239, 255), True)
    label(draw, (58, 90), "OWNER-APPROVED PIXEL LANGUAGE • SOURCE-LOCKED ANATOMY • PRODUCTION ANIMATION SYSTEM", 22, (115, 203, 255))
    for row, character in enumerate(("female", "male")):
        y = 150 + row * 805
        label(draw, (58, y), character.upper(), 31, (111, 205, 255), True)
        paste_center(canvas, compose(masters_by_character[character]["front"]), (80, y + 45, 630, y + 690))
        paste_center(canvas, compose(masters_by_character[character]["front_3q_a"]), (620, y + 45, 1170, y + 690))
        sample_names = ["idle_neutral", "think_loop", "point_right", "celebrate_small"]
        for i, name in enumerate(sample_names):
            frames = package[character]["animations"][name]["frames_data"]
            frame = compose(frames[min(len(frames) - 1, max(1, len(frames) // 2))])
            x0 = 1190 + i * 490
            paste_center(canvas, frame, (x0, y + 85, x0 + 455, y + 610))
            label(draw, (x0 + 150, y + 625), name.replace("_", " ").upper(), 17, (153, 215, 255), True)
        label(draw, (250, y + 700), "FRONT", 20, (153, 215, 255), True)
        label(draw, (790, y + 700), "FRONT 3/4", 20, (153, 215, 255), True)
        if row == 0:
            draw.line((40, y + 780, 3160, y + 780), fill=(31, 86, 135), width=2)
    path = REVIEW / "MAHFITT_FINAL_OWNER_REVIEW.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path, optimize=True)
    return path


def build_motion_preview(package: dict[str, dict]) -> Path:
    selections = [
        ("idle_neutral", "IDLE"), ("full_turn_showcase", "TURN"), ("think_loop", "THINK"),
        ("point_right", "POINT"), ("celebrate_small", "CELEBRATE"), ("arm_flex", "FITNESS"),
    ]
    frames_out = []
    total_steps = 24
    for step in range(total_steps):
        canvas = review_background((1920, 920))
        draw = ImageDraw.Draw(canvas)
        label(draw, (40, 24), "MAHFITT MOTION PREVIEW", 34, (221, 239, 255), True)
        for col, (name, title) in enumerate(selections):
            label(draw, (col * 320 + 108, 78), title, 18, (118, 207, 255), True)
            for row, character in enumerate(("female", "male")):
                seq = package[character]["animations"][name]["frames_data"]
                index = int(step / total_steps * len(seq)) % len(seq)
                frame = compose(seq[index]).resize((300, 300), Image.Resampling.NEAREST)
                x, y = col * 320 + 10, 120 + row * 370
                canvas.paste(frame, (x, y), frame)
                if col == 0:
                    label(draw, (16, y + 300), character.upper(), 17, (175, 217, 246), True)
        frames_out.append(canvas.convert("P", palette=Image.Palette.ADAPTIVE, colors=192))
    path = REVIEW / "MAHFITT_MOTION_PREVIEW.gif"
    frames_out[0].save(path, save_all=True, append_images=frames_out[1:], duration=100, loop=0, optimize=False, disposal=2)
    return path


def build_review_package(masters_by_character: dict[str, dict[str, PixelFrame]], package: dict[str, dict]) -> dict[str, Path]:
    female = build_character_review("female", masters_by_character["female"], package["female"])
    male = build_character_review("male", masters_by_character["male"], package["male"])
    owner = build_owner_review(masters_by_character, package)
    motion = build_motion_preview(package)
    return {"female": female, "male": male, "owner": owner, "motion": motion}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", choices=("static", "all"), default="all")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    STYLE.mkdir(parents=True, exist_ok=True)
    masters = build_static_masters()
    if args.stage == "all":
        theme_preview = build_theme_system(masters)
        package = build_animation_package(masters)
        review = build_review_package(masters, package)
        payload = {
            "masters": str(MASTERS),
            "frames": str(FRAMES),
            "atlases": str(ATLASES),
            "manifests": str(MANIFESTS),
            "themeSystem": str(theme_preview),
            "review": {key: str(value) for key, value in review.items()},
            "canvas": [CANVAS, CANVAS],
            "animationsPerCharacter": len(package["female"]["animations"]),
        }
    else:
        payload = {"masters": str(MASTERS), "canvas": [CANVAS, CANVAS]}
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
