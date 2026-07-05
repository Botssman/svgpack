#!/usr/bin/env python3
"""
Prepare icon training dataset v3 — with CORRECT SVG normalization.

Uses svgelements library to properly handle arc commands and transforms.
Previous version (v2) naively multiplied numbers in d= attributes,
which broke arc commands (70% of icons had arcs!) — that's why the model
produced garbage SVG paths.

Key improvements:
  - Proper SVG transform application via svgelements (arcs, circles, etc.)
  - Strict validation: reject icons with coordinates outside viewBox
  - Round coordinates to integers for cleaner training data
  - Stroke-width normalization (always 28 for outlined)
  - currentColor enforcement
  - Comprehensive stats and error reporting

Usage:
  python scripts/prepare-dataset-v3.py
  python scripts/prepare-dataset-v3.py --max-icons 1000
  python scripts/prepare-dataset-v3.py --variants 1
"""

import json
import os
import re
import random
import argparse
from collections import Counter, defaultdict
from io import StringIO

# svgelements must be available — pip install svgelements
# IMPORTANT: svgelements.Path shadows pathlib.Path — use aliases
from svgelements import (
    SVG, Path as SVGPath, Circle, Rect, Polyline, Line as SVGLine,
    Ellipse, Polygon as SVGPolygon, Group, Move, Close,
    Line as LineSeg, Arc, CubicBezier, QuadraticBezier
)
from pathlib import Path as FilePath

PROJECT_ROOT = FilePath(__file__).resolve().parent.parent.parent
SRC_FILE = PROJECT_ROOT / 'src' / 'lib' / 'primitive-library-imported.ts'
OUTPUT_DIR = PROJECT_ROOT / 'dataset'

VIEWBOX_SIZE = 512
SCALE = VIEWBOX_SIZE / 24  # 21.3333
STROKE_WIDTH_OUTLINED = 28

SYSTEM_PROMPT = """You are a professional SVG icon designer. You create clean, production-ready SVG icons.

CRITICAL RULES:
1. Return ONLY SVG elements (path, circle, rect, polyline, line, ellipse, polygon). NO <svg> tag, NO xmlns, NO width/height/viewBox.
2. The viewBox is 512x512. Center your icon. Use coordinates in the 56-456 range.
3. Use "currentColor" for ALL stroke and fill colors — NEVER hex colors like #000 or #fff.
4. NEVER add background rectangles, text, labels, <defs>, <clipPath>, <filter>, <mask>, <style>.
5. For OUTLINED: fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"
6. For FILLED: fill="currentColor" stroke="none" — solid shapes, no outlines.
7. Keep it simple — 1-5 elements. Each path should be a single continuous shape.
8. Output ONLY SVG fragment elements. No markdown, no code blocks, no explanation.
9. Do NOT use <g> group tags. Use individual elements directly.
10. Do NOT use transform attributes (no translate, rotate, scale)."""


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

def _round_numbers_in_d(d_str: str) -> str:
    """Round all floating-point numbers in a d attribute to integers."""
    def round_match(m):
        val = float(m.group(0))
        rounded = int(round(val))
        return str(rounded)
    return re.sub(r'[-+]?\d*\.?\d+', round_match, d_str)


def _round_numbers_in_str(s: str) -> str:
    """Round all floating-point numbers in a string to integers."""
    def round_match(m):
        val = float(m.group(0))
        rounded = int(round(val))
        return str(rounded)
    return re.sub(r'[-+]?\d*\.?\d+', round_match, s)


def normalize_svg_proper(svg_raw: str, fill_mode: str = 'outlined') -> str:
    """
    Normalize SVG using svgelements for correct transform handling.

    Uses reify() to apply transforms, then d() to get the path data
    with correctly transformed arc commands. Rounds to integers.

    Returns SVG fragment (no <svg> wrapper).
    """
    is_filled = fill_mode == 'filled'

    # Wrap in full SVG for parsing
    full_svg_str = f'<svg viewBox="0 0 {VIEWBOX_SIZE} {VIEWBOX_SIZE}" xmlns="http://www.w3.org/2000/svg">{svg_raw}</svg>'

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
        if not isinstance(elem, (SVGPath, Circle, Rect, Polyline, SVGPolygon, SVGLine, Ellipse)):
            return

        try:
            reified = elem.reify()
        except Exception:
            return

        if isinstance(reified, SVGPath):
            try:
                d = _round_numbers_in_d(reified.d())
            except Exception:
                return
            if not d or len(d) < 3:
                return
            if is_filled:
                elements_out.append(f'<path d="{d}" fill="currentColor" stroke="none"/>')
            else:
                elements_out.append(f'<path d="{d}" fill="none" stroke="currentColor" stroke-width="{STROKE_WIDTH_OUTLINED}" stroke-linecap="round" stroke-linejoin="round"/>')

        elif isinstance(reified, Circle):
            cx = int(round(reified.cx))
            cy = int(round(reified.cy))
            r = int(round(reified.rx))  # Circle stores radius as rx/ry after reify
            if is_filled:
                elements_out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="currentColor" stroke="none"/>')
            else:
                elements_out.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="currentColor" stroke-width="{STROKE_WIDTH_OUTLINED}" stroke-linecap="round" stroke-linejoin="round"/>')

        elif isinstance(reified, Rect):
            x = int(round(reified.x))
            y = int(round(reified.y))
            w = int(round(reified.width))
            h = int(round(reified.height))
            rx = int(round(reified.rx)) if reified.rx else 0
            if is_filled:
                attrs = f'x="{x}" y="{y}" width="{w}" height="{h}"'
                if rx:
                    attrs += f' rx="{rx}"'
                elements_out.append(f'<rect {attrs} fill="currentColor" stroke="none"/>')
            else:
                attrs = f'x="{x}" y="{y}" width="{w}" height="{h}"'
                if rx:
                    attrs += f' rx="{rx}"'
                elements_out.append(f'<rect {attrs} fill="none" stroke="currentColor" stroke-width="{STROKE_WIDTH_OUTLINED}" stroke-linecap="round" stroke-linejoin="round"/>')

        elif isinstance(reified, (Polyline, SVGPolygon)):
            points = ' '.join(f'{int(round(p.x))},{int(round(p.y))}' for p in reified.points)
            tag = 'polygon' if isinstance(reified, SVGPolygon) else 'polyline'
            if is_filled:
                elements_out.append(f'<{tag} points="{points}" fill="currentColor" stroke="none"/>')
            else:
                elements_out.append(f'<{tag} points="{points}" fill="none" stroke="currentColor" stroke-width="{STROKE_WIDTH_OUTLINED}" stroke-linecap="round" stroke-linejoin="round"/>')

        elif isinstance(reified, SVGLine):
            x1 = int(round(reified.x1))
            y1 = int(round(reified.y1))
            x2 = int(round(reified.x2))
            y2 = int(round(reified.y2))
            if is_filled:
                elements_out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="currentColor" stroke-width="{STROKE_WIDTH_OUTLINED}" stroke-linecap="round"/>')
            else:
                elements_out.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" fill="none" stroke="currentColor" stroke-width="{STROKE_WIDTH_OUTLINED}" stroke-linecap="round" stroke-linejoin="round"/>')

        elif isinstance(reified, Ellipse):
            cx = int(round(reified.cx))
            cy = int(round(reified.cy))
            rx = int(round(reified.rx))
            ry = int(round(reified.ry))
            if is_filled:
                elements_out.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="currentColor" stroke="none"/>')
            else:
                elements_out.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" stroke="currentColor" stroke-width="{STROKE_WIDTH_OUTLINED}" stroke-linecap="round" stroke-linejoin="round"/>')

    # Process all elements
    for elem in svg:
        process_element(elem)

    if not elements_out:
        return ''

    return ' '.join(elements_out)


# ─── Validation ───────────────────────────────────────────────────────

def validate_svg(svg: str) -> tuple[bool, str]:
    """Strict validation of normalized SVG fragment."""
    if not svg or len(svg) < 20:
        return False, 'too_short'

    # Must have SVG drawing elements
    if not re.search(r'<(path|circle|rect|polyline|polygon|line|ellipse)\b', svg):
        return False, 'no_elements'

    # Must use currentColor
    if 'currentColor' not in svg:
        return False, 'no_currentColor'

    # Must not contain forbidden tags
    for tag in ['<svg', '</svg>', '<text', '<image', '<script', '<g>', '</g>']:
        if tag in svg.lower():
            return False, f'forbidden_tag:{tag}'

    # Must not contain transform attributes
    if re.search(r'\btransform=', svg):
        return False, 'has_transform'

    # Must not contain xmlns
    if 'xmlns' in svg:
        return False, 'has_xmlns'

    # Check that coordinates are within viewBox (0-512 with small margin)
    nums = re.findall(r'[-+]?\d+', svg)
    out_of_range = 0
    for n in nums:
        val = int(n)
        if val < -50 or val > 560:  # Allow small margin
            out_of_range += 1
    if out_of_range > 5:
        return False, f'coords_out_of_range({out_of_range})'

    # Check element count (not too complex)
    elements = re.findall(r'<(path|circle|rect|polyline|polygon|line|ellipse)\b', svg)
    if len(elements) > 20:
        return False, f'too_many_elements({len(elements)})'

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
    """Build multiple prompt variants per icon for training diversity."""
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

    # Variant 3: With keywords or alternative phrasing
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


# ─── Main ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Prepare icon training dataset v3 (with correct SVG normalization)')
    parser.add_argument('--mode', choices=['llm', 'raw'], default='llm',
                        help='Output format: llm (chat messages) or raw (prompt+svg)')
    parser.add_argument('--max-icons', type=int, default=0,
                        help='Max icons to process (0 = all)')
    parser.add_argument('--train-split', type=float, default=0.9,
                        help='Train/validation split ratio')
    parser.add_argument('--variants', type=int, default=2,
                        help='Number of prompt variants per icon (1-4)')
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

    print(f'\n🔄 Нормализация {len(icons)} иконок через svgelements...')

    for idx, ic in enumerate(icons):
        if idx % 500 == 0 and idx > 0:
            print(f'  {idx}/{len(icons)} обработано...')

        svg_norm = normalize_svg_proper(ic['svg'], ic.get('fillMode', 'outlined'))

        valid, reason = validate_svg(svg_norm)
        if not valid:
            skipped += 1
            skip_reasons[reason] += 1
            continue

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

        for v_idx, prompt in enumerate(selected_variants):
            processed.append({
                'id': ic['id'] + (f'_v{v_idx}' if v_idx > 0 else ''),
                'prompt': prompt,
                'svg': svg_norm,
                'keywords': ic.get('keywords', []),
                'category': ic.get('category', ''),
                'fillMode': ic.get('fillMode', 'outlined'),
                'style': ic.get('style', 'minimal'),
                'svg_len': len(svg_norm),
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
    base_ids = set(p['id'].split('_v')[0] for p in processed)
    fills = Counter(p['fillMode'] for p in processed)
    cats = Counter(p['category'] for p in processed)
    svg_lens = [p['svg_len'] for p in processed]

    stats = {
        'version': 'v3',
        'total_examples': len(processed),
        'unique_icons': len(base_ids),
        'skipped': skipped,
        'skip_reasons': dict(skip_reasons),
        'variants_per_icon': args.variants,
        'fill_modes': dict(fills),
        'categories': dict(cats),
        'svg_length': {
            'min': min(svg_lens),
            'max': max(svg_lens),
            'avg': sum(svg_lens) // len(svg_lens),
            'median': sorted(svg_lens)[len(svg_lens) // 2],
        }
    }

    # Split by base icon id (avoid same icon in both splits)
    base_id_list = list(base_ids)
    random.shuffle(base_id_list)
    split_idx = int(len(base_id_list) * args.train_split)
    train_ids = set(base_id_list[:split_idx])
    val_ids = set(base_id_list[split_idx:])

    train_data = [p for p in processed if p['id'].split('_v')[0] in train_ids]
    val_data = [p for p in processed if p['id'].split('_v')[0] in val_ids]

    stats['train_examples'] = len(train_data)
    stats['val_examples'] = len(val_data)
    stats['train_icons'] = len(train_ids)
    stats['val_icons'] = len(val_ids)

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
                        'keywords': item['keywords'],
                        'category': item['category'],
                        'fillMode': item['fillMode'],
                    }
                f.write(json.dumps(record, ensure_ascii=False) + '\n')
        print(f'{split_name}: {len(split_data)} примеров → {filepath}')

    # Show sample outputs
    print('\n=== Примеры нормализованных иконок ===')
    for item in processed[:3]:
        print(f'\nIcon: {item["id"]}')
        print(f'Prompt: {item["prompt"]}')
        print(f'SVG ({item["svg_len"]} символов):')
        print(f'  {item["svg"][:200]}')
        if item["svg_len"] > 200:
            print(f'  ...')

    # Compare with old version output
    print(f'\n=== Сравнение v2 vs v3 (первые 3 иконки с arc) ===')
    arc_icons = [ic for ic in icons if 'a' in ic['svg'].lower()][:3]
    for ic in arc_icons:
        # Old normalization (broken)
        svg_old = normalize_svg_old(ic['svg'], ic.get('fillMode', 'outlined'))
        # New normalization (correct)
        svg_new = normalize_svg_proper(ic['svg'], ic.get('fillMode', 'outlined'))
        print(f'\nIcon: {ic["id"]}')
        print(f'  v2 (broken): {svg_old[:120]}...')
        print(f'  v3 (correct): {svg_new[:120]}...')

    print(f'\n✅ Датасет v3 готов в {OUTPUT_DIR}/')
    print(f'   icons_train.jsonl — {len(train_data)} примеров ({len(train_ids)} иконок)')
    print(f'   icons_val.jsonl — {len(val_data)} примеров ({len(val_ids)} иконок)')


def normalize_svg_old(svg_raw: str, fill_mode: str = 'outlined') -> str:
    """Old v2 normalization for comparison (produces broken arcs)."""
    s = svg_raw.strip()
    s = re.sub(r'<g\s+transform="scale\([^)]+\)"\s*>', '', s)
    s = re.sub(r'<g\s*>', '', s)
    s = re.sub(r'</g>', '', s)

    def scale_number_str(num_str):
        try:
            val = float(num_str)
        except ValueError:
            return num_str
        scaled = val * SCALE
        if abs(scaled - round(scaled)) < 0.5:
            return str(int(round(scaled)))
        return f'{scaled:.2f}'

    def scale_d_attr(match):
        d_content = match.group(1)
        parts = re.split(r'([A-Za-z])', d_content)
        result = []
        for part in parts:
            if len(part) == 1 and part.isalpha():
                result.append(part)
            else:
                scaled = re.sub(
                    r'[-+]?\d*\.?\d+',
                    lambda m: scale_number_str(m.group(0)),
                    part
                )
                result.append(scaled)
        return f'd="{"".join(result)}"'

    s = re.sub(r'd="([^"]*)"', scale_d_attr, s)
    s = re.sub(r'\s{2,}', ' ', s)
    return s.strip()


if __name__ == '__main__':
    main()
