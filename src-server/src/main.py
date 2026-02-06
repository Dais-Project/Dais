import argparse
import uvicorn
from loguru import logger
from . import IS_DEV
from .api import app
from .db import migrate_db

def prevent_port_occupancy(port: int):
    import time
    import psutil

    def try_kill(proc: psutil.Process):
        if proc.pid <= 4:
            # system critical process, skip
            return

        logger.info(f"Port {port} is occupied by process {proc.info["pid"]}, try killing...")
        try:
            proc.terminate()
            _, alive = psutil.wait_procs([proc], timeout=3)
            if alive: proc.kill()
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass
        except Exception as e:
            logger.error(f"Error while killing process: {e}")

    for proc in psutil.process_iter(["pid", "name"]):
        try:
            for conn in proc.net_connections(kind="inet"):
                if conn.laddr.port == port:
                    try_kill(proc)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    time.sleep(1)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=1460)
    args = parser.parse_args()
    migrate_db()

    if IS_DEV:
        prevent_port_occupancy(args.port)
    uvicorn.run(app, host="127.0.0.1", port=args.port)
