"""Validate a Studio file or send it with the same checked recovery as the Mac window."""
import argparse
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from plotting import Plotter, parse_job


def validate(text):
    return parse_job(text)['commands']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path)
    parser.add_argument('--run', action='store_true', help='Plot after preparing and homing the machine')
    parser.add_argument('--port', default='/dev/cu.usbmodem201912341')
    args = parser.parse_args()
    text = args.file.read_text()
    job = parse_job(text, args.file.name)
    print(f"Validated {len(job['commands'])} commands; movement at least {job['seconds']/60:.1f} minutes.", flush=True)
    if not args.run:
        print('No connection opened. Add --run only with paper present and the plotter homed, pen raised.')
        return 0
    manager = Plotter(Path(__file__).resolve().parents[1]/'logs')
    manager.load(text, args.file.name)
    try:
        manager.launch('connecting', manager.connect, args.port)
        manager.thread.join()
        if not manager.snapshot()['connected']: raise ValueError(manager.snapshot()['message'])
        manager.launch('plotting', manager.start, manager.job['id'], True, True)
        last = None
        while manager.thread.is_alive():
            state = manager.snapshot()
            progress = (state['phase'], state['accepted']*100//state['total']//5*5, state['message'])
            if progress != last:
                print(f'{progress[1]}% commands sent · {state["message"]}', flush=True)
                last = progress
            time.sleep(.3)
        state = manager.snapshot()
        print(state['message'], flush=True)
        return 0 if state['phase'] == 'completed' else 1
    except KeyboardInterrupt:
        manager.cancel.set()
        if manager.thread: manager.thread.join(timeout=45)
        print('Cancellation requested. Check the plotter locally if it is still moving.', flush=True)
        return 130
    finally:
        if not manager.thread or not manager.thread.is_alive(): manager.close()


if __name__ == '__main__':
    try: sys.exit(main())
    except (ValueError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
