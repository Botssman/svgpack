import sys
import os

# Fix Windows console encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Change to script directory so relative paths work
os.chdir(os.path.dirname(os.path.abspath(__file__)))

sys.argv = ['train-svg-model-v2.py']
import importlib.util
spec = importlib.util.spec_from_file_location('train', 'train-svg-model-v2.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
mod.main()
