#!/bin/bash
# ============================================================
# SVGPack Training Pipeline v2 — Complete Run Script
# ============================================================
#
# Based on research: SVGen, LLM4SVG, HiVG, StarVector
#
# Changes from v1:
#   - Loss masking (only assistant tokens)
#   - Lower LR (5e-5 instead of 1.5e-4)
#   - Fewer epochs (3 instead of 6)
#   - BBox validation (not naive number scanning)
#   - Arc radius filtering (>512 rejected)
#   - Deterministic dedup (SHA-256)
#   - Shorter system prompt (fewer wasted tokens)
#
# Requirements:
#   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
#   pip install transformers>=4.40 peft>=0.10 bitsandbytes>=0.30 accelerate>=0.30
#   pip install datasets svgelements flash-attn --no-build-isolation
#
# Usage:
#   bash public/training/run-training.sh
#   bash public/training/run-training.sh --curriculum
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "============================================================"
echo "🚀 SVGPack Training Pipeline v2"
echo "============================================================"
echo "Project: $PROJECT_DIR"
echo ""

# Step 1: Generate dataset
echo "📊 Step 1: Generating dataset v5..."
python3 "$SCRIPT_DIR/prepare-dataset-v5.py" "$@"

echo ""
echo "✅ Dataset generated!"
echo ""

# Show dataset stats
if [ -f "$PROJECT_DIR/dataset-v5/stats.json" ]; then
    echo "📋 Dataset stats:"
    python3 -c "
import json
with open('$PROJECT_DIR/dataset-v5/stats.json') as f:
    s = json.load(f)
print(f'  Train: {s[\"train_examples\"]} examples ({s[\"train_icons\"]} icons)')
print(f'  Val: {s[\"val_examples\"]} examples ({s[\"val_icons\"]} icons)')
print(f'  Fill: outlined={s[\"fill_modes\"][\"outlined\"]}, filled={s[\"fill_modes\"][\"filled\"]}')
print(f'  Complexity: simple={s[\"complexities\"][\"simple\"]}, medium={s[\"complexities\"][\"medium\"]}, complex={s[\"complexities\"][\"complex\"]}')
print(f'  Est. training time: {s[\"training_estimate\"][\"estimated_hours_rtx4070ti\"]}h on RTX 4070 Ti')
"
fi

echo ""
echo "============================================================"
echo "🔧 Step 2: Starting training..."
echo "============================================================"
echo ""
echo "Configuration:"
echo "  Model: Qwen2.5-Coder-3B-Instruct (QLoRA 4-bit)"
echo "  LoRA: rank=32, alpha=64"
echo "  Epochs: 3"
echo "  LR: 5e-5"
echo "  Loss masking: ON (assistant tokens only)"
echo "  Batch: 2 x 8 accumulation = 16 effective"
echo ""

# Check for --curriculum flag
CURRICULUM_FLAG=""
for arg in "$@"; do
    if [ "$arg" = "--curriculum" ]; then
        CURRICULUM_FLAG="--curriculum"
    fi
done

# Step 2: Train
python3 "$SCRIPT_DIR/train-svg-model-v2.py" \
    --dataset-dir "$PROJECT_DIR/dataset-v5" \
    --epochs 3 \
    --lr 5e-5 \
    --batch-size 2 \
    --grad-accum 8 \
    --lora-r 32 \
    --lora-alpha 64 \
    $CURRICULUM_FLAG \
    "$@"

echo ""
echo "============================================================"
echo "✅ Training complete!"
echo "============================================================"
echo ""
echo "Next steps:"
echo "  1. Test the model:"
echo "     python3 $SCRIPT_DIR/inference-svg-model-v2.py --prompt 'outlined minimal icon \"home\"'"
echo ""
echo "  2. Interactive mode:"
echo "     python3 $SCRIPT_DIR/inference-svg-model-v2.py --interactive"
echo ""
echo "  3. Start API server:"
echo "     python3 $SCRIPT_DIR/inference-svg-model-v2.py --serve --port 8000"
