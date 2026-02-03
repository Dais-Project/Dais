import argparse
import sys
import os
import subprocess
import re
import shutil
from pathlib import Path

def get_rustc_host() -> str:
    try:
        out = subprocess.check_output(['rustc', '-vV'], stderr=subprocess.STDOUT)
        text = out.decode('utf-8', errors='replace')
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f'Failed to run rustc: {e}', file=sys.stderr)
        sys.exit(1)

    m = re.search(r'host:\s+(\S+)', text)
    if not m:
        print('Failed to determine platform target triple', file=sys.stderr)
        sys.exit(1)
    target = m.group(1)
    return target

RUSTC_TARGET = get_rustc_host()

parser = argparse.ArgumentParser(description="Move server binaries to Tauri directory.")
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
parser.add_argument(
    "--output-dir",
    type=str,
    help="The output directory for the server binaries.",
    default="../src-tauri/",
)

def main():
    args = parser.parse_args()
    target: str = args.target
    name: str = args.name
    output_dir: str = args.output_dir
    ext = ".exe" if os.name == "nt" else ""

    # prepare dest path
    dest_dir = Path(output_dir) / "bin"
    dest_executable = dest_dir / f"{name}-{target}{ext}"
    dest_dependency_dir = dest_dir / "_internal"
    dest_dir.mkdir(parents=True, exist_ok=True)

    src_dir = Path("dist/" + name)
    src_executable = src_dir / f"{name}{ext}"
    src_dependency_dir = src_dir / "_internal"
    if not src_executable.exists() or not src_dependency_dir.exists():
        print(f"Build artifacts not found: {src_executable}", file=sys.stderr)
        sys.exit(1)

    try:
        shutil.move(src_executable, dest_executable)
        shutil.move(src_dependency_dir, dest_dependency_dir)
    except Exception as e:
        print(f"Failed to move: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
