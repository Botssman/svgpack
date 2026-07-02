#!/usr/bin/env python3
"""
Prepare icon training dataset from primitive-library-imported.ts.

Parses directly from the TypeScript source (source of truth).
Strips <g scale(...)> wrappers and scales coordinates 24x24 → 512x512.

Outputs:
  - dataset/icons_train.jsonl   (90%)
  - dataset/icons_val.jsonl     (10%)
  - dataset/stats.json

Usage:
  python scripts/prepare-dataset-v2.py
  python scripts/prepare-dataset-v2.py --max-icons 1000
  python scripts/prepare-dataset-v2.py --mode raw
"""

import json
import os
import re
import random
import argparse
from collections import Counter, defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC_FILE = PROJECT_ROOT / 'src' / 'lib' / 'primitive-library-imported.ts'
OUTPUT_DIR = PROJECT_ROOT / 'dataset'

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

SCALE = 512 / 24  # ≈ 21.3333


# ─── Parse TypeScript file ───────────────────────────────────────────

def parse_ts_file(filepath: Path) -> list[dict]:
    """Parse icons directly from primitive-library-imported.ts"""
    print(f"📖 Чтение {filepath}...")
    content = filepath.read_text(encoding='utf-8')

    # Find the array start
    array_match = re.search(
        r'IMPORTED_PRIMITIVES\s*:\s*SvgPrimitive\[\]\s*=\s*\[',
        content
    )
    if not array_match:
        print("ОШИБКА: не найден IMPORTED_PRIMITIVES массив!")
        return []

    rest = content[array_match.end():]

    # Find each icon block by matching id: 'xxx' patterns
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

    print(f"  Распарсено {len(icons)} иконок (ошибок: {parse_errors})")
    return icons


# ─── SVG Normalization ────────────────────────────────────────────────

def _add_currentcolor(svg: str, fill_mode: str = 'outlined') -> str:
    """Add explicit fill/stroke="currentColor" to elements that lack them."""
    is_filled = fill_mode == 'filled'

    def fix_element(match):
        tag = match.group(0)
        has_fill = bool(re.search(r'\bfill=', tag))
        has_stroke = bool(re.search(r'\bstroke=', tag))

        if has_fill and has_stroke:
            return tag

        insert_pos = tag.rfind('/>')
        if insert_pos == -1:
            insert_pos = tag.rfind('>')

        attrs_to_add = []
        if is_filled:
            if not has_fill:
                attrs_to_add.append('fill="currentColor"')
            if not has_stroke:
                attrs_to_add.append('stroke="none"')
        else:
            if not has_stroke:
                attrs_to_add.append('fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"')
            elif not has_fill:
                attrs_to_add.append('fill="none"')

        insert_str = ' ' + ' '.join(attrs_to_add)
        return tag[:insert_pos] + insert_str + tag[insert_pos:]

    svg = re.sub(
        r'<(path|circle|rect|polyline|polygon|line|ellipse)\b[^>]*/?>',
        fix_element,
        svg
    )
    return svg


def scale_number_str(num_str: str) -> str:
    """Scale a single number from 24x24 to 512x512."""
    try:
        val = float(num_str)
    except ValueError:
        return num_str
    scaled = val * SCALE
    if abs(scaled - round(scaled)) < 0.5:
        return str(int(round(scaled)))
    return f'{scaled:.2f}'


def normalize_svg(svg: str, fill_mode: str = 'outlined') -> str:
    """Normalize SVG: remove <g scale(...)>, scale coordinates 24→512."""
    s = svg.strip()

    # Remove <g transform="scale(...)"> and closing </g>
    s = re.sub(r'<g\s+transform="scale\([^)]+\)"\s*>', '', s)
    s = re.sub(r'<g\s*>', '', s)
    s = re.sub(r'</g>', '', s)

    # Scale numbers in d= attributes
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

    # Scale coordinate attributes
    coord_attrs = ['cx', 'cy', 'r', 'x', 'y', 'width', 'height',
                   'x1', 'y1', 'x2', 'y2', 'rx', 'ry', 'fx', 'fy',
                   'points']
    for attr in coord_attrs:
        def make_replacer(attr_name=attr):
            def replacer(m):
                val_str = m.group(1)
                if attr_name == 'points':
                    # Scale all numbers in points attribute
                    scaled = re.sub(
                        r'[-+]?\d*\.?\d+',
                        lambda pm: scale_number_str(pm.group(0)),
                        val_str
                    )
                    return f'{attr_name}="{scaled}"'
                scaled = scale_number_str(val_str)
                return f'{attr_name}="{scaled}"'
            return replacer
        s = re.sub(f'{attr}="([-+]?\\d*\\.?\\d+)"', make_replacer(attr), s)

    # Adjust stroke-width
    def adjust_stroke_width(match):
        val = float(match.group(1))
        if val > 100:
            return f'stroke-width="{min(int(round(val)), 32)}"'
        scaled = val * SCALE
        clamped = max(24, min(32, int(round(scaled))))
        return f'stroke-width="{clamped}"'

    s = re.sub(r'stroke-width="([-+]?\d*\.?\d+)"', adjust_stroke_width, s)

    # Normalize colors to currentColor
    s = re.sub(r'fill="#000000?"', 'fill="currentColor"', s)
    s = re.sub(r'fill="#000"', 'fill="currentColor"', s)
    s = re.sub(r'fill="#fff(?:fff)?"', 'fill="currentColor"', s)
    s = re.sub(r'stroke="#000000?"', 'stroke="currentColor"', s)
    s = re.sub(r'stroke="#000"', 'stroke="currentColor"', s)

    # Add currentColor to elements missing fill/stroke
    s = _add_currentcolor(s, fill_mode)

    # Clean whitespace
    s = re.sub(r'\n\s+', ' ', s)
    s = re.sub(r'\s{2,}', ' ', s)
    s = s.strip()

    return s


# ─── Prompt construction ──────────────────────────────────────────────

# Category-specific description hints for richer prompts
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

    # Variant 1: Short instruction (like user would type)
    variants.append(
        f'{fill_desc} {style_desc} icon "{clean_name}"'
    )

    # Variant 2: With category
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

    # Variant 4: More descriptive (for longer prompts)
    kw_str = f', related to {", ".join(extra_kw[:3])}' if extra_kw else ''
    variants.append(
        f'SVG icon of {clean_name}{kw_str}, {fill_desc} style, {style_desc} design'
    )

    return variants


# ─── Validation ───────────────────────────────────────────────────────

def validate_svg(svg: str) -> bool:
    if not svg or len(svg) < 20:
        return False
    if not re.search(r'<(path|circle|rect|polyline|polygon|line|ellipse)\b', svg):
        return False
    if 'currentColor' not in svg:
        return False
    for tag in ['<svg', '</svg>', '<text', '<image']:
        if tag in svg.lower():
            return False
    return True


# ─── Main ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Prepare icon training dataset v2')
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

    for ic in icons:
        svg_norm = normalize_svg(ic['svg'], ic.get('fillMode', 'outlined'))

        if not validate_svg(svg_norm):
            skipped += 1
            if not svg_norm or len(svg_norm) < 20:
                skip_reasons['too_short'] += 1
            elif 'currentColor' not in svg_norm:
                skip_reasons['no_currentColor'] += 1
            elif not re.search(r'<(path|circle|rect|polyline|polygon|line|ellipse)\b', svg_norm):
                skip_reasons['no_elements'] += 1
            else:
                skip_reasons['other'] += 1
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

        # Use selected number of variants
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

    print(f'\nОбработано: {len(processed)}, Пропущено: {skipped}')
    if skip_reasons:
        print(f'Причины пропуска: {dict(skip_reasons)}')

    # Statistics
    base_ids = set(p['id'].split('_v')[0] for p in processed)
    libs = Counter()
    for bid in base_ids:
        libs[bid.split('-')[0]] += 1
    fills = Counter(p['fillMode'] for p in processed)
    cats = Counter(p['category'] for p in processed)
    svg_lens = [p['svg_len'] for p in processed]

    stats = {
        'total_examples': len(processed),
        'unique_icons': len(base_ids),
        'skipped': skipped,
        'variants_per_icon': args.variants,
        'libraries': dict(libs),
        'fill_modes': dict(fills),
        'categories': dict(cats),
        'svg_length': {
            'min': min(svg_lens),
            'max': max(svg_lens),
            'avg': sum(svg_lens) // len(svg_lens),
            'median': sorted(svg_lens)[len(svg_lens) // 2],
        }
    }

    # Split (by base icon id to avoid same icon in both splits)
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
        with open(filepath, 'w') as f:
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

    # Samples
    print('\n=== Примеры обучающих данных ===')
    for item in processed[:3]:
        print(f'\nPrompt: {item["prompt"]}')
        print(f'SVG ({item["svg_len"]} символов): {item["svg"][:150]}...')

    print(f'\n✅ Датасет готов в {OUTPUT_DIR}/')
    print(f'   icons_train.jsonl — {len(train_data)} примеров ({len(train_ids)} иконок)')
    print(f'   icons_val.jsonl — {len(val_data)} примеров ({len(val_ids)} иконок)')


if __name__ == '__main__':
    main()
