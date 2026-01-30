import argparse
import uvicorn
from loguru import logger
from .api import app
from .db import migrate_db

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=1460)
    args = parser.parse_args()
    migrate_db()

    logger.info("Starting server on port {}", args.port)
    uvicorn.run(app, host="127.0.0.1", port=args.port)
