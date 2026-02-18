import argparse
import sys
from watchfiles import PythonFilter, run_process

def dev():
    from entry import entry
    path_filter = PythonFilter(
        ignore_paths=["__pycache__", ".venv"] 
    )
    run_process("./src", target=entry, watch_filter=path_filter)

def schema():
    from scripts.export_openapi import main
    watches = ["./src/db/schemas", "./src/api", "./scripts/export_openapi.py"]
    path_filter = PythonFilter(
        ignore_paths=["__pycache__", ".venv"] 
    )
    run_process(
        *watches,
        target=main,
        watch_filter=path_filter
    )

parser = argparse.ArgumentParser()
parser.add_argument("command", choices=["dev", "schema"], help="The command to run.")

if __name__ == "__main__":
    # pass remaining args to the target script
    args, remaining_args = parser.parse_known_args()
    sys.argv = [sys.argv[0]] + remaining_args

    match args.command:
        case "dev": dev()
        case "schema": schema()
