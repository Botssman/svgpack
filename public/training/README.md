# 🎨 Обучение SVG Icon Generator на RTX 4070 Ti

## Пошаговая инструкция (с нуля до работающей модели)

---

## ШАГ 1: Проверь что у тебя есть Python

Открой **командную строку** (Win+R → `cmd`) или **PowerShell** и набери:

```
python --version
```

Должно показать что-то вроде `Python 3.10.x` или `3.11.x` или `3.12.x`

Если Python не установлен — скачай с https://www.python.org/downloads/
При установке ОБЯЗАТЕЛЬНО поставь галочку **"Add Python to PATH"**

---

## ШАГ 2: Скачай тренировочный набор

Скачай архив по ссылке:
```
https://svgpack.vercel.app/training-kit.zip
```

Распакуй в любую папку, например:
```
C:\svg-training\
```

После распаковки должно быть:
```
C:\svg-training\
  training\
    dataset\
      icons_train.jsonl     ← обучающие данные
      icons_val.jsonl       ← данные для проверки
      stats.json            ← статистика
    train-svg-model.py      ← скрипт обучения
    inference-svg-model.py  ← скрипт генерации
    prepare-dataset-v2.py   ← пересборка датасета
    requirements-training.txt
```

---

## ШАГ 3: Создай виртуальное окружение

Открой командную строку и выполни:

```
cd C:\svg-training
python -m venv venv
```

Активируй:
```
venv\Scripts\activate
```

Теперь перед командой `(venv)` — это значит окружение активно.

---

## ШАГ 4: Установи PyTorch с поддержкой CUDA

Это самая важная часть. Нужно установить правильную версию под твою 4070 Ti:

```
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

⚠️ Скачивается ~2.5 ГБ, подожди.

**Проверка** — после установки выполни:
```
python -c "import torch; print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

Должно показать:
```
True
NVIDIA GeForce RTX 4070 Ti
```

Если `False` — значит CUDA не работает, PyTorch не видит видеокарту.
Попробуй другой индекс:
```
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
```

---

## ШАГ 5: Установи остальные библиотеки

```
pip install transformers>=4.40 peft>=0.10 bitsandbytes>=0.43 accelerate>=0.30 datasets
```

⚠️ bitsandbytes нужен для 4-битной квантизации (чтобы модель влезла в 12GB VRAM).

**На Windows** bitsandbytes может потребовать дополнительных шагов:
- Если ошибка при установке — попробуй:
```
pip install bitsandbytes-windows
```
- Или скачай wheel отсюда: https://github.com/jllllll/bitsandbytes-windows/releases

**Опционально** (ускоряет обучение в ~2 раза):
```
pip install flash-attn --no-build-isolation
```
Если не ставится — не критично, обучение будет работать и без этого.

---

## ШАГ 6: Запусти обучение!

```
cd C:\svg-training
venv\Scripts\activate
python training/train-svg-model.py
```

### Что произойдёт:

1. **Скачается базовая модель** Qwen2.5-Coder-3B-Instruct (~6 ГБ)
2. Модель загрузится в видеокарту (займёт ~4-5 ГБ VRAM с 4-бит квантизацией)
3. Начнётся обучение — увидишь прогресс-бар

### Ожидаемый вывод:
```
============================================================
🚀 ОБУЧЕНИЕ SVG ICON GENERATOR
============================================================
Модель:       Qwen/Qwen2.5-Coder-3B-Instruct
Датасет:      C:\svg-training\dataset
Эпохи:        4
Batch size:   2
============================================================

🤖 Загрузка модели Qwen/Qwen2.5-Coder-3B-Instruct...
  GPU: NVIDIA GeForce RTX 4070 Ti (12.0 GB)
  ✅ Модель загружена

📊 Загружено: 14294 train, 1590 val
🔤 Токенизация...

📈 Шагов обучения: ~3570
   Эффективный batch: 16

trainable params: 18,350,080 || all params: 3,098,613,760 || trainable%: 0.5922

  0%|          | 0/3570 [00:00<?, ?it/s]
```

### Сколько ждать:
- ~2.5-3.5 часа на 4070 Ti (4 эпохи)
- Каждые 500 шагов сохраняется чекпоинт
- Каждые 500 шагов генерируются примеры для проверки

---

## ШАГ 7: Настраивай параметры (если нужно)

Если не влезает в память (Out of Memory):
```
python training/train-svg-model.py --batch-size 1 --grad-accum 16
```

Если хочешь быстрее (меньше эпох):
```
python training/train-svg-model.py --epochs 2
```

Если хочешь другую модель (поменьше, быстрее обучается):
```
python training/train-svg-model.py --model-name Qwen/Qwen2.5-Coder-1.5B-Instruct
```

Если прервалось и хочешь продолжить:
```
python training/train-svg-model.py --resume-from checkpoints/checkpoint-500
```

---

## ШАГ 8: После обучения — тестируй модель

### Одиночный промпт:
```
python training/inference-svg-model.py --prompt "shopping cart" --model-path svg-model/lora-adapter
```

### Интерактивный режим:
```
python training/inference-svg-model.py --interactive --model-path svg-model/lora-adapter
```
Вводи описания иконок, модель генерирует SVG.

### Запустить как API-сервер:
```
python training/inference-svg-model.py --serve --port 8000 --model-path svg-model/lora-adapter
```
Потом можно дергать API:
```
curl -X POST http://localhost:8000/api/generate -H "Content-Type: application/json" -d "{\"prompt\": \"home icon\", \"fillMode\": \"outlined\", \"style\": \"minimal\"}"
```

---

## ШАГ 9: Подключить обученную модель к Vercel

После обучения у тебя есть LoRA-адаптер (~60MB). Варианты:

### Вариант A: Залить на HuggingFace Hub
```
pip install huggingface_hub
huggingface-cli login
# Загрузи адаптер:
python -c "
from huggingface_hub import upload_folder
upload_folder(
    folder_path='svg-model/lora-adapter',
    repo_id='ТВОЙ_НИК/svg-icon-generator',
    repo_type='model'
)
"
```

### Вариант B: Бесплатный GPU-хостинг для API
- **RunPod** (runpod.io) — $0.22/час за RTX 4070 Ti
- **Vast.ai** — от $0.15/час
- **Modal** (modal.com) — бесплатный тир

Запускаешь inference-svg-model.py --serve на GPU-сервере, 
а твой Vercel-сайт шлёт запросы на этот сервер.

---

## 🆘 Частые проблемы

### "CUDA out of memory"
Уменьши batch: `--batch-size 1 --grad-accum 16`
Или закрой другие программы использующие GPU (браузер, игры)

### "bitsandbytes не устанавливается на Windows"
```
pip install https://github.com/jllllll/bitsandbytes-windows/releases/download/v0.2.4/bitsandbytes-0.42.0-py3-none-win_amd64.whl
```

### "Модель не скачивается" 
Нужен интернет. Модель ~6GB качается с HuggingFace.
Если медленно — установи зеркало:
```
set HF_ENDPOINT=https://hf-mirror.com
```

### "torch.cuda.is_available() = False"
- Проверь драйверы NVIDIA (обнови до последних)
- Убедись что установил PyTorch с CUDA, не CPU-версию
- Попробуй cu124 вместо cu121

### "Обучение идёт но loss не падает"
- Попробуй уменьшить LR: `--lr 1e-5`
- Или увеличить эпохи: `--epochs 6`

---

## 📊 Чекпоинты и результаты

Во время обучения чекпоинты сохраняются в:
```
C:\svg-training\checkpoints\
  checkpoint-500\
  checkpoint-1000\
  ...
```

Финальная модель в:
```
C:\svg-training\svg-model\
  final\            ← полная модель (~6GB)
  lora-adapter\     ← только LoRA-адаптер (~60MB)
```

Примеры генерации во время обучения:
```
C:\svg-training\checkpoints\generations\
  generations_step_500.json
  generations_step_1000.json
  ...
```
