import argparse
import uvicorn
from loguru import logger

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=1460)
    args = parser.parse_args()

    logger.info("Starting server on port {}", args.port)
    uvicorn.run("src.app:app", host="127.0.0.1", port=args.port)
