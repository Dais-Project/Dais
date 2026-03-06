import argparse
import uvicorn
from typing import Callable
from loguru import logger
from uvicorn.server import Server
from . import IS_DEV
from .api import app
from .db import migrate_db
from .parent_watchdog import ParentWatchdog
from .common import DATA_DIR


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

def create_server(port: int) -> tuple[Server, Callable[[], None]]:
    def stop_server():
        server.should_exit = True

    server_config = uvicorn.Config(app, host="127.0.0.1", port=port, workers=1)
    server = uvicorn.Server(server_config)
    return server, stop_server

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=1460)
    args = parser.parse_args()

    if IS_DEV:
        prevent_port_occupancy(args.port)

    logger.add(DATA_DIR / "server.log", mode="w", enqueue=True)
    await migrate_db()

    server, stop_server = create_server(args.port)
    ParentWatchdog(stop_server).start()
    await server.serve()
    await logger.complete()
