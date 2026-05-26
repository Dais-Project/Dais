import sys
from pathlib import Path
from platformdirs import user_data_dir

APP_NAME = "org.dais.desktop"
DATA_DIR = Path(user_data_dir(APP_NAME, appauthor=False, ensure_exists=True))

if hasattr(sys, "_MEIPASS"):
    # point to the built `_internal` directory
    PROJECT_ROOT = Path(sys._MEIPASS)  # type: ignore
    STATIC_DIR = PROJECT_ROOT / "../dist/"
else:
    PROJECT_ROOT = Path(__file__).absolute().parent.parent
    STATIC_DIR = None
