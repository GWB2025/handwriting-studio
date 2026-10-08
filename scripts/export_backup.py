"""Export existing local data to the browser backup format; originals stay intact."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--data', type=Path, default=Path(__file__).resolve().parents[1]/'data')
parser.add_argument('--output', type=Path, required=True)
args=parser.parse_args()
files=[]
for pattern in ('*.json','letters/*.json','letter_reviews/*.json'):
    for path in sorted(args.data.glob(pattern)):
        if path.is_symlink():
            raise ValueError('Cannot export a symbolic link: '+str(path))
        files.append({'key':path.relative_to(args.data).as_posix(),'value':json.loads(path.read_text())})
backup={'format':'handwriting-studio-backup','version':1,'exported_at':datetime.now(timezone.utc).isoformat(),'files':files}
with args.output.open('x') as file:
    json.dump(backup,file,allow_nan=False)
print(f'Exported {len(files)} records to {args.output}. Import this file through Backup / Import on the website.')
