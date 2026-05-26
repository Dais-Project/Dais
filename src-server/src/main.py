import argparse
import asyncio
from typing import cast
from loguru import logger
from hypercorn.config import Config as HypercornConfig
from hypercorn.asyncio import serve as hypercorn_serve
from hypercorn.typing import Framework
from . import IS_DEV
from .api import app
from .db import migrate_db
from .logger import get_log_level, setup_logging
from .utils import ParentWatchdog


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

class Server:
    def __init__(self, log_level: int, local_port: int, remote_port: int | None = None) -> None:
        self._config = Server._create_config(log_level, local_port, remote_port)
        self._shutdown_event = asyncio.Event()
        self._loop = asyncio.get_event_loop()

    @staticmethod
    def _create_config(log_level: int, local_port: int, remote_port: int | None):
        LEVEL_MAP = {10: "debug", 20: "info", 30: "warning", 40: "error", 50: "critical"}
        config = HypercornConfig()
        config.bind = [f"127.0.0.1:{local_port}"]
        if remote_port is not None:
            config.bind.append(f"0.0.0.0:{remote_port}")
        config.loglevel = LEVEL_MAP.get(log_level, "info")
        config.workers = 1
        return config

    async def serve(self):
        global app
        await hypercorn_serve(cast(Framework, app),
                              self._config,
                              shutdown_trigger=self._shutdown_event.wait)

    def stop(self):
        self._loop.call_soon_threadsafe(self._shutdown_event.set)

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=1460)
    args = parser.parse_args()

    if IS_DEV:
        prevent_port_occupancy(args.port)

    await migrate_db()

    log_level = get_log_level(IS_DEV)
    server = Server(log_level, args.port)
    ParentWatchdog(server.stop).start()
    setup_logging(log_level)

    await server.serve()
