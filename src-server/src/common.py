import sys
from pathlib import Path
from platformdirs import user_data_dir

APP_NAME = "org.dais.desktop"
DATA_DIR = Path(user_data_dir(APP_NAME, appauthor=False, ensure_exists=True))

if hasattr(sys, "_MEIPASS"):
    PROJECT_ROOT = Path(sys._MEIPASS)  # type: ignore
else:
    PROJECT_ROOT = Path(__file__).absolute().parent.parent
