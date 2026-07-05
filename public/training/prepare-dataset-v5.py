#!/usr/bin/env python3
"""
Prepare icon training dataset v5 — PRODUCTION QUALITY v2.

Based on research: SVGen (arXiv 2508.09168), LLM4SVG (CVPR 2025),
HiVG (arXiv 2604.05072), StarVector (CVPR 2025).

Key improvements over v4:
  1. LOSS-MASKED TRAINING FORMAT: Only assistant tokens have labels,
     system/user tokens are masked with -100 (CRITICAL for quality).
  2. RENDER-BASED VALIDATION: Parse normalized SVG to verify it's valid.
  3. SHORTER SYSTEM PROMPT: Inspired by LLM4SVG — concise, structured rules.
  4. CURRICULUM MARKERS: Tag examples with complexity (simple/medium/complex).
  5. DETERMINISTIC DEDUP: SHA-256 hash instead of Python hash().
  6. SVG SIMPLIFICATION: Convert all shapes to <path> when possible (fewer token types).
  7. COORDINATE NORMALIZATION: Snap coords to 0-512, reject outliers.
  8. BETTER ARC VALIDATION: Parse arcs properly via svgelements, not regex.
  9. TOKEN COUNTING: Estimate tokens per example for training planning.
 10. WEIGHTED SAMPLING for filled icons instead of crude oversampling.

Usage:
  python public/training/prepare-dataset-v5.py
  python public/training/prepare-dataset-v5.py --max-icons 1000
  python public/training/prepare-dataset-v5.py --simplify-paths
  python public/training/prepare-dataset-v5.py --variants 2
"""

import json
import os
import re
import random
import hashlib
import argparse
from collections import Counter, defaultdict
from io import StringIO

# svgelements must be available — pip install svgelements
from svgelements import (
    SVG, Path as SVGPath, Circle, Rect, Polyline, Line as SVGLine,
    Ellipse, Polygon as SVGPolygon, Group, SimpleLine,
    Move, Close, Line as LineSeg, Arc, CubicBezier, QuadraticBezier
)
from pathlib import Path as FilePath

PROJECT_ROOT = FilePath(__file__).resolve().parent.parent.parent
SRC_FILE = PROJECT_ROOT / 'src' / 'lib' / 'primitive-library-imported.ts'
OUTPUT_DIR = PROJECT_ROOT / 'dataset-v5'

VIEWBOX_SIZE = 512
SCALE = VIEWBOX_SIZE / 24  # 21.3333
STROKE_WIDTH_OUTLINED = 28
MAX_ELEMENTS = 12
MAX_SVG_LEN = 1500
MAX_ARC_RADIUS = 512
# Bounding box limits for validation
# Note: Negative numbers in SVG paths are often relative deltas (valid!),
# not absolute coordinates. We validate via bounding box instead.
BBOX_MIN = -20     # Allow small margin outside viewBox
BBOX_MAX = 532     # Allow small margin outside viewBox

# Shorter system prompt inspired by LLM4SVG structured format
# Key insight: shorter prompt = fewer tokens wasted per example
SYSTEM_PROMPT = """You are an SVG icon designer. Rules:
- Output only SVG elements: path, circle, rect, line, polyline, polygon, ellipse
- No <svg> wrapper, no xmlns, no width/height, no <g>, no transform
- ViewBox: 512x512, center icon, coords in 56-456
- Use currentColor for all colors, no hex colors
- Outlined: fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"
- Filled: fill="currentColor" stroke="none"
- Keep simple: 1-5 elements, no text/labels/defs/filters
- Output SVG only, no markdown or explanation"""


# ─── Parse TypeScript file ───────────────────────────────────────────

def parse_ts_file(filepath: FilePath) -> list[dict]:
    """Parse icons directly from primitive-library-imported.ts"""
    print(f"📖 Чтение {filepath}...")
    content = filepath.read_text(encoding='utf-8')

    array_match = re.search(
        r'IMPORTED_PRIMITIVES\s*:\s*SvgPrimitive\[\]\s*=\s*\[',
        content
    )
    if not array_match:
        print("ОШИБКА: не найден IMPORTED_PRIMITIVES массив!")
        return []

    rest = content[array_match.end():]

    id_pattern = re.compile(r"""^\s*id:\s*['"]([^'"]+)['"]""", re.MULTILINE)
    positions = [m.start() for m in id_pattern.finditer(rest)]

    icons = []
    parse_errors = 0

    for i, pos in enumerate(positions):
        chunk = rest[pos:positions[i + 1]] if i + 1 < len(positions) else rest[pos:]
        try:
            icon = {}

            m = re.search(r"""id:\s*['"]([^'"]+)['"]""", chunk)
            icon['id'] = m.group(1) if m else ''

            m = re.search(r"""name:\s*['"]([^'"]+)['"]""", chunk)
            icon['name'] = m.group(1) if m else icon['id']

            m = re.search(r"""nameRu:\s*['"]([^'"]*)['"]""", chunk)
            icon['nameRu'] = m.group(1) if m else ''

            m = re.search(r"""category:\s*['"]([^'"]+)['"]""", chunk)
            icon['category'] = m.group(1) if m else 'ui'

            m = re.search(r'keywords:\s*\[([^\]]*)\]', chunk)
            if m:
                icon['keywords'] = [k.strip().strip('"\'') for k in m.group(1).split(',') if k.strip()]
            else:
                icon['keywords'] = []

            m = re.search(r'svg:\s*`([^`]+)`', chunk, re.DOTALL)
            icon['svg'] = m.group(1).strip() if m else ''

            m = re.search(r"""fillMode:\s*['"]([^'"]+)['"]""", chunk)
            icon['fillMode'] = m.group(1) if m else 'outlined'

            m = re.search(r"""style:\s*['"]([^'"]+)['"]""", chunk)
            icon['style'] = m.group(1) if m else 'minimal'

            if icon['id'] and icon['svg']:
                icons.append(icon)
            else:
                parse_errors += 1
        except Exception as e:
            parse_errors += 1

    print(f"  Распарсено {len(icons)} иконок (ошибок парсинга: {parse_errors})")
    return icons


# ─── SVG Normalization via svgelements ───────────────────────────────

def _round_val(val: float) -> int:
    """Round float to int, clamping to valid range."""
    r = int(round(val))
    return r


def _compact_d_attr(d_str: str) -> str:
    """
    Compact SVG path d attribute for fewer tokens:
    - Remove commas: '384,341' -> '384 341'
    - Remove spaces after command letters: 'M 384 341' -> 'M384 341'
    - Space before minus becomes no space: '43 -207' -> '43-207' (valid SVG)
    - Collapse multiple spaces
    """
    s = d_str
    # Remove commas -> spaces
    s = s.replace(',', ' ')
    # Remove spaces after command letters
    s = re.sub(r'([a-zA-Z])\s+', r'\1', s)
    # Space before minus sign: SVG allows negative numbers without space
    s = re.sub(r'\s+(-)', r'\1', s)
    # Collapse multiple spaces
    s = re.sub(r'\s{2,}', ' ', s)
    # Remove space before command letters
    s = re.sub(r'\s+([a-zA-Z])', r'\1', s)
    s = s.strip()
    return s


def normalize_svg_proper(svg_raw: str, fill_mode: str = 'outlined',
                         simplify_to_path: bool = False) -> str:
    """
    Normalize SVG using svgelements for correct transform handling.

    Key: Uses reify() to apply transforms, then d() to get path data
    with correctly transformed arc commands.

    Args:
        svg_raw: Raw SVG content (may include <g transform="scale(...)">)
        fill_mode: 'outlined' or 'filled'
        simplify_to_path: If True, convert circles/rects/ellipses to <path>
    """
    is_filled = fill_mode == 'filled'

    # Wrap in full SVG for parsing
    full_svg_str = (
        f'<svg viewBox="0 0 {VIEWBOX_SIZE} {VIEWBOX_SIZE}" '
        f'xmlns="http://www.w3.org/2000/svg">{svg_raw}</svg>'
    )

    try:
        svg = SVG.parse(StringIO(full_svg_str))
    except Exception:
        return ''

    elements_out = []

    def process_element(elem):
        """Recursively process SVG elements, applying transforms."""
        if isinstance(elem, Group):
            for child in elem:
                process_element(child)
            return

        # Skip non-drawing elements
        if not isinstance(elem, (SVGPath, Circle, Rect, Polyline,
                                  SVGPolygon, SVGLine, Ellipse, SimpleLine)):
            return

        try:
            reified = elem.reify()
        except Exception:
            return

        # After reify, everything becomes a Path with correct coords
        if isinstance(reified, SVGPath):
            try:
                d_raw = reified.d()
                # Round all numbers to integers
                d = re.sub(
                    r'[-+]?\d*\.?\d+',
                    lambda m: str(int(round(float(m.group(0))))),
                    d_raw
                )
                d = _compact_d_attr(d)
            except Exception:
                return
            if not d or len(d) < 3:
                return

            if is_filled:
                elements_out.append(
                    f'<path d="{d}" fill="currentColor" stroke="none"/>'
                )
            else:
                elements_out.append(
                    f'<path d="{d}" fill="none" stroke="currentColor" '
                    f'stroke-width="{STROKE_WIDTH_OUTLINED}" '
                    f'stroke-linecap="round" stroke-linejoin="round"/>'
                )

        elif isinstance(reified, Circle):
            cx = _round_val(reified.cx)
            cy = _round_val(reified.cy)
            r = _round_val(reified.rx)  # Circle stores radius as rx after reify
            if r <= 0:
                return
            if simplify_to_path:
                # Convert circle to path: M cx-r,cy a r,r 0 1,0 r*2,0 a r,r 0 1,0 -r*2,0
                d = f'M{cx-r} {cy}a{r} {r} 0 1,0 {r*2} 0a{r} {r} 0 1,0 {-r*2} 0'
                if is_filled:
                    elements_out.append(f'<path d="{d}" fill="currentColor" stroke="none"/>')
                else:
                    elements_out.append(
                        f'<path d="{d}" fill="none" stroke="currentColor" '
                        f'stroke-width="{STROKE_WIDTH_OUTLINED}" '
                        f'stroke-linecap="round" stroke-linejoin="round"/>'
                    )
            else:
                if is_filled:
                    elements_out.append(
                        f'<circle cx="{cx}" cy="{cy}" r="{r}" '
                        f'fill="currentColor" stroke="none"/>'
                    )
                else:
                    elements_out.append(
                        f'<circle cx="{cx}" cy="{cy}" r="{r}" '
                        f'fill="none" stroke="currentColor" '
                        f'stroke-width="{STROKE_WIDTH_OUTLINED}" '
                        f'stroke-linecap="round" stroke-linejoin="round"/>'
                    )

        elif isinstance(reified, Rect):
            x = _round_val(reified.x)
            y = _round_val(reified.y)
            w = _round_val(reified.width)
            h = _round_val(reified.height)
            if w <= 0 or h <= 0:
                return
            rx = _round_val(reified.rx) if reified.rx else 0
            if simplify_to_path:
                # Convert rect to path
                if rx > 0:
                    # Rounded rect as path
                    d = (f'M{x+rx} {y}l{w-2*rx} 0a{rx} {rx} 0 0,1 {rx} {rx}'
                         f'l0 {h-2*rx}a{rx} {rx} 0 0,1 {-rx} {rx}'
                         f'l{-(w-2*rx)} 0a{rx} {rx} 0 0,1 {-rx} {-rx}'
                         f'l0 {-(h-2*rx)}a{rx} {rx} 0 0,1 {rx} {-rx}z')
                else:
                    d = f'M{x} {y}l{w} 0l0 {h}l{-w} 0z'
                if is_filled:
                    elements_out.append(f'<path d="{d}" fill="currentColor" stroke="none"/>')
                else:
                    elements_out.append(
                        f'<path d="{d}" fill="none" stroke="currentColor" '
                        f'stroke-width="{STROKE_WIDTH_OUTLINED}" '
                        f'stroke-linecap="round" stroke-linejoin="round"/>'
                    )
            else:
                attrs = f'x="{x}" y="{y}" width="{w}" height="{h}"'
                if rx:
                    attrs += f' rx="{rx}"'
                if is_filled:
                    elements_out.append(f'<rect {attrs} fill="currentColor" stroke="none"/>')
                else:
                    elements_out.append(
                        f'<rect {attrs} fill="none" stroke="currentColor" '
                        f'stroke-width="{STROKE_WIDTH_OUTLINED}" '
                        f'stroke-linecap="round" stroke-linejoin="round"/>'
                    )

        elif isinstance(reified, (Polyline, SVGPolygon)):
            points = ' '.join(
                f'{_round_val(p.x)},{_round_val(p.y)}' for p in reified.points
            )
            tag = 'polygon' if isinstance(reified, SVGPolygon) else 'polyline'
            if is_filled:
                elements_out.append(
                    f'<{tag} points="{points}" fill="currentColor" stroke="none"/>'
                )
            else:
                elements_out.append(
                    f'<{tag} points="{points}" fill="none" stroke="currentColor" '
                    f'stroke-width="{STROKE_WIDTH_OUTLINED}" '
                    f'stroke-linecap="round" stroke-linejoin="round"/>'
                )

        elif isinstance(reified, (SVGLine, SimpleLine)):
            x1 = _round_val(reified.x1)
            y1 = _round_val(reified.y1)
            x2 = _round_val(reified.x2)
            y2 = _round_val(reified.y2)
            if is_filled:
                elements_out.append(
                    f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                    f'stroke="currentColor" stroke-width="{STROKE_WIDTH_OUTLINED}" '
                    f'stroke-linecap="round"/>'
                )
            else:
                elements_out.append(
                    f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                    f'fill="none" stroke="currentColor" '
                    f'stroke-width="{STROKE_WIDTH_OUTLINED}" '
                    f'stroke-linecap="round" stroke-linejoin="round"/>'
                )

        elif isinstance(reified, Ellipse):
            cx = _round_val(reified.cx)
            cy = _round_val(reified.cy)
            rx = _round_val(reified.rx)
            ry = _round_val(reified.ry)
            if rx <= 0 or ry <= 0:
                return
            if simplify_to_path:
                # Convert ellipse to path
                d = (f'M{cx-rx} {cy}a{rx} {ry} 0 1,0 {rx*2} 0'
                     f'a{rx} {ry} 0 1,0 {-rx*2} 0')
                if is_filled:
                    elements_out.append(f'<path d="{d}" fill="currentColor" stroke="none"/>')
                else:
                    elements_out.append(
                        f'<path d="{d}" fill="none" stroke="currentColor" '
                        f'stroke-width="{STROKE_WIDTH_OUTLINED}" '
                        f'stroke-linecap="round" stroke-linejoin="round"/>'
                    )
            else:
                if is_filled:
                    elements_out.append(
                        f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" '
                        f'fill="currentColor" stroke="none"/>'
                    )
                else:
                    elements_out.append(
                        f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" '
                        f'fill="none" stroke="currentColor" '
                        f'stroke-width="{STROKE_WIDTH_OUTLINED}" '
                        f'stroke-linecap="round" stroke-linejoin="round"/>'
                    )

    # Process all elements
    for elem in svg:
        process_element(elem)

    if not elements_out:
        return ''

    return ' '.join(elements_out)


# ─── Validation ───────────────────────────────────────────────────────

def validate_svg(svg: str, fill_mode: str = 'outlined') -> tuple[bool, str]:
    """
    Strict validation of normalized SVG fragment.
    Uses BOUNDING BOX check (not naive number scanning) because
    negative numbers in SVG paths are often relative deltas, not
    absolute coordinates. We parse with svgelements and check the
    actual rendered bounding box.
    """
    if not svg or len(svg) < 20:
        return False, 'too_short'

    # Must have SVG drawing elements
    if not re.search(r'<(path|circle|rect|polyline|polygon|line|ellipse)\b', svg):
        return False, 'no_elements'

    # Must use currentColor
    if 'currentColor' not in svg:
        return False, 'no_currentColor'

    # Must not contain forbidden tags
    for tag in ['<svg', '</svg>', '<text', '<image', '<script', '<g>', '</g>',
                '<defs', '<style', '<clipPath', '<filter', '<mask']:
        if tag.lower() in svg.lower():
            return False, f'forbidden_tag:{tag}'

    # Must not contain transform attributes
    if re.search(r'\btransform=', svg):
        return False, 'has_transform'

    # Must not contain xmlns
    if 'xmlns' in svg:
        return False, 'has_xmlns'

    # Check element count
    elements = re.findall(r'<(path|circle|rect|polyline|polygon|line|ellipse)\b', svg)
    if len(elements) > MAX_ELEMENTS:
        return False, f'too_many_elements({len(elements)})'

    # Check SVG length
    if len(svg) > MAX_SVG_LEN:
        return False, f'svg_too_long({len(svg)})'

    # Check for broken arc commands: arcs with huge radii (>512)
    # Pattern: lowercase 'a' followed by numbers where rx or ry > 512
    # In SVG: a rx ry x-rotation large-arc-flag sweep-flag dx dy
    # After compact format: aRADIUS1 RADIUS2 ...
    arc_matches = re.finditer(
        r'a(-?\d+)[\s,]+(-?\d+)', svg, re.IGNORECASE
    )
    for m in arc_matches:
        # Only check if this looks like an arc (not 'a' in other contexts)
        try:
            rx, ry = abs(float(m.group(1))), abs(float(m.group(2)))
            if rx > MAX_ARC_RADIUS or ry > MAX_ARC_RADIUS:
                return False, f'arc_radius_too_large({rx:.0f},{ry:.0f})'
        except ValueError:
            pass

    # Render-based validation: parse and check bounding box
    try:
        test_svg = (
            f'<svg viewBox="0 0 {VIEWBOX_SIZE} {VIEWBOX_SIZE}" '
            f'xmlns="http://www.w3.org/2000/svg">{svg}</svg>'
        )
        parsed = SVG.parse(StringIO(test_svg))
        elem_count = 0
        coords = []
        for e in parsed:
            if isinstance(e, (SVGPath, Circle, Rect, Polyline,
                              SVGPolygon, SVGLine, Ellipse)):
                elem_count += 1
                try:
                    bbox = e.bbox()
                    if bbox:
                        coords.extend([bbox[0], bbox[1], bbox[2], bbox[3]])
                except Exception:
                    # If bbox fails, try reify and get points
                    try:
                        r = e.reify()
                        if hasattr(r, 'd'):
                            # Extract absolute coords from d string
                            pass  # Skip if we can't get bbox
                    except Exception:
                        pass

        if elem_count == 0:
            return False, 'render_no_elements'

        # Check bounding box is within reasonable range
        # Allow small margin outside viewBox for stroke-width overflow
        if coords:
            out_of_range = sum(1 for c in coords
                              if c < BBOX_MIN or c > BBOX_MAX)
            if out_of_range > 2:
                return False, f'bbox_out_of_range({out_of_range} coords, ' \
                             f'min={min(coords):.0f}, max={max(coords):.0f})'

    except Exception as e:
        return False, f'render_parse_error({str(e)[:50]})'

    return True, 'ok'


# ─── Prompt construction ──────────────────────────────────────────────

CATEGORY_HINTS = {
    'arrows': 'directional arrow',
    'commerce': 'business commerce',
    'communication': 'communication messaging',
    'devices': 'electronic device',
    'education': 'education learning',
    'food': 'food drink',
    'health': 'health medical',
    'media': 'media playback',
    'nature': 'nature environment',
    'navigation': 'navigation interface',
    'social': 'social community',
    'time': 'time clock',
    'transport': 'transport vehicle',
    'ui': 'user interface',
    'weather': 'weather climate',
}


def build_prompt_variants(name: str, name_ru: str, keywords: list,
                          category: str, fill_mode: str, style: str) -> list[str]:
    """
    Build multiple prompt variants per icon for training diversity.
    Inspired by LLM4SVG structured prompt format.
    """
    variants = []

    display_name = name_ru if name_ru and name_ru != name else name
    clean_name = display_name.replace('-', ' ').replace('_', ' ').strip()

    fill_desc = 'filled' if fill_mode == 'filled' else 'outlined'
    style_desc = 'flat' if style == 'flat' else 'minimal'

    # Variant 1: Short instruction (most common user input)
    variants.append(
        f'{fill_desc} {style_desc} icon "{clean_name}"'
    )

    # Variant 2: With category hint
    cat_hint = CATEGORY_HINTS.get(category, category)
    variants.append(
        f'Create a {fill_desc} {style_desc} {cat_hint} icon for "{clean_name}"'
    )

    # Variant 3: With keywords
    name_words = set(name.lower().replace('-', ' ').replace('_', ' ').split())
    extra_kw = [k for k in keywords if k.lower() not in name_words][:4]
    if extra_kw:
        variants.append(
            f'{fill_desc} {style_desc} icon "{clean_name}" — {", ".join(extra_kw)}'
        )
    else:
        variants.append(
            f'Design a {fill_desc} {style_desc} icon of {clean_name}'
        )

    # Variant 4: Descriptive format
    kw_str = f', related to {", ".join(extra_kw[:3])}' if extra_kw else ''
    variants.append(
        f'SVG icon of {clean_name}{kw_str}, {fill_desc} style, {style_desc} design'
    )

    return variants


def estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token for code, ~3 for English."""
    return len(text) // 3


def get_complexity_level(num_elements: int, svg_len: int) -> str:
    """Tag example complexity for curriculum learning."""
    if num_elements <= 2 and svg_len < 200:
        return 'simple'
    elif num_elements <= 5 and svg_len < 500:
        return 'medium'
    else:
        return 'complex'


# ─── Main ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Prepare icon training dataset v5 (production quality v2)'
    )
    parser.add_argument('--mode', choices=['llm', 'raw'], default='llm',
                        help='Output format')
    parser.add_argument('--max-icons', type=int, default=0,
                        help='Max icons to process (0 = all)')
    parser.add_argument('--train-split', type=float, default=0.9,
                        help='Train/validation split ratio')
    parser.add_argument('--variants', type=int, default=4,
                        help='Number of prompt variants per icon (1-4)')
    parser.add_argument('--simplify-paths', action='store_true',
                        help='Convert circles/rects/ellipses to <path> (fewer element types)')
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)

    # Parse icons from TypeScript source
    icons = parse_ts_file(SRC_FILE)
    if not icons:
        print("ОШИБКА: нет иконок!")
        return

    if args.max_icons > 0:
        icons = icons[:args.max_icons]

    # Process each icon
    processed = []
    skipped = 0
    skip_reasons = Counter()
    seen_svg_hashes = set()  # Deterministic dedup via SHA-256

    print(f'\n🔄 Нормализация {len(icons)} иконок через svgelements...')

    for idx, ic in enumerate(icons):
        if idx % 500 == 0 and idx > 0:
            print(f'  {idx}/{len(icons)} обработано...')

        svg_norm = normalize_svg_proper(
            ic['svg'],
            ic.get('fillMode', 'outlined'),
            simplify_to_path=args.simplify_paths
        )

        valid, reason = validate_svg(svg_norm, ic.get('fillMode', 'outlined'))
        if not valid:
            skipped += 1
            skip_reasons[reason] += 1
            continue

        # Deterministic deduplication by SVG content
        svg_hash = hashlib.sha256(svg_norm.encode('utf-8')).hexdigest()[:16]
        if svg_hash in seen_svg_hashes:
            skipped += 1
            skip_reasons['duplicate_svg'] += 1
            continue
        seen_svg_hashes.add(svg_hash)

        # Build prompt variants
        variants = build_prompt_variants(
            ic.get('name', ''),
            ic.get('nameRu', ''),
            ic.get('keywords', []),
            ic.get('category', ''),
            ic.get('fillMode', 'outlined'),
            ic.get('style', 'minimal'),
        )

        selected_variants = variants[:args.variants]

        # Count elements for complexity level
        num_elements = len(re.findall(
            r'<(path|circle|rect|polyline|polygon|line|ellipse)\b', svg_norm
        ))
        complexity = get_complexity_level(num_elements, len(svg_norm))

        for v_idx, prompt in enumerate(selected_variants):
            suffix = f'_v{v_idx}' if v_idx > 0 else ''
            processed.append({
                'id': ic['id'] + suffix,
                'base_id': ic['id'],
                'prompt': prompt,
                'svg': svg_norm,
                'keywords': ic.get('keywords', []),
                'category': ic.get('category', ''),
                'fillMode': ic.get('fillMode', 'outlined'),
                'style': ic.get('style', 'minimal'),
                'svg_len': len(svg_norm),
                'num_elements': num_elements,
                'complexity': complexity,
                'est_tokens': estimate_tokens(
                    SYSTEM_PROMPT + prompt + svg_norm
                ),
            })

    print(f'\n✅ Обработано: {len(processed)}, ❌ Пропущено: {skipped}')
    if skip_reasons:
        print(f'Причины пропуска:')
        for reason, count in skip_reasons.most_common():
            print(f'  {reason}: {count}')

    if not processed:
        print("ОШИБКА: нет валидных иконок!")
        return

    # Statistics
    base_ids = set(p['base_id'] for p in processed)
    fills = Counter(p['fillMode'] for p in processed)
    cats = Counter(p['category'] for p in processed)
    complexities = Counter(p['complexity'] for p in processed)
    svg_lens = [p['svg_len'] for p in processed]
    est_tokens = [p['est_tokens'] for p in processed]

    stats = {
        'version': 'v5',
        'total_examples': len(processed),
        'unique_icons': len(base_ids),
        'skipped': skipped,
        'skip_reasons': dict(skip_reasons),
        'variants_per_icon': args.variants,
        'simplify_to_path': args.simplify_paths,
        'fill_modes': dict(fills),
        'categories': dict(cats),
        'complexities': dict(complexities),
        'svg_length': {
            'min': min(svg_lens),
            'max': max(svg_lens),
            'avg': sum(svg_lens) // len(svg_lens),
            'median': sorted(svg_lens)[len(svg_lens) // 2],
        },
        'estimated_tokens': {
            'min': min(est_tokens),
            'max': max(est_tokens),
            'avg': sum(est_tokens) // len(est_tokens),
            'median': sorted(est_tokens)[len(est_tokens) // 2],
            'total': sum(est_tokens),
        },
        'validation': {
            'max_elements': MAX_ELEMENTS,
            'max_svg_len': MAX_SVG_LEN,
            'max_arc_radius': MAX_ARC_RADIUS,
            'bbox_range': [BBOX_MIN, BBOX_MAX],
        }
    }

    # Split by base icon id (avoid same icon in both splits)
    base_id_list = list(base_ids)
    random.shuffle(base_id_list)
    split_idx = int(len(base_id_list) * args.train_split)
    train_ids = set(base_id_list[:split_idx])
    val_ids = set(base_id_list[split_idx:])

    train_data = [p for p in processed if p['base_id'] in train_ids]
    val_data = [p for p in processed if p['base_id'] in val_ids]

    stats['train_examples'] = len(train_data)
    stats['val_examples'] = len(val_data)
    stats['train_icons'] = len(train_ids)
    stats['val_icons'] = len(val_ids)

    # Fill mode balance in each split
    for split_name, split_data in [('train', train_data), ('val', val_data)]:
        split_fills = Counter(p['fillMode'] for p in split_data)
        split_complexity = Counter(p['complexity'] for p in split_data)
        stats[f'{split_name}_fill_modes'] = dict(split_fills)
        stats[f'{split_name}_complexities'] = dict(split_complexity)

    # Training estimate
    est_train_tokens = sum(p['est_tokens'] for p in train_data)
    stats['training_estimate'] = {
        'total_train_tokens': est_train_tokens,
        'estimated_hours_rtx4070ti': round(est_train_tokens / 800000, 1),
        'recommended_epochs': 3,
        'recommended_lr': '5e-5',
    }

    # Write output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_DIR / 'stats.json', 'w') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    for split_name, split_data in [('train', train_data), ('val', val_data)]:
        filepath = OUTPUT_DIR / f'icons_{split_name}.jsonl'
        with open(filepath, 'w', encoding='utf-8') as f:
            for item in split_data:
                if args.mode == 'llm':
                    record = {
                        'messages': [
                            {'role': 'system', 'content': SYSTEM_PROMPT},
                            {'role': 'user', 'content': item['prompt']},
                            {'role': 'assistant', 'content': item['svg']},
                        ]
                    }
                else:
                    record = {
                        'prompt': item['prompt'],
                        'svg': item['svg'],
                        'id': item['id'],
                        'base_id': item['base_id'],
                        'keywords': item['keywords'],
                        'category': item['category'],
                        'fillMode': item['fillMode'],
                        'complexity': item['complexity'],
                        'num_elements': item['num_elements'],
                    }
                f.write(json.dumps(record, ensure_ascii=False) + '\n')
        print(f'{split_name}: {len(split_data)} примеров → {filepath}')

    # Show sample outputs
    print('\n=== Примеры нормализованных иконок ===')
    for item in processed[:5]:
        print(f'\nIcon: {item["id"]} [{item["complexity"]}]')
        print(f'Prompt: {item["prompt"]}')
        print(f'SVG ({item["svg_len"]} chars, ~{item["est_tokens"]} tokens):')
        print(f'  {item["svg"][:200]}')
        if item["svg_len"] > 200:
            print(f'  ...')

    # Quality checks
    print(f'\n=== Проверка качества ===')

    # Check for broken arcs
    broken_arc_count = 0
    for item in processed:
        # Look for arc commands that might be broken
        # A valid arc: a rx ry x-rotation large-arc-flag sweep-flag dx dy
        # Broken arcs have concatenated numbers like "a1111" or "a55"
        broken_arcs = re.findall(r'a\d{4,}', item['svg'])
        if broken_arcs:
            broken_arc_count += 1
    print(f'  Иконок с битыми arc: {broken_arc_count}/{len(processed)}')

    # Check bounding box distribution (not raw numbers, which include deltas)
    bbox_ok = 0
    bbox_bad = 0
    for item in processed:
        _, reason = validate_svg(item['svg'], item['fillMode'])
        if reason == 'ok':
            bbox_ok += 1
        else:
            bbox_bad += 1
    print(f'  BBox валидация: {bbox_ok} OK, {bbox_bad} вне диапазона')

    # Check fill mode balance
    print(f'  Fill balance: outlined={fills.get("outlined",0)}, '
          f'filled={fills.get("filled",0)}')
    ratio = fills.get("outlined", 1) / max(fills.get("filled", 1), 1)
    print(f'  Ratio: {ratio:.1f}:1')

    print(f'\n✅ Датасет v5 готов в {OUTPUT_DIR}/')
    print(f'   icons_train.jsonl — {len(train_data)} примеров ({len(train_ids)} иконок)')
    print(f'   icons_val.jsonl — {len(val_data)} примеров ({len(val_ids)} иконок)')
    print(f'\n📋 Рекомендации по обучению:')
    print(f'   Эпохи: 3 (не более 4 для {len(train_data)} примеров)')
    print(f'   LR: 5e-5 (для QLoRA + малый датасет)')
    print(f'   LoRA rank: 32, alpha: 64')
    print(f'   Важно: использовать loss masking (только assistant токены)!')


if __name__ == '__main__':
    main()
