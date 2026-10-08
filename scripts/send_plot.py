"""Validate a Studio G-code file; --run sends it to the calibrated USB plotter."""
import argparse
import math
import re
import sys
import time
from pathlib import Path


def validate(text):
    commands=[];down=False;units=False;points=[]
    for number,raw in enumerate(text.splitlines(),1):
        line=raw.split(';',1)[0].strip()
        if not line:continue
        if line=='G21':units=True
        elif re.fullmatch(r'G4 P(?:0\.1|1)',line):
            if not units:raise ValueError('Units must be set first')
        else:
            match=re.fullmatch(r'G90 G1 (Z(0\.5|5)|X(-?\d+(?:\.\d+)?) Y(-?\d+(?:\.\d+)?)) F(900|1200|2400|3000)',line)
            if not match or not units:raise ValueError(f'Unsupported command on line {number}')
            if match[2]:down=match[2]=='5'
            else:
                x,y=float(match[3]),float(match[4]);points.append((x,y))
                if not all(map(math.isfinite,(x,y))) or not (0<=x<=210 and -297<=y<=0):raise ValueError(f'Outside A4 on line {number}')
                if match[5] in ('1200','2400') and down:raise ValueError('Travel move with pen down')
        commands.append(line)
    if not commands or commands[:2]!=['G21','G90 G1 Z0.5 F1200']:raise ValueError('Expected millimetres and initial pen lift')
    if down:raise ValueError('File must end with the pen raised')
    if points and points[-1]!=(0,0):raise ValueError('File must return to home')
    if len(commands)>600000:raise ValueError('File too large')
    return commands


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file',type=Path)
    parser.add_argument('--run',action='store_true',help='Send validated commands to the plotter')
    parser.add_argument('--port',default='/dev/cu.usbmodem201912341')
    args=parser.parse_args()
    commands=validate(args.file.read_text())
    print(f'Validated {len(commands)} commands: {args.file.name}',flush=True)
    if not args.run:
        print('No connection opened. Add --run to plot after homing at the paper top left with the pen raised.');return 0
    try:import serial
    except ImportError:
        deps=Path.home()/'Library/Application Support/org.inkscape.Inkscape/config/inkscape/extensions/idraw_deps'
        sys.path.insert(0,str(deps))
        try:import serial
        except ImportError:raise RuntimeError('Install the plotting dependencies from requirements-plotter.txt')
    import fcntl
    lock=open(Path.home()/'.handwriting-studio-plotter.lock','a')
    try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:raise RuntimeError('Another Studio sender is using the plotter')
    s=serial.Serial();s.port=args.port;s.baudrate=115200;s.timeout=.1;s.dtr=False;s.rts=False
    started=False
    try:
        s.open();time.sleep(2.5);s.reset_input_buffer()
        def status():
            s.write(b'?');time.sleep(.15);return s.read(4096).decode(errors='replace')
        initial=status();print('Controller: '+initial.strip(),flush=True)
        position=re.search(r'MPos:([-\d.]+),([-\d.]+),([-\d.]+)',initial)
        offset=re.search(r'WCO:([-\d.]+),([-\d.]+),([-\d.]+)',initial)
        if '<Idle' not in initial or not position or not offset or any(abs(float(v))>.01 for v in position.groups()[:2]+offset.groups()):
            raise RuntimeError('Expected Idle at X0 Y0 with zero work offset. Home the plotter before sending.')
        started=True;last=-1
        for index,cmd in enumerate(commands):
            s.write((cmd+'\r').encode());deadline=time.monotonic()+30
            while time.monotonic()<deadline:
                line=s.readline().decode(errors='replace').strip()
                if line=='ok':break
                if 'error' in line.lower() or 'alarm' in line.lower():raise RuntimeError(line)
            else:raise RuntimeError('No acknowledgement: '+cmd)
            percent=(index+1)*100//len(commands)//10*10
            if percent>last:print(f'{percent}% of commands accepted',flush=True);last=percent
        print('All commands accepted; waiting for movement to finish…',flush=True)
        deadline=time.monotonic()+180
        while time.monotonic()<deadline:
            reply=status()
            if '<Idle' in reply:
                position=re.search(r'MPos:([-\d.]+),([-\d.]+),([-\d.]+)',reply)
                if not position or any(abs(float(v))>.01 for v in position.groups()[:2]) or abs(float(position[3])-.5)>.02:raise RuntimeError('Unexpected final position: '+reply)
                print('Completed: pen up, returned to home. '+reply.strip(),flush=True);return 0
            if 'alarm' in reply.lower():raise RuntimeError(reply)
            time.sleep(.3)
        raise RuntimeError('Completion timeout')
    except (Exception,KeyboardInterrupt):
        if started and s.is_open:
            try:s.write(b'!');print('Feed hold requested. Job is incomplete; check the plotter before restarting.',flush=True)
            except Exception:print('Connection lost; stop the plotter locally.',flush=True)
        raise
    finally:
        if s.is_open:s.close()
        lock.close()

if __name__=='__main__':
    try:sys.exit(main())
    except KeyboardInterrupt:sys.exit(130)
    except Exception as error:print(str(error),file=sys.stderr);sys.exit(1)
