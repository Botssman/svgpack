#!/usr/bin/env python3
"""
Train SVG icon generator model v2 — with LOSS MASKING.

Based on research: SVGen, LLM4SVG, HiVG, StarVector, and LoRA best practices.

CRITICAL FIX: Only compute loss on ASSISTANT tokens, not system/user.
Previous version trained on the entire sequence, diluting the learning signal.

Key improvements over v1:
  1. LOSS MASKING: labels for system/user tokens = -100 (only learn assistant response)
  2. LOWER LR: 5e-5 (was 1.5e-4 — too high for QLoRA + small dataset)
  3. FEWER EPOCHS: 3 (was 6 — overfitting risk on ~10K examples)
  4. CURRICULUM LEARNING: Optionally train on simple examples first
  5. BETTER SAMPLING: Sample generation every 500 steps with quality metrics
  6. PROPER EVAL: eval_strategy (not deprecated evaluation_strategy)
  7. COSINE WITH MIN LR: Better LR schedule with floor
  8. NO REPEAT N-GRAM: Prevents repetitive SVG paths

Optimized for RTX 4070 (12GB VRAM).
Uses Qwen3-4B-Instruct (upgraded from Qwen2.5-Coder-3B for better code generation).

Usage:
  python public/training/train-svg-model-v2.py

  # Custom parameters:
  python public/training/train-svg-model-v2.py --epochs 4 --lr 3e-5

  # Curriculum learning (simple → complex):
  python public/training/train-svg-model-v2.py --curriculum

  # Resume from checkpoint:
  python public/training/train-svg-model-v2.py --resume-from checkpoints/checkpoint-500

Requirements:
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
  pip install transformers>=4.40 peft>=0.10 bitsandbytes>=0.30 accelerate>=0.30
  pip install datasets svgelements flash-attn --no-build-isolation
"""

import os
import sys

# Fix Windows console encoding (cp1251 can't handle emoji/UTF-8)
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import json
import argparse
import math
from pathlib import Path
from datetime import datetime

# CRITICAL: on Windows, importing torch before datasets causes a silent crash
# due to DLL/CRT conflict between PyTorch and PyArrow.
# MUST import datasets BEFORE torch!
from datasets import Dataset
import torch
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig,
    TrainingArguments,
    Trainer,
    DataCollatorForSeq2Seq,
    TrainerCallback,
)
from peft import (
    LoraConfig,
    get_peft_model,
    prepare_model_for_kbit_training,
    TaskType,
)


# ─── Configuration ────────────────────────────────────────────────────

_SCRIPT_DIR = Path(__file__).resolve().parent

# Dataset: prefer v6 > v5 > v4 > default
for _ds in ['dataset-v7', 'dataset-v6', 'dataset-v5', 'dataset-v4', 'dataset']:
    if (_SCRIPT_DIR / _ds).exists():
        DATASET_DIR = _SCRIPT_DIR / _ds
        break
else:
    DATASET_DIR = _SCRIPT_DIR / 'dataset'

CHECKPOINT_DIR = Path(__file__).resolve().parent.parent / 'checkpoints'
OUTPUT_DIR = Path(__file__).resolve().parent.parent / 'svg-model'

MODEL_NAME = "Qwen/Qwen3-4B-Instruct-2507"

# QLoRA parameters — based on research best practices
LORA_R = 32           # Rank: 32 good for complex SVG structure
LORA_ALPHA = 64       # Alpha: 2x rank (standard practice)
LORA_DROPOUT = 0.1    # Higher dropout to reduce overfitting (v6 showed 24% gap)
TARGET_MODULES = [
    "q_proj", "k_proj", "v_proj", "o_proj",     # Attention
    "gate_proj", "up_proj", "down_proj",          # MLP
]

# Training defaults — adjusted for small dataset quality
DEFAULT_EPOCHS = 2           # 2 epochs (v6 overfit at epoch 3, 24% train/eval gap)
DEFAULT_BATCH_SIZE = 2       # Per GPU (12GB VRAM limit)
DEFAULT_GRAD_ACCUM = 8       # Effective batch = 2 * 8 = 16
DEFAULT_LR = 2e-5            # 2e-5 (lower = more stable for QLoRA, was 5e-5)
DEFAULT_MAX_SEQ_LEN = 2048
DEFAULT_WARMUP_RATIO = 0.1   # 10% warmup

SYSTEM_PROMPT = """You are an SVG icon designer. Rules:
- Output only <path> elements with d attribute
- No <svg> wrapper, no xmlns, no width/height, no <g>, no transform
- ViewBox: 512x512, center icon, coords in 56-456
- Use currentColor for all colors, no hex colors
- Outlined: fill="none" stroke="currentColor" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"
- Filled: fill="currentColor" stroke="none"
- Keep simple: 1-5 elements, no text/labels/defs/filters
- Output SVG only, no markdown or explanation
/no_think"""


# ─── Loss Masking ─────────────────────────────────────────────────────

def create_loss_masked_labels(input_ids: list[int], tokenizer,
                               assistant_start_token: str = '<|im_start|>assistant') -> list[int]:
    """
    Create labels with loss masking: only compute loss on assistant tokens.

    This is CRITICAL for instruction fine-tuning. Without it, the model
    wastes capacity learning to predict the system prompt and user instruction,
    instead of focusing on the SVG output.

    For Qwen2.5 chat format:
      <|im_start|>system\n...<|im_end|>\n<|im_start|>user\n...<|im_end|>\n<|im_start|>assistant\nSVG HERE<|im_end|>

    We mask everything before the assistant start token with -100.
    """
    labels = input_ids.copy()

    # Find the assistant start position
    # Encode the assistant marker to find it in the token sequence
    assistant_marker_ids = tokenizer.encode(
        '<|im_start|>assistant\n', add_special_tokens=False
    )

    # Search for the last occurrence of the assistant marker
    # (in case system/user mentions the word "assistant")
    marker_len = len(assistant_marker_ids)
    assistant_start_idx = -1

    for i in range(len(labels) - marker_len + 1):
        if labels[i:i + marker_len] == assistant_marker_ids:
            assistant_start_idx = i

    if assistant_start_idx == -1:
        # Fallback: mask everything except last 80% (rough heuristic)
        # This shouldn't happen with proper chat templates
        mask_until = len(labels) // 5
        for i in range(mask_until):
            labels[i] = -100
        return labels

    # Mask everything up to and including the assistant marker
    for i in range(assistant_start_idx + marker_len):
        labels[i] = -100

    # Also mask the end-of-sequence token if present
    # (we don't want to train on predicting <|im_end|>)
    eos_id = tokenizer.eos_token_id
    for i in range(len(labels) - 1, max(assistant_start_idx, 0), -1):
        if labels[i] == eos_id:
            labels[i] = -100
            break

    return labels


# ─── Dataset loading ──────────────────────────────────────────────────

def load_dataset(dataset_dir: Path, max_seq_len: int, tokenizer,
                 curriculum: bool = False):
    """Load and tokenize the icon dataset with PROPER LOSS MASKING."""

    dataset_dir = Path(dataset_dir)
    if not dataset_dir.exists():
        print(f"ERROR: dataset dir not found: {dataset_dir}")
        sys.exit(1)

    train_path = dataset_dir / 'icons_train.jsonl'
    val_path = dataset_dir / 'icons_val.jsonl'

    if not train_path.exists():
        print(f"ОШИБКА: {train_path} не найден!")
        print("Сначала запустите: python public/training/prepare-dataset-v5.py")
        sys.exit(1)

    # Load JSONL files
    def load_jsonl(filepath):
        data = []
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    data.append(json.loads(line))
        return data

    train_data = load_jsonl(train_path)
    val_data = load_jsonl(val_path) if val_path.exists() else []

    print(f"📊 Загружено: {len(train_data)} train, {len(val_data)} val")

    # Curriculum learning: sort by complexity (simple first)
    if curriculum:
        complexity_order = {'simple': 0, 'medium': 1, 'complex': 2}
        # Extract complexity from raw data if available
        # For LLM format, we don't have complexity in the record,
        # so estimate from SVG length in assistant content
        def get_complexity(example):
            for msg in example.get('messages', []):
                if msg.get('role') == 'assistant':
                    return len(msg.get('content', ''))
            return 0

        train_data.sort(key=get_complexity)
        print("  📈 Curriculum learning: sorted by complexity (simple → complex)")

    # Format into chat template
    # Qwen3: pass enable_thinking=False to disable <think> blocks in training data
    _think_kwargs = {}
    try:
        tokenizer.apply_chat_template(
            [{'role': 'user', 'content': 'x'}],
            tokenize=False, add_generation_prompt=True,
            enable_thinking=False,
        )
        _think_kwargs['enable_thinking'] = False
        print("  🧠 Qwen3: thinking mode OFF в chat template")
    except TypeError:
        pass  # Not a Qwen3 model

    def format_example(example):
        """Convert messages to model's chat format."""
        messages = example['messages']
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False,
            **_think_kwargs,
        )
        return {'text': text}

    train_dataset = Dataset.from_list(train_data)
    val_dataset = Dataset.from_list(val_data) if val_data else None

    train_dataset = train_dataset.map(format_example)
    if val_dataset:
        val_dataset = val_dataset.map(format_example)

    # Tokenize with LOSS MASKING
    def tokenize_fn(example):
        result = tokenizer(
            example['text'],
            truncation=True,
            max_length=max_seq_len,
            padding=False,
            return_tensors=None,
        )
        # CRITICAL: Create loss-masked labels
        # Only compute loss on assistant tokens, not system/user
        result['labels'] = create_loss_masked_labels(
            result['input_ids'], tokenizer
        )
        return result

    print("🔤 Токенизация с loss masking...")
    train_dataset = train_dataset.map(
        tokenize_fn,
        remove_columns=train_dataset.column_names,
        desc="Tokenizing train",
    )
    if val_dataset:
        val_dataset = val_dataset.map(
            tokenize_fn,
            remove_columns=val_dataset.column_names,
            desc="Tokenizing val",
        )

    # Filter too-long examples
    before_train = len(train_dataset)
    train_dataset = train_dataset.filter(
        lambda x: len(x['input_ids']) <= max_seq_len
    )
    after_train = len(train_dataset)
    if before_train != after_train:
        print(f"  ⚠️ Отфильтровано {before_train - after_train} слишком длинных "
              f"примеров (>{max_seq_len} токенов)")

    # Verify loss masking
    sample = train_dataset[0]
    labels = sample['labels']
    masked = sum(1 for l in labels if l == -100)
    total = len(labels)
    print(f"  Loss masking: {masked}/{total} токенов замаскировано "
          f"({100*masked/total:.0f}% — system+user)")

    print(f"  Train: {len(train_dataset)} примеров")
    if val_dataset:
        print(f"  Val: {len(val_dataset)} примеров")

    return train_dataset, val_dataset


# ─── Model setup ──────────────────────────────────────────────────────

def setup_model_and_tokenizer(model_name: str, max_seq_len: int):
    """Load model with 4-bit quantization and setup LoRA."""

    print(f"🤖 Загрузка модели {model_name}...")

    if not torch.cuda.is_available():
        print("ОШИБКА: CUDA не доступна! Нужна видеокарта NVIDIA.")
        sys.exit(1)

    gpu_name = torch.cuda.get_device_name(0)
    gpu_mem = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print(f"  GPU: {gpu_name} ({gpu_mem:.1f} GB)")

    # Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        trust_remote_code=True,
        padding_side='right',  # For training
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Qwen3: disable thinking mode for faster, direct SVG output
    # Thinking mode adds <think>...</think> blocks which waste tokens
    # for structured output like SVG. We want direct generation.
    if hasattr(tokenizer, 'apply_chat_template'):
        # Test if this is a Qwen3 model with thinking support
        try:
            test_out = tokenizer.apply_chat_template(
                [{'role': 'user', 'content': 'test'}],
                tokenize=False, add_generation_prompt=True,
                enable_thinking=False,
            )
            print("  ✅ Qwen3 thinking mode: DISABLED (direct SVG output)")
        except TypeError:
            print("  ℹ️ Not a Qwen3 thinking model (standard generation)")

    # 4-bit quantization config
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # Load model
    # Qwen3-4B is ~1B more params than Qwen2.5-3B, but still fits 12GB VRAM
    # with QLoRA 4-bit + gradient checkpointing + batch_size=1
    model_kwargs = {
        'quantization_config': bnb_config,
        'device_map': 'auto',
        'trust_remote_code': True,
        'torch_dtype': torch.bfloat16,
        'use_cache': False,  # Required for gradient checkpointing
    }

    # Try Flash Attention 2
    try:
        model_kwargs['attn_implementation'] = 'flash_attention_2'
        model = AutoModelForCausalLM.from_pretrained(model_name, **model_kwargs)
        print("  ✅ Flash Attention 2 включен")
    except Exception as e:
        print(f"  ⚠️ Flash Attention 2 недоступен: {e}")
        model_kwargs.pop('attn_implementation', None)
        model = AutoModelForCausalLM.from_pretrained(model_name, **model_kwargs)

    print(f"  Модель загружена. Параметров: {model.num_parameters():,}")

    # Prepare for k-bit training
    model = prepare_model_for_kbit_training(model)

    # Enable gradient checkpointing
    model.gradient_checkpointing_enable()

    # LoRA configuration
    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=TARGET_MODULES,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    return model, tokenizer


# ─── Training ─────────────────────────────────────────────────────────

class SVGGenerationCallback(TrainerCallback):
    """Callback to generate sample SVGs during training for quality monitoring."""

    def __init__(self, tokenizer, prompt_samples, log_dir: Path, every_n_steps=500, think_kwargs=None):
        self.tokenizer = tokenizer
        self.prompt_samples = prompt_samples
        self.log_dir = log_dir
        self.every_n_steps = every_n_steps
        self._think_kwargs = think_kwargs or {}
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def on_step_end(self, args, state, control, model=None, **kwargs):
        if state.global_step % self.every_n_steps != 0 or state.global_step == 0:
            return

        if model is None:
            return

        print(f"\n🎨 Генерация примеров (step {state.global_step})...")
        model.eval()

        generations = []
        for prompt in self.prompt_samples:
            messages = [
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': prompt},
            ]
            text = self.tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True,
                **self._think_kwargs,
            )
            inputs = self.tokenizer(text, return_tensors='pt').to(model.device)

            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=300,
                    temperature=0.6,
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=self.tokenizer.pad_token_id,
                    repetition_penalty=1.2,
                )

            generated = outputs[0][inputs['input_ids'].shape[1]:]
            generated_text = self.tokenizer.decode(
                generated, skip_special_tokens=True
            )

            # Quick quality check
            has_svg_elem = bool(re.search(
                r'<(path|circle|rect|line|polyline|polygon|ellipse)',
                generated_text
            ))
            has_currentColor = 'currentColor' in generated_text
            quality = '✅' if (has_svg_elem and has_currentColor) else '❌'

            generations.append({
                'step': state.global_step,
                'prompt': prompt,
                'generated': generated_text,
                'has_svg_elements': has_svg_elem,
                'has_currentColor': has_currentColor,
                'quality': quality,
            })
            print(f"  {quality} Prompt: {prompt}")
            print(f"     Output: {generated_text[:120]}...")

        # Save generations
        gen_file = self.log_dir / f'generations_step_{state.global_step}.json'
        with open(gen_file, 'w', encoding='utf-8') as f:
            json.dump(generations, f, indent=2, ensure_ascii=False)

        # Quality summary
        good = sum(1 for g in generations if g['quality'] == '✅')
        print(f"  Качество: {good}/{len(generations)} валидных SVG")

        model.train()


import re  # Needed for quality check in callback


def train(args):
    """Main training loop."""

    print("=" * 60)
    print("🚀 ОБУЧЕНИЕ SVG ICON GENERATOR v2")
    print("=" * 60)
    print(f"Модель:       {args.model_name}")
    print(f"Датасет:      {DATASET_DIR}")
    print(f"Чекпоинты:    {CHECKPOINT_DIR}")
    print(f"Результат:    {OUTPUT_DIR}")
    print(f"Эпохи:        {args.epochs}")
    print(f"Batch size:   {args.batch_size}")
    print(f"Grad accum:   {args.grad_accum}")
    print(f"LR:           {args.lr}")
    print(f"Max seq len:  {args.max_seq_len}")
    print(f"LoRA rank:    {args.lora_r}")
    print(f"Curriculum:   {args.curriculum}")
    print(f"LOSS MASKING: ✅ (only assistant tokens)")
    print("=" * 60)

    # Setup model
    model, tokenizer = setup_model_and_tokenizer(
        args.model_name, args.max_seq_len
    )

    # Load dataset
    train_dataset, val_dataset = load_dataset(
        DATASET_DIR, args.max_seq_len, tokenizer,
        curriculum=args.curriculum,
    )

    # Calculate steps
    effective_batch = args.batch_size * args.grad_accum
    num_training_steps = (len(train_dataset) // effective_batch) * args.epochs
    print(f"\n📈 Шагов обучения: ~{num_training_steps}")
    print(f"   Эффективный batch: {effective_batch}")

    # Training arguments
    training_args = TrainingArguments(
        output_dir=str(CHECKPOINT_DIR),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,

        # Learning rate schedule
        learning_rate=args.lr,
        lr_scheduler_type="cosine",
        warmup_ratio=args.warmup_ratio,

        # Optimization
        bf16=True,
        optim="paged_adamw_8bit",
        max_grad_norm=1.0,

        # Logging & saving
        logging_steps=25,
        logging_dir=str(CHECKPOINT_DIR / 'logs'),
        save_strategy="steps",
        save_steps=500,
        save_total_limit=3,

        # Evaluation
        eval_strategy="steps" if val_dataset else "no",
        eval_steps=500 if val_dataset else None,

        # Performance
        dataloader_num_workers=0 if sys.platform == 'win32' else 4,  # 0 on Windows (avoids hangs)
        dataloader_pin_memory=True if sys.platform != 'win32' else False,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},

        # Misc
        remove_unused_columns=False,
        report_to="wandb" if args.wandb else "none",
        run_name=f"svg-icon-gen-v2-{datetime.now().strftime('%Y%m%d-%H%M')}" if args.wandb else None,

        # Hub (optional)
        push_to_hub=args.push_to_hub,
        hub_model_id=args.hub_model_id,
    )

    # Sample prompts for generation callback
    sample_prompts = [
        'outlined minimal icon "shopping cart"',
        'filled minimal icon "rocket launch"',
        'outlined flat icon "email"',
        'filled flat icon "camera"',
        'outlined minimal icon "lightning bolt"',
    ]

    # Detect Qwen3 thinking mode kwargs for generation callback
    think_kwargs = {}
    try:
        tokenizer.apply_chat_template(
            [{'role': 'user', 'content': 'x'}],
            tokenize=False, add_generation_prompt=True,
            enable_thinking=False,
        )
        think_kwargs['enable_thinking'] = False
    except TypeError:
        pass

    generation_callback = SVGGenerationCallback(
        tokenizer=tokenizer,
        prompt_samples=sample_prompts,
        log_dir=CHECKPOINT_DIR / 'generations',
        every_n_steps=500,
        think_kwargs=think_kwargs,
    )

    # Data collator
    data_collator = DataCollatorForSeq2Seq(
        tokenizer=tokenizer,
        padding=True,
        max_length=args.max_seq_len,
    )

    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        data_collator=data_collator,
        callbacks=[generation_callback],
    )

    # Resume or start fresh
    if args.resume_from:
        print(f"📂 Возобновление с чекпоинта: {args.resume_from}")
        trainer.train(resume_from_checkpoint=args.resume_from)
    else:
        trainer.train()

    # Save final model
    print("\n💾 Сохранение финальной модели...")
    final_dir = OUTPUT_DIR / 'final'
    trainer.save_model(str(final_dir))
    tokenizer.save_pretrained(str(final_dir))

    # Also save LoRA adapter separately
    adapter_dir = OUTPUT_DIR / 'lora-adapter'
    model.save_pretrained(str(adapter_dir))
    tokenizer.save_pretrained(str(adapter_dir))

    print(f"\n✅ Обучение завершено!")
    print(f"   Финальная модель: {final_dir}")
    print(f"   LoRA адаптер:     {adapter_dir}")
    print(f"\n📋 Для инференса запустите:")
    print(f"   python public/training/inference-svg-model-v2.py --model-path {adapter_dir}")


# ─── CLI ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='Train SVG icon generator v2 with loss masking'
    )

    # Model
    parser.add_argument('--model-name', type=str, default=MODEL_NAME,
                        help='Base model name or path')
    parser.add_argument('--lora-r', type=int, default=LORA_R,
                        help='LoRA rank')
    parser.add_argument('--lora-alpha', type=int, default=LORA_ALPHA,
                        help='LoRA alpha')

    # Training
    parser.add_argument('--epochs', type=int, default=DEFAULT_EPOCHS,
                        help='Number of training epochs (3 recommended)')
    parser.add_argument('--batch-size', type=int, default=DEFAULT_BATCH_SIZE,
                        help='Per-device batch size')
    parser.add_argument('--grad-accum', type=int, default=DEFAULT_GRAD_ACCUM,
                        help='Gradient accumulation steps')
    parser.add_argument('--lr', type=float, default=DEFAULT_LR,
                        help='Learning rate (5e-5 recommended for QLoRA)')
    parser.add_argument('--max-seq-len', type=int, default=DEFAULT_MAX_SEQ_LEN,
                        help='Maximum sequence length')
    parser.add_argument('--warmup-ratio', type=float, default=DEFAULT_WARMUP_RATIO,
                        help='Warmup ratio')
    parser.add_argument('--curriculum', action='store_true',
                        help='Enable curriculum learning (simple → complex)')

    # Dataset
    parser.add_argument('--dataset-dir', type=str, default=None,
                        help='Override dataset directory')

    # Resume
    parser.add_argument('--resume-from', type=str, default=None,
                        help='Resume from checkpoint directory')

    # Logging
    parser.add_argument('--wandb', action='store_true',
                        help='Enable Weights & Biases logging')

    # Hub
    parser.add_argument('--push-to-hub', action='store_true',
                        help='Push model to Hugging Face Hub')
    parser.add_argument('--hub-model-id', type=str, default=None,
                        help='Hugging Face Hub model ID')

    args = parser.parse_args()

    if args.dataset_dir:
        global DATASET_DIR
        DATASET_DIR = Path(args.dataset_dir)

    train(args)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
