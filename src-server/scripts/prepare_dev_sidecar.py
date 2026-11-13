import shutil
import subprocess
from pathlib import Path


def get_host_target() -> str:
    output = subprocess.check_output(["rustc", "-vV"], text=True)
    for line in output.splitlines():
        if line.startswith("host: "):
            return line.removeprefix("host: ").strip()
    raise RuntimeError("Failed to determine the Rust host target triple")


def prepare_sidecar(project_root: Path, target: str) -> None:
    server_dir = project_root / "src-server" / "dist" / "server"
    extension = ".exe" if "windows" in target else ""
    executable = server_dir / f"server-{target}{extension}"
    raw_executable = server_dir / f"server{extension}"
    dependencies = server_dir / "_internal"
    frontend_index = project_root / "src-frontend" / "dist" / "index.html"

    def resources_ready() -> bool:
        return dependencies.is_dir() and frontend_index.is_file()

    if resources_ready():
        if executable.is_file():
            print("Tauri development resources are ready.", flush=True)
            return
        if raw_executable.is_file():
            raw_executable.rename(executable)
            print(f"Prepared sidecar: {executable.name}", flush=True)
            return

    print("Building missing Tauri development resources...", flush=True)
    pnpm = shutil.which("pnpm.cmd") or shutil.which("pnpm")
    if pnpm is None:
        raise FileNotFoundError("pnpm was not found on PATH")
    subprocess.run(
        [pnpm, "exec", "nx", "run", "server:build"],
        cwd=project_root,
        check=True,
    )
    if not executable.is_file() or not resources_ready():
        raise RuntimeError(
            "server:build did not produce the required sidecar and resources: "
            f"{executable}, {dependencies}, {frontend_index}"
        )


if __name__ == "__main__":
    prepare_sidecar(Path(__file__).resolve().parents[2], get_host_target())
