import argparse
from loguru import logger
from waitress import serve
from .app import App
from .db import migrate_db
from .agent.toolset_manager import use_mcp_toolset_manager
from .utils import use_async_task_pool

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=1460)
    args = parser.parse_args()

    migrate_db()
    app = App()
    async_task_pool = use_async_task_pool()
    mcp_toolset_manager = use_mcp_toolset_manager()

    async_task_pool.add_task(mcp_toolset_manager.connect_mcp_servers())
    logger.info("Starting server on port {}", args.port)
    serve(app, host="localhost", port=args.port)
    async_task_pool.add_task(mcp_toolset_manager.disconnect_mcp_servers())
