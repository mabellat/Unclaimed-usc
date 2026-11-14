#!/usr/bin/env python3
"""Run or test the complete local app, with an isolated PostgreSQL cluster.

    python3 scripts/app.py setup
    python3 scripts/app.py run
    python3 scripts/app.py test

Requires Python 3.11+, Node.js 20.9+, and PostgreSQL 16+ server binaries.
Chrome/Chromium is also required for browser tests. See README.md.
"""
from __future__ import annotations

import argparse
import contextlib
import fcntl
import os
from pathlib import Path
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "apps/api"
WEB = ROOT / "apps/web"
STATE = ROOT / ".local"
PYTHON = API / ".venv/bin/python"


def say(message):
    print(message, flush=True)


def run(args, *, cwd=ROOT, env=None, **kwargs):
    # Never print the environment: it may contain credentials.
    return subprocess.run([str(arg) for arg in args], cwd=cwd, env=env, check=True, **kwargs)


def pg_bin():
    candidates = [Path(os.environ["PG_BIN"])] if os.environ.get("PG_BIN") else []
    if shutil.which("initdb"):
        candidates.append(Path(shutil.which("initdb")).parent)
    candidates.extend(sorted(Path("/usr/lib/postgresql").glob("*/bin"), reverse=True))
    candidates.extend([Path("/opt/homebrew/opt/postgresql@16/bin"), Path("/usr/local/opt/postgresql@16/bin"), Path("/Applications/Postgres.app/Contents/Versions/latest/bin")])
    for directory in candidates:
        if all((directory / name).is_file() for name in ("initdb", "pg_ctl", "createdb", "psql")):
            return directory
    raise RuntimeError("PostgreSQL server tools are missing. Install PostgreSQL 16+ or set PG_BIN to its bin directory.")


def free_port(port):
    try:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", port))
    except PermissionError as error:
        raise RuntimeError(f"This environment blocks local sockets (port {port}). Run the launcher with local network permission.") from error
    except OSError as error:
        raise RuntimeError(f"Port {port} is unavailable. Stop the process using it or choose another port.") from error


class Processes:
    def __init__(self, logs):
        self.logs = logs
        self.logs.mkdir(parents=True, exist_ok=True)
        self.children = []

    def start(self, name, args, cwd, env):
        path = self.logs / f"{name}.log"
        with path.open("w") as log:
            proc = subprocess.Popen([str(arg) for arg in args], cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        self.children.append((name, proc, path))
        return proc

    def check(self):
        for name, proc, path in self.children:
            if proc.poll() is not None:
                raise RuntimeError(f"{name} exited with status {proc.returncode}. See {path}.")

    def stop(self):
        for _, proc, _ in reversed(self.children):
            # Terminate the entire group, including Next.js and reload children.
            with contextlib.suppress(ProcessLookupError):
                os.killpg(proc.pid, signal.SIGTERM)
        for _, proc, _ in reversed(self.children):
            try:
                proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                with contextlib.suppress(ProcessLookupError):
                    os.killpg(proc.pid, signal.SIGKILL)
                proc.wait()

    def wait_http(self, url, timeout=90):
        until = time.monotonic() + timeout
        while time.monotonic() < until:
            self.check()
            try:
                with urlopen(url, timeout=2) as response:
                    if response.status == 200:
                        return
            except (URLError, TimeoutError, ConnectionError):
                pass
            time.sleep(0.3)
        raise RuntimeError(f"Timed out waiting for {url}. See logs in {self.logs}.")


@contextlib.contextmanager
def database(directory, port):
    """Own this cluster only; never connect to or reset a user's external database."""
    directory.mkdir(parents=True, exist_ok=True)
    binaries = pg_bin()
    cluster = directory / "postgres"
    password_file = directory / "postgres-password"
    if not password_file.exists():
        if cluster.exists():
            raise RuntimeError(f"Missing {password_file}; refusing to modify an existing cluster.")
        password_file.write_text(secrets.token_hex(24))
        password_file.chmod(0o600)
    password = password_file.read_text().strip()
    if not (cluster / "PG_VERSION").exists():
        if cluster.exists():
            raise RuntimeError(f"Incomplete PostgreSQL cluster at {cluster}. Inspect it before trying again.")
        say("Initializing a private local PostgreSQL cluster…")
        run([binaries / "initdb", "-D", cluster, "-U", "unclaimed", "--auth=scram-sha-256", "--pwfile", password_file, "--encoding=UTF8", "--locale=C"], stdout=subprocess.DEVNULL)
    status = subprocess.run([str(binaries / "pg_ctl"), "-D", str(cluster), "status"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if status.returncode == 0:
        raise RuntimeError(f"The managed cluster is already running at {cluster}. Stop its launcher before starting another session.")
    free_port(port)
    started = False
    try:
        run([binaries / "pg_ctl", "-D", cluster, "-l", directory / "postgres.log", "-o", f"-h 127.0.0.1 -p {port} -k ''", "-w", "start"], stdout=subprocess.DEVNULL)
        started = True
        pg_env = dict(os.environ, PGHOST="127.0.0.1", PGPORT=str(port), PGUSER="unclaimed", PGPASSWORD=password, PGDATABASE="postgres")
        for name in ("unclaimed", "unclaimed_test"):
            exists = run([binaries / "psql", "-Atc", f"SELECT 1 FROM pg_database WHERE datname = '{name}'"], env=pg_env, capture_output=True, text=True).stdout.strip()
            if not exists:
                run([binaries / "createdb", name], env=pg_env)
        yield f"postgresql+psycopg://unclaimed:{password}@127.0.0.1:{port}/"
    finally:
        if started:
            say("Stopping managed PostgreSQL…")
            run([binaries / "pg_ctl", "-D", cluster, "-m", "fast", "-w", "stop"], stdout=subprocess.DEVNULL)


def dependencies():
    if not PYTHON.exists() or not (WEB / "node_modules/next/dist/bin/next").exists():
        raise RuntimeError("Dependencies are missing. Run: python3 scripts/app.py setup")
    if not shutil.which("node") or not shutil.which("npm"):
        raise RuntimeError("Node.js and npm are required.")


def setup():
    pg_bin()
    if not shutil.which("npm"):
        raise RuntimeError("Install Node.js 20.9+ (with npm) first.")
    if not PYTHON.exists():
        run([sys.executable, "-m", "venv", API / ".venv"])
    run([PYTHON, "-m", "pip", "install", "-r", API / "requirements.txt"])
    run(["npm", "ci"], cwd=WEB)
    say("Setup complete. Start everything with: python3 scripts/app.py run")


def environment(base_url, args, testing):
    env = dict(os.environ)
    env.update({
        "DATABASE_URL": base_url + "unclaimed",
        "TEST_DATABASE_URL": base_url + "unclaimed_test",
        "PYTHONPATH": str(API) + os.pathsep + str(ROOT / "apps"),
        "NEXT_PUBLIC_API_URL": f"http://localhost:{args.api_port}",
        "API_URL": f"http://localhost:{args.api_port}",
        "WEB_URL": f"http://localhost:{args.web_port}",
        "WEB_ORIGINS": f"http://localhost:{args.web_port},http://127.0.0.1:{args.web_port}",
        "PYTHONUNBUFFERED": "1",
    })
    if testing:
        env.update(UNCLAIMED_LLM="off", UNCLAIMED_DEMO_REPLAY="1", ADMIN_USER="owner", ADMIN_PASSWORD=secrets.token_hex(24))
    else:
        credential = STATE / "admin-password"
        if not env.get("ADMIN_PASSWORD"):
            if not credential.exists():
                credential.write_text(secrets.token_urlsafe(24) + "\n")
                credential.chmod(0o600)
            env["ADMIN_PASSWORD"] = credential.read_text().strip()
        env.setdefault("ADMIN_USER", "owner")
    return env


def start_services(processes, args, env, testing):
    say("Applying migrations and restoring the approved demo snapshot if the database is empty…")
    run([PYTHON, "-m", "alembic", "upgrade", "head"], cwd=API, env=env)
    run([PYTHON, "-m", "unclaimed.restore_snapshot"], cwd=API, env=env)
    processes.start("api", [PYTHON, "-m", "uvicorn", "unclaimed.main:app", "--host", "127.0.0.1", "--port", str(args.api_port)], API, env)
    processes.wait_http(env["API_URL"] + "/resources")
    processes.start("web", ["node", WEB / "node_modules/next/dist/bin/next", "start" if testing else "dev", "--hostname", "127.0.0.1", "--port", str(args.web_port)], WEB, env)
    processes.wait_http(env["WEB_URL"])
    if not args.no_worker:
        processes.start("worker", [PYTHON, "-m", "worker.watcher", "daemon"], API, env)
        # Exercise startup/import failures even though the first scheduled run is later.
        time.sleep(1)
        processes.check()


def test_all(args, base_url):
    env = environment(base_url, args, testing=True)
    processes = Processes(STATE / "test-logs")
    try:
        say("Running API, matching, approval, agent and worker tests against the disposable database…")
        run([PYTHON, "-m", "pytest", "-q"], cwd=API, env=env)
        run(["npm", "run", "typecheck"], cwd=WEB, env=env)
        run(["npm", "run", "build"], cwd=WEB, env=env)
        start_services(processes, args, env, testing=True)
        run([PYTHON, "-m", "unclaimed.demo_check", "--offline"], cwd=API, env=env)
        run(["npm", "run", "test:ux"], cwd=WEB, env=env)
        run(["npm", "run", "test:e2e"], cwd=WEB, env=env)
        processes.check()
        say("All checks passed. Live external USC/Claude calls were excluded; claim browser tests used labelled cached replay.")
    finally:
        processes.stop()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=("setup", "run", "test"))
    parser.add_argument("--web-port", type=int, default=3000)
    parser.add_argument("--api-port", type=int, default=8000)
    parser.add_argument("--db-port", type=int, default=55432)
    parser.add_argument("--no-worker", action="store_true", help="omit the nightly Watcher")
    args = parser.parse_args()
    if any(not 1024 <= port <= 65535 for port in (args.web_port, args.api_port, args.db_port)) or len({args.web_port, args.api_port, args.db_port}) != 3:
        parser.error("Choose three distinct unprivileged ports (1024–65535).")
    STATE.mkdir(exist_ok=True)
    # Setup/run/test share a frontend build directory and must not run concurrently.
    with (STATE / "app.lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("Another app.py command is running. Stop it before starting this command.")
        if args.command == "setup":
            setup()
            return
        dependencies()
        free_port(args.web_port)
        free_port(args.api_port)
        if args.command == "test":
            with tempfile.TemporaryDirectory(prefix="unclaimed-test-") as folder:
                with database(Path(folder), args.db_port) as base_url:
                    test_all(args, base_url)
        else:
            with database(STATE, args.db_port) as base_url:
                processes = Processes(STATE / "logs")
                try:
                    env = environment(base_url, args, testing=False)
                    start_services(processes, args, env, testing=False)
                    say(f"\nApp:   {env['WEB_URL']}\nAPI:   {env['API_URL']}/docs\nAdmin: {env['API_URL']}/admin (user: {env['ADMIN_USER']})")
                    say(f"Admin password: your ADMIN_PASSWORD, or {STATE / 'admin-password'}\nLogs: {processes.logs}\nCtrl+C stops all services; local data is kept.")
                    while True:
                        processes.check()
                        time.sleep(1)
                finally:
                    processes.stop()


if __name__ == "__main__":
    def interrupted(signum, frame):
        raise KeyboardInterrupt
    signal.signal(signal.SIGTERM, interrupted)
    try:
        main()
    except KeyboardInterrupt:
        say("Stopped.")
        sys.exit(130)
    except (RuntimeError, subprocess.CalledProcessError) as error:
        # CalledProcessError only shows argv, never the credential-bearing environment.
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)
