#!/usr/bin/env python3
"""Open or start the USB-connected Mac's Handwriting Studio plotting window."""
import argparse
import json
import subprocess
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path
from launch_handwriting_studio import find_python

ROOT = Path(__file__).resolve().parent


def running(port):
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        with opener.open(f'http://127.0.0.1:{port}/api/identity', timeout=2) as response:
            info = json.loads(response.read(4096))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f'Another service is using port {port}; it has been left running.') from exc
    except urllib.error.URLError as exc:
        if isinstance(exc.reason, ConnectionRefusedError): return False
        raise RuntimeError(f'Could not check the plotting window: {exc.reason}') from exc
    except (ValueError, TimeoutError) as exc:
        raise RuntimeError(f'An unrecognised service answered on port {port}; it has been left running.') from exc
    if info.get('service') != 'handwriting-studio-plotter':
        raise RuntimeError(f'Another service is using port {port}; it has been left running.')
    return True


def launch(port):
    if running(port): return
    if not (ROOT/'docs/plotting.html').exists(): raise RuntimeError('Build the website first with npm run build.')
    (ROOT/'logs').mkdir(exist_ok=True)
    with (ROOT/'logs/plotter-server.log').open('a') as log:
        process = subprocess.Popen([find_python(), str(ROOT/'plotter_app.py'), '--port', str(port)],
                                   cwd=ROOT, stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
    try:
        end = time.monotonic()+15
        while time.monotonic() < end:
            if process.poll() is not None: raise RuntimeError('The plotting window could not start. See logs/plotter-server.log.')
            if running(port): return
            time.sleep(.2)
        raise RuntimeError('The plotting window did not become ready.')
    except BaseException:
        if process.poll() is None:
            process.terminate()
            try: process.wait(timeout=5)
            except subprocess.TimeoutExpired: process.kill(); process.wait()
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8767)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535: parser.error('Choose a valid port.')
    try:
        launch(args.port)
        url = f'http://127.0.0.1:{args.port}/'
        print('Plotting window ready: '+url)
        if not args.no_browser: webbrowser.open(url, new=2)
    except (OSError, RuntimeError) as exc:
        print('Could not open the plotting window: '+str(exc))
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
