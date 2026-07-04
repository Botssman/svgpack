import sys
import os
import traceback

# Force UTF-8 on Windows
if sys.platform == 'win32':
    os.environ['PYTHONUTF8'] = '1'
    try:
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace', line_buffering=True)
    except Exception:
        pass

# Change to script directory
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)
print(f'[run-v2] Working dir: {os.getcwd()}', flush=True)
print(f'[run-v2] Python: {sys.executable}', flush=True)
print(f'[run-v2] CUDA check...', flush=True)

try:
    # CRITICAL: import datasets BEFORE torch on Windows!
    # If torch loads first, it breaks PyArrow/DLL causing silent crash.
    from datasets import Dataset as _ds
    import torch
    print(f'[run-v2] PyTorch {torch.__version__}, CUDA: {torch.cuda.is_available()}', flush=True)
    if torch.cuda.is_available():
        print(f'[run-v2] GPU: {torch.cuda.get_device_name(0)}', flush=True)
except ImportError as e:
    print(f'[run-v2] ERROR: import failed: {e}', flush=True)
    sys.exit(1)

print(f'[run-v2] Loading train-svg-model-v2.py...', flush=True)

sys.argv = ['train-svg-model-v2.py']

try:
    import importlib.util
    spec = importlib.util.spec_from_file_location('train', os.path.join(script_dir, 'train-svg-model-v2.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    print(f'[run-v2] Module loaded, starting training...', flush=True)
    mod.main()
except SystemExit as e:
    print(f'[run-v2] SystemExit: {e.code}', flush=True)
except Exception as e:
    print(f'[run-v2] ERROR: {e}', flush=True)
    traceback.print_exc()
