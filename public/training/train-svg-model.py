#!/usr/bin/env python3
"""
Train SVG icon generator model using QLoRA on Qwen2.5-Coder-3B-Instruct.

Optimized for RTX 4070 Ti (12GB VRAM).

Uses:
  - 4-bit quantization (bitsandbytes NF4)
  - LoRA adapters (rank=16, target all linear layers)
  - Gradient checkpointing
  - Flash Attention 2 (if available)

Usage:
  python scripts/train-svg-model.py

  # Custom parameters:
  python scripts/train-svg-model.py --epochs 5 --batch-size 2 --lr 2e-5

  # Resume from checkpoint:
  python scripts/train-svg-model.py --resume-from checkpoints/checkpoint-500

Requirements (install on your GPU machine):
  pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
  pip install transformers>=4.40 peft>=0.10 bitsandbytes>=0.43 accelerate>=0.30
  pip install datasets flash-attn --no-build-isolation
  pip install wandb  # optional, for logging
"""

import os
import sys
import json
import argparse
import math
from pathlib import Path
from datetime import datetime

import torch
from datasets import Dataset
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

# Auto-detect project root: look for dataset/ in parent or current dir
_SCRIPT_DIR = Path(__file__).resolve().parent
if (_SCRIPT_DIR / 'dataset').exists():
    PROJECT_ROOT = _SCRIPT_DIR
elif (_SCRIPT_DIR.parent / 'dataset').exists():
    PROJECT_ROOT = _SCRIPT_DIR.parent
else:
    PROJECT_ROOT = _SCRIPT_DIR

print(f"Script dir: {_SCRIPT_DIR}")
print(f"Project root: {PROJECT_ROOT}")
print(f"Dataset dir: {PROJECT_ROOT / 'dataset'}")
print(f"Dataset exists: {(PROJECT_ROOT / 'dataset').exists()}")
DATASET_DIR = PROJECT_ROOT / 'dataset'
CHECKPOINT_DIR = PROJECT_ROOT / 'checkpoints'
OUTPUT_DIR = PROJECT_ROOT / 'svg-model'

# Model choices — uncomment the one you want
MODEL_NAME = "Qwen/Qwen2.5-Coder-3B-Instruct"       # Best for code/SVG, fits 12GB
# MODEL_NAME = "Qwen/Qwen2.5-Coder-1.5B-Instruct"    # Smaller, faster, less capable
# MODEL_NAME = "Qwen/Qwen2.5-3B-Instruct"             # General purpose
# MODEL_NAME = "microsoft/Phi-3.5-mini-instruct"       # Alternative

# QLoRA parameters
LORA_R = 16           # LoRA rank
LORA_ALPHA = 32       # LoRA alpha (usually 2x rank)
LORA_DROPOUT = 0.05   # LoRA dropout
TARGET_MODULES = [     # Which layers to adapt
    "q_proj", "k_proj", "v_proj", "o_proj",
    "gate_proj", "up_proj", "down_proj",
]

# Training defaults
DEFAULT_EPOCHS = 4
DEFAULT_BATCH_SIZE = 2        # Per GPU (12GB VRAM can handle 2 with 4-bit)
DEFAULT_GRAD_ACCUM = 8        # Effective batch = 2 * 8 = 16
DEFAULT_LR = 2e-5
DEFAULT_MAX_SEQ_LEN = 2048    # Max SVG + prompt length
DEFAULT_WARMUP_RATIO = 0.1


# ─── Dataset loading ──────────────────────────────────────────────────

def load_dataset(dataset_dir: Path, max_seq_len: int, tokenizer):
    """Load and tokenize the icon dataset."""

    dataset_dir = Path(dataset_dir)
    if not dataset_dir.exists():
        print(f"ERROR: dataset dir not found: {dataset_dir}")
        print(f"Looking for: icons_train.jsonl")
        sys.exit(1)

    train_path = dataset_dir / 'icons_train.jsonl'
    val_path = dataset_dir / 'icons_val.jsonl'

    if not train_path.exists():
        print(f"ОШИБКА: {train_path} не найден!")
        print("Сначала запустите: python scripts/prepare-dataset-v2.py")
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

    # Format into chat template
    def format_example(example):
        """Convert messages to model's chat format."""
        messages = example['messages']

        # Use tokenizer's chat template
        text = tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=False,
        )

        return {'text': text}

    train_dataset = Dataset.from_list(train_data)
    val_dataset = Dataset.from_list(val_data) if val_data else None

    train_dataset = train_dataset.map(format_example)
    if val_dataset:
        val_dataset = val_dataset.map(format_example)

    # Tokenize
    def tokenize_fn(example):
        result = tokenizer(
            example['text'],
            truncation=True,
            max_length=max_seq_len,
            padding=False,
            return_tensors=None,
        )
        result['labels'] = result['input_ids'].copy()
        return result

    print("🔤 Токенизация...")
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
    train_dataset = train_dataset.filter(lambda x: len(x['input_ids']) <= max_seq_len)
    after_train = len(train_dataset)
    if before_train != after_train:
        print(f"  ⚠️ Отфильтровано {before_train - after_train} слишком длинных примеров (>{max_seq_len} токенов)")

    print(f"  Train: {len(train_dataset)} примеров")
    if val_dataset:
        print(f"  Val: {len(val_dataset)} примеров")

    return train_dataset, val_dataset


# ─── Model setup ──────────────────────────────────────────────────────

def setup_model_and_tokenizer(model_name: str, max_seq_len: int):
    """Load model with 4-bit quantization and setup LoRA."""

    print(f"🤖 Загрузка модели {model_name}...")

    # Check GPU
    if not torch.cuda.is_available():
        print("ОШИБКА: CUDA не доступна! Нужна видеокарта NVIDIA.")
        sys.exit(1)

    gpu_name = torch.cuda.get_device_name(0)
    gpu_mem = torch.cuda.get_device_properties(0).total_mem / 1024**3
    print(f"  GPU: {gpu_name} ({gpu_mem:.1f} GB)")

    # Tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        model_name,
        trust_remote_code=True,
        padding_side='right',  # For training
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # 4-bit quantization config
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # Load model
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
    """Callback to log sample generations during training."""

    def __init__(self, tokenizer, prompt_samples, log_dir: Path, every_n_steps=500):
        self.tokenizer = tokenizer
        self.prompt_samples = prompt_samples
        self.log_dir = log_dir
        self.every_n_steps = every_n_steps
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
                {'role': 'system', 'content': 'You are a professional SVG icon designer. Create clean SVG icons using currentColor.'},
                {'role': 'user', 'content': prompt},
            ]
            text = self.tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )
            inputs = self.tokenizer(text, return_tensors='pt').to(model.device)

            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=512,
                    temperature=0.7,
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=self.tokenizer.pad_token_id,
                )

            generated = outputs[0][inputs['input_ids'].shape[1]:]
            generated_text = self.tokenizer.decode(generated, skip_special_tokens=True)

            generations.append({
                'step': state.global_step,
                'prompt': prompt,
                'generated': generated_text,
            })
            print(f"  Prompt: {prompt}")
            print(f"  Output: {generated_text[:100]}...")

        # Save generations
        gen_file = self.log_dir / f'generations_step_{state.global_step}.json'
        with open(gen_file, 'w', encoding='utf-8') as f:
            json.dump(generations, f, indent=2, ensure_ascii=False)

        model.train()


def train(args):
    """Main training loop."""

    print("=" * 60)
    print("🚀 ОБУЧЕНИЕ SVG ICON GENERATOR")
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
    print("=" * 60)

    # Setup model
    model, tokenizer = setup_model_and_tokenizer(args.model_name, args.max_seq_len)

    # Load dataset
    train_dataset, val_dataset = load_dataset(DATASET_DIR, args.max_seq_len, tokenizer)

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
        evaluation_strategy="steps" if val_dataset else "no",
        eval_steps=500 if val_dataset else None,

        # Performance
        dataloader_num_workers=4,
        dataloader_pin_memory=True,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},

        # Misc
        remove_unused_columns=False,
        report_to="wandb" if args.wandb else "none",
        run_name=f"svg-icon-gen-{datetime.now().strftime('%Y%m%d-%H%M')}" if args.wandb else None,

        # Push to Hub (optional)
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

    generation_callback = SVGGenerationCallback(
        tokenizer=tokenizer,
        prompt_samples=sample_prompts,
        log_dir=CHECKPOINT_DIR / 'generations',
        every_n_steps=500,
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

    # Also save LoRA adapter separately (lighter weight)
    adapter_dir = OUTPUT_DIR / 'lora-adapter'
    model.save_pretrained(str(adapter_dir))
    tokenizer.save_pretrained(str(adapter_dir))

    print(f"\n✅ Обучение завершено!")
    print(f"   Финальная модель: {final_dir}")
    print(f"   LoRA адаптер:     {adapter_dir}")
    print(f"\n📋 Для инференса запустите:")
    print(f"   python scripts/inference-svg-model.py --model-path {adapter_dir}")


# ─── CLI ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Train SVG icon generator with QLoRA')

    # Model
    parser.add_argument('--model-name', type=str, default=MODEL_NAME,
                        help='Base model name or path')
    parser.add_argument('--lora-r', type=int, default=LORA_R,
                        help='LoRA rank')
    parser.add_argument('--lora-alpha', type=int, default=LORA_ALPHA,
                        help='LoRA alpha')

    # Training
    parser.add_argument('--epochs', type=int, default=DEFAULT_EPOCHS,
                        help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=DEFAULT_BATCH_SIZE,
                        help='Per-device batch size')
    parser.add_argument('--grad-accum', type=int, default=DEFAULT_GRAD_ACCUM,
                        help='Gradient accumulation steps')
    parser.add_argument('--lr', type=float, default=DEFAULT_LR,
                        help='Learning rate')
    parser.add_argument('--max-seq-len', type=int, default=DEFAULT_MAX_SEQ_LEN,
                        help='Maximum sequence length')
    parser.add_argument('--warmup-ratio', type=float, default=DEFAULT_WARMUP_RATIO,
                        help='Warmup ratio')

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
    train(args)


if __name__ == '__main__':
    main()
