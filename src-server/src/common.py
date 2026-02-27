from pathlib import Path
from platformdirs import user_data_dir

APP_NAME = "org.dais.desktop"
DATA_DIR = Path(user_data_dir(APP_NAME, appauthor=False, ensure_exists=True))
