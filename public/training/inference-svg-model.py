#!/usr/bin/env python3
"""
Inference script for the trained SVG icon generator model.

Supports:
  - Single prompt generation
  - Batch generation from file
  - Interactive mode
  - REST API server mode

Usage:
  # Single prompt
  python scripts/inference-svg-model.py --prompt 'outlined minimal icon "home"'

  # Interactive mode
  python scripts/inference-svg-model.py --interactive

  # REST API server (for Vercel integration)
  python scripts/inference-svg-model.py --serve --port 8000

  # Batch from file
  python scripts/inference-svg-model.py --batch prompts.txt --output results/

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
from http.server import HTTPServer, BaseHTTPRequestHandler

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = PROJECT_ROOT / 'svg-model' / 'lora-adapter'

SYSTEM_PROMPT = """You are an SVG icon generator. You receive a prompt and output exactly one SVG icon.

RULES:
1. Output a complete <svg> tag with width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg".
2. Use currentColor for ALL stroke and fill colors. NEVER use hex colors.
3. For OUTLINED icons: fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round".
4. For FILLED icons: fill="currentColor" stroke="none".
5. For FLAT style: viewBox="0 0 256 256" or viewBox="0 0 64 64", stroke-width proportional.
6. Keep it minimal: 1-5 elements per icon.
7. Output ONLY the SVG code. No markdown, no explanation, no commentary.
8. Do NOT use <g> tags, <defs>, <clipPath>, <filter>, <mask>, <style>, or <text>.
9. Do NOT use transform attributes.
10. Center the icon within the viewBox. Use coordinates in the 2-22 range for 24×24."""


def load_model(model_path: str, base_model: str = None, use_4bit: bool = True):
    """Load the trained LoRA model."""
    model_path = Path(model_path)

    # Check for adapter_config.json to determine if this is a LoRA adapter
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
        # Full model
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
        # Load base model then merge LoRA
        model = AutoModelForCausalLM.from_pretrained(base_model_name, **model_kwargs)
        model = PeftModel.from_pretrained(model, str(model_path))
        # Optionally merge for faster inference
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

    # Build the user prompt
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
    )

    inputs = tokenizer(text, return_tensors='pt').to(model.device)

    best_svg = None
    last_error = ''

    for attempt in range(num_attempts):
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature if attempt == 0 else 0.5,
                top_p=top_p,
                do_sample=True,
                pad_token_id=tokenizer.pad_token_id,
                repetition_penalty=1.3,
            )

        generated = outputs[0][inputs['input_ids'].shape[1]:]
        svg_raw = tokenizer.decode(generated, skip_special_tokens=True)

        # Clean up
        svg = clean_svg(svg_raw)

        # Validate
        valid, reason = validate_svg(svg, fill_mode, style)
        if valid:
            return {
                'success': True,
                'svg': svg,
                'prompt': user_prompt,
                'attempt': attempt + 1,
            }

        last_error = reason
        best_svg = svg  # Keep best attempt

    return {
        'success': False,
        'svg': best_svg,
        'prompt': user_prompt,
        'error': last_error,
        'attempts': num_attempts,
    }


def clean_svg(svg: str) -> str:
    """Clean up generated SVG content."""
    s = svg.strip()
    # Strip markdown code blocks (svg, xml, html)
    s = re.sub(r'^```(?:svg|xml|html)?\s*\n?', '', s)
    s = re.sub(r'\n?```\s*$', '', s)
    # Strip any commentary text before/after SVG
    # Find the <svg...>...</svg> portion
    svg_match = re.search(r'(<svg\b[\s\S]*?</svg>)', s, re.IGNORECASE)
    if svg_match:
        s = svg_match.group(1)
    # Strip xml declaration
    s = re.sub(r'<\?xml[^?]*\?>', '', s, flags=re.IGNORECASE)
    # Strip comments
    s = re.sub(r'<!--[\s\S]*?-->', '', s)
    # Strip <g> wrappers — move their attributes to children (simplified: just remove)
    s = re.sub(r'<g[^>]*>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'</g>', '', s, flags=re.IGNORECASE)
    # Strip defs/style/clipPath/filter/mask
    s = re.sub(r'<defs[^>]*>[\s\S]*?</defs>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'<clipPath[^>]*>[\s\S]*?</clipPath>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'<filter[^>]*>[\s\S]*?</filter>', '', s, flags=re.IGNORECASE)
    s = re.sub(r'<mask[^>]*>[\s\S]*?</mask>', '', s, flags=re.IGNORECASE)
    # Fix hardcoded colors to currentColor
    # Replace ANY hex color (#xxx or #xxxxxx) in fill/stroke
    s = re.sub(r'fill="#[0-9a-fA-F]{3,8}"', 'fill="currentColor"', s)
    s = re.sub(r'stroke="#[0-9a-fA-F]{3,8}"', 'stroke="currentColor"', s)
    # Fix named colors (black, white, etc.) but NOT "none"
    s = re.sub(r'fill="(black|white|red|blue|green|gray|grey|transparent)"', 'fill="currentColor"', s, flags=re.IGNORECASE)
    s = re.sub(r'stroke="(black|white|red|blue|green|gray|grey|transparent)"', 'stroke="currentColor"', s, flags=re.IGNORECASE)
    # Add currentColor to elements that have NO fill/stroke at all
    # For <path> without fill or stroke — add stroke="currentColor" for outlined
    # Strategy: if element has no fill AND no stroke, add fill="currentColor" stroke="none"
    def add_missing_color(match):
        elem = match.group(0)
        has_fill = re.search(r'\bfill=', elem)
        has_stroke = re.search(r'\bstroke=', elem)
        if not has_fill and not has_stroke:
            # Add both — for outlined style this will be overridden by user CSS
            elem = elem.replace('>', ' fill="currentColor" stroke="none">', 1)
        elif has_stroke and not has_fill:
            elem = elem.replace('>', ' fill="none">', 1)
        elif has_fill and not has_stroke:
            elem = elem.replace('>', ' stroke="none">', 1)
        return elem
    s = re.sub(r'<(path|circle|rect|polyline|polygon|line|ellipse)\b[^>]*>', add_missing_color, s, flags=re.IGNORECASE)
    # Remove unnecessary attributes
    s = re.sub(r'\s+xmlns:[a-z]+="[^"]*"', '', s)
    s = re.sub(r'\s+id="[^"]*"', '', s)
    s = re.sub(r'\s+class="[^"]*"', '', s)
    s = re.sub(r'\s+version="[^"]*"', '', s)
    s = re.sub(r'\s+baseProfile="[^"]*"', '', s)
    s = re.sub(r'\s+xml:space="[^"]*"', '', s)
    s = re.sub(r'\s+xmlSpace="[^"]*"', '', s)
    s = re.sub(r'\s+x="[^"]*"', '', s)  # x= attr (on svg or elements)
    s = re.sub(r'\s+y="[^"]*"', '', s)  # y= attr
    # Remove empty whitespace
    s = re.sub(r'\n\s+', ' ', s)
    s = re.sub(r'\s{2,}', ' ', s)
    return s.strip()


def validate_svg(svg: str, fill_mode: str, style: str) -> tuple[bool, str]:
    """Validate generated SVG content."""
    if not svg or len(svg) < 10:
        return False, 'SVG слишком короткий'

    # Must have SVG drawing elements
    if not re.search(r'<(path|circle|rect|polyline|polygon|line|ellipse)\b', svg):
        return False, 'Нет SVG элементов рисования'

    # currentColor is required — but clean_svg auto-adds it, so just check
    # that there are drawing elements (currentColor added by post-processing)

    # Must not contain text/script/image tags
    for tag in ['<text', '<image', '<script']:
        if tag in svg.lower():
            return False, f'Содержит запрещённый тег: {tag}'

    # Check element count (not too complex)
    elements = re.findall(r'<(path|circle|rect|polyline|polygon|line|ellipse)\b', svg)
    if len(elements) > 20:
        return False, f'Слишком много элементов ({len(elements)})'

    # Check for viewBox — accept 24×24 or 256×256 or 64×64
    viewBox_match = re.search(r'viewBox="([^"]+)"', svg)
    if not viewBox_match:
        return False, 'Нет viewBox'

    return True, 'OK'


# ─── Interactive mode ─────────────────────────────────────────────────

def interactive_mode(model, tokenizer, output_dir: str = None):
    """Interactive prompt loop."""
    output_path = None
    if output_dir:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

    print("\n🎨 SVG Icon Generator — Интерактивный режим")
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

        # Parse fill mode and style from input
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
            if result['svg']:
                print(f"Лучший результат: {result['svg'][:100]}...")

        # Save to file
        if output_path and result.get('svg'):
            safe_name = re.sub(r'[^\w-]', '_', user_input)[:40]
            svg_file = output_path / f'{counter:03d}_{safe_name}.svg'
            svg_file.write_text(result['svg'], encoding='utf-8')
            print(f"💾 Сохранено: {svg_file}")
            counter += 1

        print()


# ─── REST API server ──────────────────────────────────────────────────

_model = None
_tokenizer = None


class SVGHandler(BaseHTTPRequestHandler):
    """Simple HTTP handler for SVG generation API."""

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
            self.send_json({'svg': result.get('svg', ''), 'error': result.get('error', '')}, 200)

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
    print(f"\n🌐 SVG Generation API запущен на http://0.0.0.0:{port}")
    print(f"   POST /api/generate  — генерация SVG")
    print(f"   GET  /health        — проверка статуса")
    print(f"\nПример запроса:")
    print(f'  curl -X POST http://localhost:{port}/api/generate \\')
    print(f'    -H "Content-Type: application/json" \\')
    print(f'    -d \'{{"prompt": "home", "fillMode": "outlined", "style": "minimal"}}\'')

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Сервер остановлен")
        server.server_close()


# ─── Batch mode ───────────────────────────────────────────────────────

def batch_mode(model, tokenizer, input_file: str, output_dir: str):
    """Generate SVGs from a file of prompts (one per line)."""
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

        # Save individual SVG
        safe_name = re.sub(r'[^\w-]', '_', prompt)[:50]
        svg_file = output_path / f'{safe_name}.svg'
        svg_content = result.get('svg', '')
        if svg_content:
            # svg_content already contains <svg> wrapper from clean_svg
            svg_file.write_text(svg_content, encoding='utf-8')

    # Save results JSON
    results_file = output_path / 'results.json'
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    success_count = sum(1 for r in results if r['success'])
    print(f"\n✅ Готово! {success_count}/{len(prompts)} успешно")
    print(f"   Результаты: {output_path}")


# ─── Main ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='SVG Icon Generator Inference')

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
    parser.add_argument('--repetition-penalty', type=float, default=1.3)
    parser.add_argument('--top-p', type=float, default=0.9)
    parser.add_argument('--port', type=int, default=8000,
                        help='Port for REST API server')

    args = parser.parse_args()

    # Load model
    model, tokenizer = load_model(args.model_path, args.base_model, not args.no_4bit)

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

            # Save to file
            output_file = PROJECT_ROOT / 'download' / 'generated_icon.svg'
            output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file.write_text(result['svg'], encoding='utf-8')
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
