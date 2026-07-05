#!/usr/bin/env python3
"""
Inference script v2 for the trained SVG icon generator model.

Fixes over v1:
  1. REMOVED x=/y= attribute stripping that broke <rect> elements
  2. Better SVG cleanup with proper attribute handling
  3. SVG validation with actual parse attempt
  4. Improved generation parameters for quality output
  5. Better color replacement (only in fill/stroke attributes)

Usage:
  # Single prompt
  python public/training/inference-svg-model-v2.py --prompt 'outlined minimal icon "home"'

  # Interactive mode
  python public/training/inference-svg-model-v2.py --interactive

  # REST API server
  python public/training/inference-svg-model-v2.py --serve --port 8000

  # Batch from file
  python public/training/inference-svg-model-v2.py --batch prompts.txt --output results/

Requirements:
  pip install torch transformers peft bitsandbytes accelerate
"""

import os
import sys
import json
import argparse
import re
import time
from pathlib import Path
from io import StringIO
from http.server import HTTPServer, BaseHTTPRequestHandler

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = PROJECT_ROOT / 'svg-model' / 'lora-adapter'

SYSTEM_PROMPT = """/no_think
You are an SVG icon designer. Rules:
- Output only SVG elements: path, circle, rect, line, polyline, polygon, ellipse
- No <svg> wrapper, no xmlns, no width/height, no <g>, no transform
- ViewBox: 512x512, center icon, coords in 56-456
- Use currentColor for all colors, no hex colors
- Outlined: fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"
- Filled: fill="currentColor" stroke="none"
- Keep simple: 1-5 elements, no text/labels/defs/filters
- Output SVG only, no markdown or explanation"""


def load_model(model_path: str, base_model: str = None, use_4bit: bool = True):
    """Load the trained LoRA model."""
    model_path = Path(model_path)

    # Check for adapter_config.json
    adapter_config = model_path / 'adapter_config.json'
    if adapter_config.exists():
        with open(adapter_config) as f:
            config = json.load(f)
        base_model_name = config.get('base_model_name_or_path', base_model)
        if not base_model_name:
            print("ОШИБКА: Не удалось определить базовую модель. Укажите --base-model")
            sys.exit(1)
        print(f"📦 LoRA адаптер: {model_path}")
        print(f"🤖 Базовая модель: {base_model_name}")
    else:
        base_model_name = str(model_path)
        print(f"🤖 Полная модель: {base_model_name}")

    # Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        str(model_path) if not adapter_config.exists() else base_model_name,
        trust_remote_code=True,
        padding_side='left',  # For generation
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load model
    model_kwargs = {
        'trust_remote_code': True,
        'torch_dtype': torch.bfloat16,
        'device_map': 'auto',
    }

    if use_4bit:
        model_kwargs['quantization_config'] = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_use_double_quant=True,
        )

    if adapter_config.exists():
        model = AutoModelForCausalLM.from_pretrained(base_model_name, **model_kwargs)
        model = PeftModel.from_pretrained(model, str(model_path))
        print("🔀 Слияние LoRA адаптера с базовой моделью...")
        model = model.merge_and_unload()
    else:
        model = AutoModelForCausalLM.from_pretrained(str(model_path), **model_kwargs)

    model.eval()
    print(f"✅ Модель загружена на {model.device}")

    return model, tokenizer


def generate_svg(model, tokenizer, prompt: str, fill_mode: str = 'outlined',
                 style: str = 'minimal', max_new_tokens: int = 300,
                 temperature: float = 0.6, top_p: float = 0.9,
                 num_attempts: int = 3) -> dict:
    """Generate an SVG icon from a text prompt."""

    fill_desc = 'filled' if fill_mode == 'filled' else 'outlined'
    style_desc = 'flat' if style == 'flat' else 'minimal'
    user_prompt = f'{fill_desc} {style_desc} icon "{prompt}"'

    messages = [
        {'role': 'system', 'content': SYSTEM_PROMPT},
        {'role': 'user', 'content': user_prompt},
    ]

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False,
    )

    inputs = tokenizer(text, return_tensors='pt').to(model.device)

    best_svg = None
    last_error = ''

    for attempt in range(num_attempts):
        with torch.no_grad():
            # Vary temperature slightly on retries
            temp = temperature if attempt == 0 else max(0.3, temperature - 0.1 * attempt)
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=temp,
                top_p=top_p,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id,
                repetition_penalty=1.2,  # Balance: prevent looping without breaking paths
            )

        generated = outputs[0][inputs['input_ids'].shape[1]:]
        svg_raw = tokenizer.decode(generated, skip_special_tokens=True)

        # Clean up
        svg = clean_svg(svg_raw, fill_mode)

        # Validate
        valid, reason = validate_svg(svg)
        if valid:
            return {
                'success': True,
                'svg': svg,
                'prompt': user_prompt,
                'attempt': attempt + 1,
            }

        last_error = reason
        best_svg = svg

    return {
        'success': False,
        'svg': best_svg,
        'prompt': user_prompt,
        'error': last_error,
        'attempts': num_attempts,
    }


def clean_svg(svg: str, fill_mode: str = 'outlined') -> str:
    """
    Clean up generated SVG content.
    Returns SVG fragment (no <svg> wrapper).

    FIX: Does NOT strip x=/y= attributes from <rect> and other elements.
    FIX: Only replaces hex colors in fill= and stroke= attributes.
    """
    s = svg.strip()

    # Strip <think>...</think> blocks (Qwen3 thinking output)
    s = re.sub(r'<think>[\s\S]*?</think>', '', s, flags=re.IGNORECASE)

    # Strip markdown code blocks
    s = re.sub(r'^```(?:svg|xml|html)?\s*\n?', '', s)
    s = re.sub(r'\n?```\s*$', '', s)

    # If there's a <svg...>...</svg> wrapper, extract inner content
    svg_match = re.search(r'<svg\b[^>]*>([\s\S]*?)</svg>', s, re.IGNORECASE)
    if svg_match:
        s = svg_match.group(1).strip()
    else:
        # No <svg> wrapper — find the SVG fragment elements
        elem_match = re.search(
            r'(<(?:path|circle|rect|polyline|polygon|line|ellipse)\b)',
            s, re.IGNORECASE
        )
        if elem_match:
            s = s[elem_match.start():]

    # CRITICAL: Truncate any text after the last SVG element self-closing tag
    # The model sometimes generates conversational text after SVG
    last_svg_end = -1
    for m in re.finditer(r'/>', s):
        last_svg_end = m.end()
    if last_svg_end > 0:
        s = s[:last_svg_end]

    # Strip xml declaration
    s = re.sub(r'<\?xml[^?]*\?>', '', s, flags=re.IGNORECASE)

    # Strip comments
    s = re.sub(r'<!--[\s\S]*?-->', '', s)

    # Strip <g> wrappers (but keep content)
    s = re.sub(r'<g[^>]*>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'</g>', '', s, flags=re.IGNORECASE)

    # Strip defs/style/clipPath/filter/mask
    s = re.sub(r'<defs[^>]*>[\s\S]*?</defs>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'<clipPath[^>]*>[\s\S]*?</clipPath>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'<filter[^>]*>[\s\S]*?</filter>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'<mask[^>]*>[\s\S]*?</mask>', '', s, flags=re.IGNORECASE)

    # Replace hex colors ONLY in fill= and stroke= attributes
    # FIX: Don't use global replace — only in attribute values
    s = re.sub(r'fill="#[0-9a-fA-F]{3,8}"', 'fill="currentColor"', s)
    s = re.sub(r'stroke="#[0-9a-fA-F]{3,8}"', 'stroke="currentColor"', s)

    # Replace named colors (black, white, etc.) but NOT "none" or "currentColor"
    named_colors = r'(black|white|red|blue|green|gray|grey|transparent|Black|White)'
    s = re.sub(rf'fill="{named_colors}"', 'fill="currentColor"', s)
    s = re.sub(rf'stroke="{named_colors}"', 'stroke="currentColor"', s)

    # Add missing fill/stroke to elements that have neither
    def add_missing_color(match):
        elem = match.group(0)
        has_fill = re.search(r'\bfill=', elem)
        has_stroke = re.search(r'\bstroke=', elem)

        if not has_fill and not has_stroke:
            if fill_mode == 'filled':
                return elem.replace('/>', ' fill="currentColor" stroke="none"/>', 1)
            else:
                return elem.replace('/>',
                    ' fill="none" stroke="currentColor" '
                    'stroke-width="28" stroke-linecap="round" '
                    'stroke-linejoin="round"/>', 1)
        elif has_stroke and not has_fill:
            return elem.replace('/>', ' fill="none"/>', 1)
        elif has_fill and not has_stroke:
            return elem.replace('/>', ' stroke="none"/>', 1)
        return elem

    s = re.sub(
        r'<(path|circle|rect|polyline|polygon|line|ellipse)\b[^>]*/>',
        add_missing_color, s, flags=re.IGNORECASE
    )

    # Remove unnecessary attributes (but NOT x= y= which are needed for <rect>)
    s = re.sub(r'\s+xmlns:[a-z]+="[^"]*"', '', s)
    s = re.sub(r'\s+id="[^"]*"', '', s)
    s = re.sub(r'\s+class="[^"]*"', '', s)
    s = re.sub(r'\s+version="[^"]*"', '', s)
    s = re.sub(r'\s+baseProfile="[^"]*"', '', s)
    s = re.sub(r'\s+xml:space="[^"]*"', '', s)
    s = re.sub(r'\s+xmlSpace="[^"]*"', '', s)

    # Remove transform attributes (model shouldn't produce these)
    s = re.sub(r'\s+transform="[^"]*"', '', s)

    # Clean up whitespace
    s = re.sub(r'\n\s+', ' ', s)
    s = re.sub(r'\s{2,}', ' ', s)

    return s.strip()


def validate_svg(svg: str) -> tuple[bool, str]:
    """Validate generated SVG content with render-based check."""
    if not svg or len(svg) < 10:
        return False, 'SVG слишком короткий'

    # Must have SVG drawing elements
    if not re.search(r'<(path|circle|rect|polyline|polygon|line|ellipse)\b', svg):
        return False, 'Нет SVG элементов рисования'

    # currentColor check
    if 'currentColor' not in svg:
        return False, 'Нет currentColor'

    # Must not contain text/script/image tags
    for tag in ['<text', '<image', '<script']:
        if tag in svg.lower():
            return False, f'Содержит запрещённый тег: {tag}'

    # Check element count
    elements = re.findall(
        r'<(path|circle|rect|polyline|polygon|line|ellipse)\b', svg
    )
    if len(elements) > 20:
        return False, f'Слишком много элементов ({len(elements)})'

    # Render-based validation: try to parse
    try:
        from svgelements import SVG
        test_svg = (
            f'<svg viewBox="0 0 512 512" '
            f'xmlns="http://www.w3.org/2000/svg">{svg}</svg>'
        )
        parsed = SVG.parse(StringIO(test_svg))
        elem_count = sum(1 for e in parsed
                        if hasattr(e, 'reify'))
        if elem_count == 0:
            return False, 'Render: нет элементов'
    except ImportError:
        pass  # svgelements not available, skip render check
    except Exception as e:
        return False, f'Render ошибка: {str(e)[:50]}'

    return True, 'OK'


def wrap_svg(fragment: str, viewbox: str = '0 0 512 512') -> str:
    """Wrap SVG fragment in a complete <svg> tag."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">\n'
        f'{fragment}\n</svg>'
    )


# ─── Interactive mode ─────────────────────────────────────────────────

def interactive_mode(model, tokenizer, output_dir: str = None):
    """Interactive prompt loop."""
    output_path = None
    if output_dir:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

    print("\n🎨 SVG Icon Generator v2 — Интерактивный режим")
    print("Введите описание иконки (или 'quit' для выхода)")
    print("Формат: [filled/outlined] [flat/minimal] icon \"name\"")
    if output_path:
        print(f"📁 Сохранение: {output_path}")
    print()

    counter = 1
    while True:
        try:
            user_input = input("🎯 Prompt > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n👋 Пока!")
            break

        if user_input.lower() in ('quit', 'exit', 'q'):
            break

        if not user_input:
            continue

        fill_mode = 'outlined'
        style = 'minimal'
        prompt = user_input

        if 'filled' in prompt.lower():
            fill_mode = 'filled'
        if 'flat' in prompt.lower():
            style = 'flat'

        start = time.time()
        result = generate_svg(model, tokenizer, prompt, fill_mode, style)
        elapsed = time.time() - start

        if result['success']:
            print(f"\n✅ Сгенерировано за {elapsed:.1f}с (попытка {result['attempt']}):")
            print(result['svg'][:200])
            if len(result['svg']) > 200:
                print(f"... ({len(result['svg'])} символов)")
        else:
            print(f"\n❌ Ошибка: {result['error']}")
            if result.get('svg'):
                print(f"Лучший результат: {result['svg'][:100]}...")

        if output_path and result.get('svg'):
            safe_name = re.sub(r'[^\w-]', '_', user_input)[:40]
            svg_file = output_path / f'{counter:03d}_{safe_name}.svg'
            svg_file.write_text(wrap_svg(result['svg']), encoding='utf-8')
            print(f"💾 Сохранено: {svg_file}")
            counter += 1

        print()


# ─── REST API server ──────────────────────────────────────────────────

_model = None
_tokenizer = None


class SVGHandler(BaseHTTPRequestHandler):
    """HTTP handler for SVG generation API."""

    def do_POST(self):
        if self.path != '/api/generate':
            self.send_error(404)
            return

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_json({'error': 'Invalid JSON'}, 400)
            return

        prompt = data.get('prompt', '').strip()
        if not prompt:
            self.send_json({'error': 'Prompt is required'}, 400)
            return

        fill_mode = data.get('fillMode', 'outlined')
        style = data.get('style', 'minimal')

        result = generate_svg(_model, _tokenizer, prompt, fill_mode, style)

        if result['success']:
            self.send_json({'svg': result['svg']})
        else:
            self.send_json({
                'svg': result.get('svg', ''),
                'error': result.get('error', '')
            }, 200)

    def do_GET(self):
        if self.path == '/health':
            self.send_json({'status': 'ok', 'model': 'loaded'})
        else:
            self.send_error(404)

    def send_json(self, data, code=200):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def log_message(self, format, *args):
        print(f"[API] {args[0]}")


def serve_mode(model, tokenizer, port: int):
    """Start REST API server."""
    global _model, _tokenizer
    _model = model
    _tokenizer = tokenizer

    server = HTTPServer(('0.0.0.0', port), SVGHandler)
    print(f"\n🌐 SVG Generation API v2 запущен на http://0.0.0.0:{port}")
    print(f"   POST /api/generate  — генерация SVG")
    print(f"   GET  /health        — проверка статуса")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Сервер остановлен")
        server.server_close()


# ─── Batch mode ───────────────────────────────────────────────────────

def batch_mode(model, tokenizer, input_file: str, output_dir: str):
    """Generate SVGs from a file of prompts."""
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    with open(input_file, 'r', encoding='utf-8') as f:
        prompts = [line.strip() for line in f if line.strip()]

    print(f"📋 Обработка {len(prompts)} промптов...")

    results = []
    for i, prompt in enumerate(prompts):
        print(f"  [{i+1}/{len(prompts)}] {prompt}...", end=' ', flush=True)
        result = generate_svg(model, tokenizer, prompt)
        status = '✅' if result['success'] else '❌'
        print(status)

        results.append(result)

        if result.get('svg'):
            safe_name = re.sub(r'[^\w-]', '_', prompt)[:50]
            svg_file = output_path / f'{safe_name}.svg'
            svg_file.write_text(wrap_svg(result['svg']), encoding='utf-8')

    results_file = output_path / 'results.json'
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    success_count = sum(1 for r in results if r['success'])
    print(f"\n✅ Готово! {success_count}/{len(prompts)} успешно")


# ─── Main ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='SVG Icon Generator Inference v2'
    )

    # Model
    parser.add_argument('--model-path', type=str, default=str(DEFAULT_MODEL_PATH),
                        help='Path to trained LoRA adapter or full model')
    parser.add_argument('--base-model', type=str, default=None,
                        help='Base model name (auto-detected from adapter config)')
    parser.add_argument('--no-4bit', action='store_true',
                        help='Disable 4-bit quantization (needs more VRAM)')

    # Generation mode
    parser.add_argument('--prompt', type=str, default=None,
                        help='Single prompt to generate')
    parser.add_argument('--interactive', action='store_true',
                        help='Interactive mode')
    parser.add_argument('--serve', action='store_true',
                        help='Start REST API server')
    parser.add_argument('--batch', type=str, default=None,
                        help='File with prompts (one per line)')
    parser.add_argument('--output', type=str, default='results/',
                        help='Output directory for batch mode')

    # Generation params
    parser.add_argument('--fill-mode', type=str, default='outlined',
                        choices=['outlined', 'filled'])
    parser.add_argument('--style', type=str, default='minimal',
                        choices=['minimal', 'flat'])
    parser.add_argument('--max-tokens', type=int, default=300)
    parser.add_argument('--temperature', type=float, default=0.6)
    parser.add_argument('--top-p', type=float, default=0.9)
    parser.add_argument('--port', type=int, default=8000,
                        help='Port for REST API server')

    args = parser.parse_args()

    # Load model
    model, tokenizer = load_model(
        args.model_path, args.base_model, not args.no_4bit
    )

    # Run
    if args.interactive:
        interactive_mode(model, tokenizer, args.output)
    elif args.serve:
        serve_mode(model, tokenizer, args.port)
    elif args.batch:
        batch_mode(model, tokenizer, args.batch, args.output)
    elif args.prompt:
        start = time.time()
        result = generate_svg(
            model, tokenizer, args.prompt,
            args.fill_mode, args.style,
            max_new_tokens=args.max_tokens,
            temperature=args.temperature,
            top_p=args.top_p,
        )
        elapsed = time.time() - start

        if result['success']:
            print(f"✅ Сгенерировано за {elapsed:.1f}с:")
            print(result['svg'])

            output_file = PROJECT_ROOT / 'download' / 'generated_icon.svg'
            output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file.write_text(wrap_svg(result['svg']), encoding='utf-8')
            print(f"\n💾 Сохранено: {output_file}")
        else:
            print(f"❌ Ошибка: {result['error']}")
            if result.get('svg'):
                print(f"Лучший результат: {result['svg']}")
    else:
        print("Укажите режим: --prompt, --interactive, --serve, или --batch")
        parser.print_help()


if __name__ == '__main__':
    main()
