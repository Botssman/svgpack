#!/usr/bin/env python3
"""
Prepare icon training dataset v6 — QUALITY OVER QUANTITY.

Based on analysis of v5 training failure:
  1. ONE prompt per example (was 4 identical SVGs with different prompts)
  2. BALANCED filled/outlined ratio (was 82%/18%, target ~60/40)
  3. SIMPLIFY ALL TO PATH — reduces token vocabulary, one consistent format
  4. CROSS-FILL GENERATION — generate filled version of outlined icons & vice versa
  5. FEWER but BETTER examples — quality > quantity

Why v5 failed:
  - 4 identical SVGs per icon confused the model (same output, different prompts)
  - 82% outlined = model barely learned filled style
  - 96% path elements but circle/rect/line still present = inconsistent format
  - Too many near-duplicate examples diluted the learning signal

Key research insights:
  - SVGen: simpler token vocabulary = better generation quality
  - LLM4SVG: consistent format across examples is critical
  - LoRA best practices: fewer high-quality examples > many low-quality ones

Usage:
  python public/training/prepare-dataset-v6.py
  python public/training/prepare-dataset-v6.py --max-icons 1000
  python public/training/prepare-dataset-v6.py --filled-target 0.45
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
OUTPUT_DIR = PROJECT_ROOT / 'dataset-v6'

VIEWBOX_SIZE = 512
SCALE = VIEWBOX_SIZE / 24  # 21.3333
STROKE_WIDTH_OUTLINED = 28
MAX_ELEMENTS = 12
MAX_SVG_LEN = 1500
MAX_ARC_RADIUS = 512
BBOX_MIN = -20
BBOX_MAX = 532

# CRITICAL: Shorter system prompt = fewer wasted tokens per example
SYSTEM_PROMPT = """You are an SVG icon designer. Rules:
- Output only <path> elements with d attribute
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
    print(f"Reading {filepath}...")
    content = filepath.read_text(encoding='utf-8')

    array_match = re.search(
        r'IMPORTED_PRIMITIVES\s*:\s*SvgPrimitive\[\]\s*=\s*\[',
        content
    )
    if not array_match:
        print("ERROR: IMPORTED_PRIMITIVES array not found!")
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

    print(f"  Parsed {len(icons)} icons (parse errors: {parse_errors})")
    return icons


# ─── SVG Normalization — ALWAYS simplify to <path> ───────────────────

def _round_val(val: float) -> int:
    """Round float to int, clamping to valid range."""
    return int(round(val))


def _compact_d_attr(d_str: str) -> str:
    """Compact SVG path d attribute for fewer tokens."""
    s = d_str
    s = s.replace(',', ' ')
    s = re.sub(r'([a-zA-Z])\s+', r'\1', s)
    s = re.sub(r'\s+(-)', r'\1', s)
    s = re.sub(r'\s{2,}', ' ', s)
    s = re.sub(r'\s+([a-zA-Z])', r'\1', s)
    return s.strip()


def normalize_svg_to_path(svg_raw: str, fill_mode: str = 'outlined') -> str:
    """
    Normalize SVG, converting ALL elements to <path>.
    
    Key insight from SVGen research: fewer element types = smaller token
    vocabulary = better generation quality. When the model only needs to
    learn <path d="..."> format, it can focus on the path data itself
    rather than remembering different element syntaxes.
    """
    is_filled = fill_mode == 'filled'

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
        if isinstance(elem, Group):
            for child in elem:
                process_element(child)
            return

        if not isinstance(elem, (SVGPath, Circle, Rect, Polyline,
                                  SVGPolygon, SVGLine, Ellipse, SimpleLine)):
            return

        try:
            reified = elem.reify()
        except Exception:
            return

        # Everything becomes a <path> after reify
        if isinstance(reified, SVGPath):
            try:
                d_raw = reified.d()
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
            r = _round_val(reified.rx) if hasattr(reified, 'rx') else _round_val(reified.r)
            if r <= 0:
                return
            # Circle as path: two arc commands
            d = f'M{cx-r} {cy}a{r} {r} 0 1,0 {r*2} 0a{r} {r} 0 1,0 {-r*2} 0'
            if is_filled:
                elements_out.append(f'<path d="{d}" fill="currentColor" stroke="none"/>')
            else:
                elements_out.append(
                    f'<path d="{d}" fill="none" stroke="currentColor" '
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
            if rx > 0:
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

        elif isinstance(reified, (Polyline, SVGPolygon)):
            points = reified.points
            if len(points) < 2:
                return
            # Build path from points
            d = f'M{_round_val(points[0].x)} {_round_val(points[0].y)}'
            for p in points[1:]:
                d += f'L{_round_val(p.x)} {_round_val(p.y)}'
            if isinstance(reified, SVGPolygon):
                d += 'z'
            d = _compact_d_attr(d)
            if is_filled:
                elements_out.append(f'<path d="{d}" fill="currentColor" stroke="none"/>')
            else:
                elements_out.append(
                    f'<path d="{d}" fill="none" stroke="currentColor" '
                    f'stroke-width="{STROKE_WIDTH_OUTLINED}" '
                    f'stroke-linecap="round" stroke-linejoin="round"/>'
                )

        elif isinstance(reified, (SVGLine, SimpleLine)):
            x1 = _round_val(reified.x1)
            y1 = _round_val(reified.y1)
            x2 = _round_val(reified.x2)
            y2 = _round_val(reified.y2)
            d = f'M{x1} {y1}L{x2} {y2}'
            # Lines are always stroke-based, even in "filled" mode
            if is_filled:
                elements_out.append(
                    f'<path d="{d}" stroke="currentColor" '
                    f'stroke-width="{STROKE_WIDTH_OUTLINED}" '
                    f'stroke-linecap="round"/>'
                )
            else:
                elements_out.append(
                    f'<path d="{d}" fill="none" stroke="currentColor" '
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

    for elem in svg:
        process_element(elem)

    if not elements_out:
        return ''

    return ' '.join(elements_out)


# ─── Validation ───────────────────────────────────────────────────────

def validate_svg(svg: str, fill_mode: str = 'outlined') -> tuple[bool, str]:
    """Strict validation of normalized SVG fragment."""
    if not svg or len(svg) < 20:
        return False, 'too_short'

    if not re.search(r'<path\b', svg):
        return False, 'no_path_elements'

    if 'currentColor' not in svg:
        return False, 'no_currentColor'

    for tag in ['<svg', '</svg>', '<text', '<image', '<script', '<g>', '</g>',
                '<defs', '<style', '<clipPath', '<filter', '<mask',
                '<circle', '<rect', '<line', '<ellipse', '<polyline', '<polygon']:
        if tag.lower() in svg.lower():
            return False, f'forbidden_tag:{tag}'

    if re.search(r'\btransform=', svg):
        return False, 'has_transform'

    if 'xmlns' in svg:
        return False, 'has_xmlns'

    elements = re.findall(r'<path\b', svg)
    if len(elements) > MAX_ELEMENTS:
        return False, f'too_many_elements({len(elements)})'

    if len(svg) > MAX_SVG_LEN:
        return False, f'svg_too_long({len(svg)})'

    # Check arc radii
    arc_matches = re.finditer(r'a(-?\d+)[\s,]+(-?\d+)', svg, re.IGNORECASE)
    for m in arc_matches:
        try:
            rx, ry = abs(float(m.group(1))), abs(float(m.group(2)))
            if rx > MAX_ARC_RADIUS or ry > MAX_ARC_RADIUS:
                return False, f'arc_radius_too_large({rx:.0f},{ry:.0f})'
        except ValueError:
            pass

    # Render-based validation
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
                    pass

        if elem_count == 0:
            return False, 'render_no_elements'

        if coords:
            out_of_range = sum(1 for c in coords if c < BBOX_MIN or c > BBOX_MAX)
            if out_of_range > 2:
                return False, f'bbox_out_of_range({out_of_range} coords)'

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

# v6: Diverse prompt templates — ONE per example, randomly chosen
# This avoids the v5 problem of 4 identical SVGs with different prompts
PROMPT_TEMPLATES = [
    # Short instruction (most common user input)
    lambda name, fill, style, cat, kw: f'{fill} {style} icon "{name}"',
    # With category hint
    lambda name, fill, style, cat, kw: f'Create a {fill} {style} {CATEGORY_HINTS.get(cat, cat)} icon for "{name}"',
    # With keywords
    lambda name, fill, style, cat, kw: f'{fill} {style} icon "{name}" — {", ".join(kw[:3])}' if kw else None,
    # Descriptive format
    lambda name, fill, style, cat, kw: f'SVG icon of {name}, {fill} style, {style} design',
    # Action-oriented
    lambda name, fill, style, cat, kw: f'Design a {fill} {style} icon representing {name}',
    # Ultra-short
    lambda name, fill, style, cat, kw: f'{fill} icon: {name}',
]


def build_single_prompt(name: str, name_ru: str, keywords: list,
                         category: str, fill_mode: str, style: str) -> str:
    """
    Build ONE random prompt variant per icon.
    v6 key change: each example gets ONE prompt, not 4.
    This means the model sees diverse prompts across the dataset
    but each SVG is only paired with ONE prompt.
    """
    display_name = name_ru if name_ru and name_ru != name else name
    clean_name = display_name.replace('-', ' ').replace('_', ' ').strip()

    fill_desc = 'filled' if fill_mode == 'filled' else 'outlined'
    style_desc = 'flat' if style == 'flat' else 'minimal'

    name_words = set(name.lower().replace('-', ' ').replace('_', ' ').split())
    extra_kw = [k for k in keywords if k.lower() not in name_words][:4]

    # Randomly select a template
    template = random.choice(PROMPT_TEMPLATES)
    result = template(clean_name, fill_desc, style_desc, category, extra_kw)
    
    # Fallback if template returns None (e.g., no keywords)
    if result is None:
        result = f'{fill_desc} {style_desc} icon "{clean_name}"'
    
    return result


def estimate_tokens(text: str) -> int:
    """Rough token estimate: ~3.5 chars per token for mixed code/text."""
    return len(text) // 3


def get_complexity_level(num_elements: int, svg_len: int) -> str:
    if num_elements <= 2 and svg_len < 200:
        return 'simple'
    elif num_elements <= 5 and svg_len < 500:
        return 'medium'
    else:
        return 'complex'


# ─── Main ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Prepare icon training dataset v6 (quality over quantity)'
    )
    parser.add_argument('--max-icons', type=int, default=0,
                        help='Max icons to process (0 = all)')
    parser.add_argument('--train-split', type=float, default=0.9,
                        help='Train/validation split ratio')
    parser.add_argument('--filled-target', type=float, default=0.40,
                        help='Target ratio of filled examples (0.0-1.0)')
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)

    # Parse icons from TypeScript source
    icons = parse_ts_file(SRC_FILE)
    if not icons:
        print("ERROR: no icons found!")
        return

    if args.max_icons > 0:
        icons = icons[:args.max_icons]

    # ── Step 1: Normalize all icons ──────────────────────────────
    print(f'\nNormalizing {len(icons)} icons (all to <path>)...')

    normalized_icons = []
    skipped = 0
    skip_reasons = Counter()
    seen_svg_hashes = set()

    for idx, ic in enumerate(icons):
        if idx % 500 == 0 and idx > 0:
            print(f'  {idx}/{len(icons)} processed...')

        # Normalize in ORIGINAL fill mode
        svg_norm = normalize_svg_to_path(ic['svg'], ic.get('fillMode', 'outlined'))

        valid, reason = validate_svg(svg_norm, ic.get('fillMode', 'outlined'))
        if not valid:
            skipped += 1
            skip_reasons[reason] += 1
            continue

        # Deduplicate by SVG content
        svg_hash = hashlib.sha256(svg_norm.encode('utf-8')).hexdigest()[:16]
        if svg_hash in seen_svg_hashes:
            skipped += 1
            skip_reasons['duplicate_svg'] += 1
            continue
        seen_svg_hashes.add(svg_hash)

        num_elements = len(re.findall(r'<path\b', svg_norm))
        
        normalized_icons.append({
            'id': ic['id'],
            'name': ic.get('name', ''),
            'nameRu': ic.get('nameRu', ''),
            'keywords': ic.get('keywords', []),
            'category': ic.get('category', ''),
            'fillMode': ic.get('fillMode', 'outlined'),
            'style': ic.get('style', 'minimal'),
            'svg_outlined': svg_norm if ic.get('fillMode') == 'outlined' else None,
            'svg_filled': None,  # Will be generated later
            'num_elements': num_elements,
            'svg_len': len(svg_norm),
            'complexity': get_complexity_level(num_elements, len(svg_norm)),
        })

    print(f'\nNormalized: {len(normalized_icons)}, Skipped: {skipped}')
    if skip_reasons:
        print('Skip reasons:')
        for reason, count in skip_reasons.most_common():
            print(f'  {reason}: {count}')

    # ── Step 2: Generate cross-fill variants ─────────────────────
    # For outlined icons, also generate a filled version
    # This balances the dataset and teaches the model the fill/stroke distinction
    print(f'\nGenerating cross-fill variants...')

    for ic in normalized_icons:
        if ic['svg_outlined'] is not None:
            # Generate filled version from the same source SVG
            svg_filled = normalize_svg_to_path(
                next(orig['svg'] for orig in icons if orig['id'] == ic['id']),
                'filled'
            )
            valid, reason = validate_svg(svg_filled, 'filled')
            if valid and svg_filled:
                ic['svg_filled'] = svg_filled

    # Count how many we got
    has_outlined = sum(1 for ic in normalized_icons if ic['svg_outlined'])
    has_filled = sum(1 for ic in normalized_icons if ic['svg_filled'])
    print(f'  Outlined versions: {has_outlined}')
    print(f'  Filled versions: {has_filled}')

    # ── Step 3: Build training examples ──────────────────────────
    # KEY CHANGE: ONE prompt per example, balanced fill modes
    print(f'\nBuilding training examples (1 prompt per example)...')

    examples = []

    for ic in normalized_icons:
        # Always add the original fill mode variant
        original_svg = ic['svg_outlined'] if ic['fillMode'] == 'outlined' else ic['svg_filled']
        if original_svg:
            prompt = build_single_prompt(
                ic['name'], ic['nameRu'], ic['keywords'],
                ic['category'], ic['fillMode'], ic['style']
            )
            examples.append({
                'id': ic['id'],
                'prompt': prompt,
                'svg': original_svg,
                'fillMode': ic['fillMode'],
                'category': ic['category'],
                'complexity': ic['complexity'],
                'num_elements': ic['num_elements'],
                'svg_len': len(original_svg),
            })

        # Add cross-fill variant (outlined icon -> filled, or vice versa)
        if ic['fillMode'] == 'outlined' and ic['svg_filled']:
            # Add filled variant of outlined icon
            filled_prompt = build_single_prompt(
                ic['name'], ic['nameRu'], ic['keywords'],
                ic['category'], 'filled', ic['style']
            )
            examples.append({
                'id': ic['id'] + '_filled',
                'prompt': filled_prompt,
                'svg': ic['svg_filled'],
                'fillMode': 'filled',
                'category': ic['category'],
                'complexity': ic['complexity'],
                'num_elements': ic['num_elements'],
                'svg_len': len(ic['svg_filled']),
            })
        elif ic['fillMode'] == 'filled' and ic['svg_outlined']:
            # Add outlined variant of filled icon (less common)
            outlined_prompt = build_single_prompt(
                ic['name'], ic['nameRu'], ic['keywords'],
                ic['category'], 'outlined', ic['style']
            )
            examples.append({
                'id': ic['id'] + '_outlined',
                'prompt': outlined_prompt,
                'svg': ic['svg_outlined'],
                'fillMode': 'outlined',
                'category': ic['category'],
                'complexity': ic['complexity'],
                'num_elements': ic['num_elements'],
                'svg_len': len(ic['svg_outlined']),
            })

    print(f'  Total examples: {len(examples)}')

    # ── Step 4: Balance fill modes ───────────────────────────────
    fills = Counter(e['fillMode'] for e in examples)
    print(f'  Before balancing: outlined={fills.get("outlined",0)}, filled={fills.get("filled",0)}')

    # If filled is underrepresented, oversample filled examples
    outlined_exs = [e for e in examples if e['fillMode'] == 'outlined']
    filled_exs = [e for e in examples if e['fillMode'] == 'filled']

    target_filled = int(len(examples) * args.filled_target)
    current_filled = len(filled_exs)

    if current_filled < target_filled:
        # Oversample filled examples
        oversample_count = target_filled - current_filled
        oversampled = random.choices(filled_exs, k=oversample_count)
        # Add with modified IDs to avoid confusion
        for i, ex in enumerate(oversampled):
            new_ex = ex.copy()
            new_ex['id'] = f'{ex["id"]}_os{i}'
            # Generate a different prompt for variety
            new_ex['prompt'] = build_single_prompt(
                ex['id'].replace('_filled', '').replace('_outlined', '').replace('-', ' '),
                '', [], ex['category'], 'filled', 'flat'
            )
            examples.append(new_ex)
        print(f'  Oversampled {oversample_count} filled examples')

    # Final count
    fills = Counter(e['fillMode'] for e in examples)
    print(f'  After balancing: outlined={fills.get("outlined",0)}, filled={fills.get("filled",0)}')
    filled_ratio = fills.get('filled', 0) / len(examples)
    print(f'  Filled ratio: {filled_ratio:.1%}')

    if not examples:
        print("ERROR: no valid examples!")
        return

    # ── Step 5: Split and write ──────────────────────────────────
    # Split by base icon id (avoid same icon in both splits)
    base_ids = list(set(e['id'].split('_filled')[0].split('_outlined')[0].split('_os')[0] for e in examples))
    random.shuffle(base_ids)
    split_idx = int(len(base_ids) * args.train_split)
    train_ids = set(base_ids[:split_idx])
    val_ids = set(base_ids[split_idx:])

    train_data = [e for e in examples if e['id'].split('_filled')[0].split('_outlined')[0].split('_os')[0] in train_ids]
    val_data = [e for e in examples if e['id'].split('_filled')[0].split('_outlined')[0].split('_os')[0] in val_ids]

    # Statistics
    stats = {
        'version': 'v6',
        'total_examples': len(examples),
        'unique_icons': len(base_ids),
        'skipped': skipped,
        'skip_reasons': dict(skip_reasons),
        'key_changes': [
            'ONE prompt per example (not 4)',
            'ALL elements converted to <path>',
            'Cross-fill generation (outlined->filled and vice versa)',
            'Balanced filled/outlined ratio',
            'Shorter system prompt',
        ],
        'fill_modes': dict(fills),
        'categories': dict(Counter(e['category'] for e in examples)),
        'complexities': dict(Counter(e['complexity'] for e in examples)),
        'svg_length': {
            'min': min(e['svg_len'] for e in examples),
            'max': max(e['svg_len'] for e in examples),
            'avg': sum(e['svg_len'] for e in examples) // len(examples),
            'median': sorted(e['svg_len'] for e in examples)[len(examples) // 2],
        },
        'estimated_tokens': {
            'min': estimate_tokens(SYSTEM_PROMPT + min(e['prompt'] for e in examples) + min(e['svg'] for e in examples)),
            'max': estimate_tokens(SYSTEM_PROMPT + max(e['prompt'] for e in examples) + max(e['svg'] for e in examples)),
            'avg': sum(estimate_tokens(SYSTEM_PROMPT + e['prompt'] + e['svg']) for e in examples) // len(examples),
            'total': sum(estimate_tokens(SYSTEM_PROMPT + e['prompt'] + e['svg']) for e in examples),
        },
        'validation': {
            'all_path': True,
            'max_elements': MAX_ELEMENTS,
            'max_svg_len': MAX_SVG_LEN,
            'max_arc_radius': MAX_ARC_RADIUS,
            'bbox_range': [BBOX_MIN, BBOX_MAX],
        },
        'train_examples': len(train_data),
        'val_examples': len(val_data),
        'train_icons': len(train_ids),
        'val_icons': len(val_ids),
        'train_fill_modes': dict(Counter(e['fillMode'] for e in train_data)),
        'val_fill_modes': dict(Counter(e['fillMode'] for e in val_data)),
    }

    # Training estimate
    est_train_tokens = sum(estimate_tokens(SYSTEM_PROMPT + e['prompt'] + e['svg']) for e in train_data)
    stats['training_estimate'] = {
        'total_train_tokens': est_train_tokens,
        'estimated_hours_rtx4070': round(est_train_tokens / 800000, 1),
        'recommended_epochs': 3,
        'recommended_lr': '2e-5',
        'recommended_lora_rank': 32,
        'note': 'Lower LR than v5 (2e-5 vs 5e-5) for better QLoRA stability',
    }

    # Write output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_DIR / 'stats.json', 'w') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

    for split_name, split_data in [('train', train_data), ('val', val_data)]:
        filepath = OUTPUT_DIR / f'icons_{split_name}.jsonl'
        with open(filepath, 'w', encoding='utf-8') as f:
            for item in split_data:
                record = {
                    'messages': [
                        {'role': 'system', 'content': SYSTEM_PROMPT},
                        {'role': 'user', 'content': item['prompt']},
                        {'role': 'assistant', 'content': item['svg']},
                    ]
                }
                f.write(json.dumps(record, ensure_ascii=False) + '\n')
        print(f'{split_name}: {len(split_data)} examples -> {filepath}')

    # Show sample outputs
    print('\n=== Sample normalized icons (all <path>) ===')
    for item in examples[:5]:
        print(f'\nIcon: {item["id"]} [{item["fillMode"]}] [{item["complexity"]}]')
        print(f'Prompt: {item["prompt"]}')
        print(f'SVG ({item["svg_len"]} chars):')
        print(f'  {item["svg"][:200]}')

    # Quality summary
    print(f'\n=== Quality summary ===')
    print(f'  All elements are <path>: YES')
    print(f'  Fill balance: outlined={fills.get("outlined",0)}, filled={fills.get("filled",0)} ({filled_ratio:.0%} filled)')
    print(f'  One prompt per example: YES')
    print(f'  Deduped SVGs: YES (SHA-256)')
    print(f'  System prompt length: {len(SYSTEM_PROMPT)} chars')
    
    print(f'\n=== Dataset v6 ready in {OUTPUT_DIR}/ ===')
    print(f'   icons_train.jsonl - {len(train_data)} examples ({len(train_ids)} icons)')
    print(f'   icons_val.jsonl - {len(val_data)} examples ({len(val_ids)} icons)')
    print(f'\nTraining recommendations:')
    print(f'   Epochs: 3')
    print(f'   LR: 2e-5 (lower than v5 for QLoRA stability)')
    print(f'   LoRA rank: 32, alpha: 64')
    print(f'   Loss masking: MANDATORY (only assistant tokens)')
    print(f'   Estimated time on RTX 4070: ~{stats["training_estimate"]["estimated_hours_rtx4070"]}h')


if __name__ == '__main__':
    main()
