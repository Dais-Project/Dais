import argparse
import uvicorn
from loguru import logger
from . import IS_DEV
from .api import app
from .db import migrate_db

def prevent_port_occupancy(port):
    import os
    import signal
    import time
    import psutil
    for proc in psutil.process_iter(["pid", "name"]):
        try:
            for conn in proc.net_connections(kind="inet"):
                if conn.laddr.port == port:
                    logger.info(f"Port {port} is occupied by process {proc.info["pid"]}, killing...")
                    os.kill(proc.info["pid"], signal.SIGTERM)
                    time.sleep(1)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=1460)
    args = parser.parse_args()
    migrate_db()

    if IS_DEV:
        prevent_port_occupancy(args.port)
    uvicorn.run(app, host="127.0.0.1", port=args.port)
