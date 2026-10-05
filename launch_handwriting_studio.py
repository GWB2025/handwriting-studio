#!/usr/bin/env python3
"""Start the local handwriting app and open Capture, never a local HTML file."""
import argparse
from pathlib import Path
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser


ROOT = Path(__file__).resolve().parent
LOG = ROOT / 'logs' / 'server.log'


def capture_url(port):
    return f'http://127.0.0.1:{port}/'


def server_running(port):
    # Do not route a loopback request through a configured network proxy.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(capture_url(port), timeout=2) as response:
            html = response.read(65536).decode('utf-8', errors='replace')
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'Another service answered on port {port}. It has been left running.') from error
    except urllib.error.URLError as error:
        if isinstance(error.reason, ConnectionRefusedError):
            return False
        raise RuntimeError(f'Could not check port {port}: {error.reason}') from error
    except TimeoutError as error:
        raise RuntimeError(f'Port {port} did not respond. Please check the running app.') from error
    if '<title>Handwriting Studio · Letter capture</title>' not in html or 'id="notebook" class="letter-capture"' not in html:
        raise RuntimeError(f'Another service is using port {port}. It has been left running.')
    return True


def find_python():
    candidates = [ROOT / '.venv' / 'bin' / 'python',
                  ROOT.parent / 'handwriting-capture' / '.venv' / 'bin' / 'python',
                  Path(sys.executable)]
    for candidate in candidates:
        if not candidate.is_file():
            continue
        try:
            result = subprocess.run([str(candidate), '-c', 'import flask'],
                                    stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                    stderr=subprocess.DEVNULL, timeout=10)
            if result.returncode == 0:
                return str(candidate)
        except (OSError, subprocess.TimeoutExpired):
            continue
    raise RuntimeError('Flask is not installed in a usable Python environment. Follow the setup instructions in README.md.')


def ensure_server(port):
    """Reuse the app, or return the new process once Capture is ready."""
    if server_running(port):
        return None
    python = find_python()
    LOG.parent.mkdir(exist_ok=True)
    with LOG.open('a', encoding='utf-8') as log:
        process = subprocess.Popen(
            [python, str(ROOT / 'app.py'), '--host', '0.0.0.0', '--port', str(port)],
            cwd=ROOT, stdin=subprocess.DEVNULL, stdout=log, stderr=log,
            start_new_session=True,
        )
    try:
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError(f'The app could not start. See {LOG}')
            if server_running(port):
                return process
            time.sleep(0.2)
        raise RuntimeError(f'The app did not become ready. See {LOG}')
    except BaseException:
        # Only stop a process this launch attempt created, never an existing app.
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8766, help='server port (default: 8766)')
    parser.add_argument('--no-browser', action='store_true', help='start/check the app without opening a browser')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('port must be between 1 and 65535')
    try:
        process = ensure_server(args.port)
        print('Handwriting Studio is already running.' if process is None else f'Handwriting Studio started (process {process.pid}).')
        url = capture_url(args.port)
        print(f'Capture page: {url}')
        if not args.no_browser and not webbrowser.open(url, new=2):
            print('The browser did not open automatically. Open the web address above.')
        return 0
    except (RuntimeError, OSError) as error:
        print(f'Could not launch Handwriting Studio: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
