import argparse
import sys
import os
import subprocess
import re
from pathlib import Path

def get_rustc_host() -> str:
    try:
        out = subprocess.check_output(['rustc', '-vV'], stderr=subprocess.STDOUT)
        text = out.decode('utf-8', errors='replace')
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f'Failed to run rustc: {e}', file=sys.stderr)
        sys.exit(1)

    m = re.search(r'host:\s+(\S+)', text)
    if m is None:
        print('Failed to determine platform target triple', file=sys.stderr)
        sys.exit(1)
    target = m.group(1)
    return target

RUSTC_TARGET = get_rustc_host()

parser = argparse.ArgumentParser(description="Rename the Python sidecar executable in the build artifacts.")
parser.add_argument(
    "--target",
    type=str,
    help="The target platform triple (e.g., x86_64-pc-windows-msvc). If not provided, it will be detected via rustc.",
    default=RUSTC_TARGET,
)
parser.add_argument(
    "--name",
    type=str,
    help="The name of the server executable.",
    default="server",
)

def main():
    args = parser.parse_args()
    target: str = args.target
    name: str = args.name
    ext = ".exe" if os.name == "nt" else ""

    src_dir = Path("dist/" + name)
    src_executable = src_dir / f"{name}{ext}"
    src_dependency_dir = src_dir / "_internal"
    if not src_executable.exists() or not src_dependency_dir.exists():
        print(f"Build artifacts not found: {src_executable}", file=sys.stderr)
        sys.exit(1)

    dest_executable = src_dir / f"{name}-{target}{ext}"

    try:
        src_executable.rename(dest_executable)
    except Exception as e:
        print(f"Failed to rename: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
