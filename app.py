"""Local stroke notebook. Saved pages are immutable, with a new file per save."""
import argparse
import json
import math
import os
from pathlib import Path
import tempfile
import uuid
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from letters import register_letters

ROOT = Path(__file__).resolve().parent
MAX_PAGE_BYTES = 8 * 1024 * 1024


def validate_content(writer, strokes, smooth):
    if not isinstance(writer, str) or not 1 <= len(writer.strip()) <= 80:
        raise ValueError('Invalid writer name')
    if not isinstance(strokes, list) or not 1 <= len(strokes) <= 1000:
        raise ValueError('Invalid strokes')
    count, last = 0, -1
    for stroke in strokes:
        if not isinstance(stroke, dict) or stroke.get('pointerType') not in ('pen', 'mouse'):
            raise ValueError('Invalid stroke')
        points = stroke.get('points')
        if not isinstance(points, list) or not points:
            raise ValueError('Empty stroke')
        count += len(points)
        if count > 100000:
            raise ValueError('Too many points')
        for point in points:
            if not isinstance(point, dict):
                raise ValueError('Invalid point')
            for key, low, high in [('x', 0, 1000), ('y', 0, 500), ('t', 0, 86400000),
                                   ('pressure', 0, 1), ('tiltX', -90, 90), ('tiltY', -90, 90)]:
                value = point.get(key)
                if value is None and key in ('pressure', 'tiltX', 'tiltY'):
                    continue
                if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high:
                    raise ValueError('Invalid point value')
            if point['t'] < last:
                raise ValueError('Invalid point order')
            last = point['t']
    if type(smooth) is not bool:
        raise ValueError('Invalid smoothing setting')


def create_app(data_dir=None):
    app = Flask(__name__, static_folder='static')
    app.config['MAX_CONTENT_LENGTH'] = MAX_PAGE_BYTES
    folder = Path(data_dir or ROOT / 'data')
    folder.mkdir(parents=True, exist_ok=True)

    def read_page(page_id):
        # IDs, never supplied paths, address files in this notebook's folder.
        path = folder / (str(uuid.UUID(str(page_id))) + '.json')
        if path.is_symlink():
            raise ValueError('Unsupported page file')
        if path.stat().st_size > MAX_PAGE_BYTES:
            raise ValueError('Oversized page file')
        record = json.loads(path.read_text(encoding='utf-8'))
        if not isinstance(record, dict) or record.get('id') != path.stem or record.get('schema_version') != 2:
            raise ValueError('Unsupported page format')
        coordinates = record.get('coordinates', {})
        if not isinstance(coordinates, dict) or (coordinates.get('width'), coordinates.get('height'), coordinates.get('y')) != (1000, 500, 'down'):
            raise ValueError('Unsupported page coordinates')
        if not isinstance(record.get('saved_at'), str) or datetime.fromisoformat(record['saved_at']).tzinfo is None:
            raise ValueError('Invalid save time')
        validate_content(record.get('writer'), record.get('raw_strokes'), record.get('display_smoothing'))
        return record

    @app.after_request
    def fresh_pages(response):
        if request.path.startswith('/api/') or response.mimetype == 'text/html':
            response.headers['Cache-Control'] = 'no-store'
        return response

    @app.get('/')
    def index():
        return app.send_static_file('capture.html')

    @app.get('/notebook')
    def notebook():
        return app.send_static_file('index.html')

    @app.get('/compose')
    def composer():
        return app.send_static_file('compose.html')

    @app.get('/calibration')
    def calibration():
        return app.send_static_file('calibration.html')

    @app.get('/review')
    def review():
        return app.send_static_file('review.html')

    @app.errorhandler(400)
    @app.errorhandler(413)
    @app.errorhandler(415)
    def bad(error):
        return jsonify(error=error.description), error.code

    @app.get('/api/pages')
    def list_pages():
        pages, unavailable = [], 0
        for path in folder.glob('*.json'):
            try:
                record = read_page(path.stem)
                pages.append({key: record[key] for key in ('id', 'writer', 'saved_at')} |
                             {'stroke_count': len(record['raw_strokes'])})
            except (OSError, ValueError, TypeError):
                # Leave damaged or unsupported files untouched; other pages still open.
                unavailable += 1
        pages.sort(key=lambda page: (datetime.fromisoformat(page['saved_at']), page['id']), reverse=True)
        return jsonify(pages=pages, unavailable_count=unavailable)

    @app.get('/api/pages/<uuid:page_id>')
    def get_page(page_id):
        try:
            return jsonify(read_page(page_id))
        except FileNotFoundError:
            return jsonify(error='This saved page is no longer available. Refresh the list.'), 404
        except (OSError, ValueError, TypeError):
            return jsonify(error='This page could not be read. Its saved file has been left untouched.'), 422

    @app.post('/api/pages')
    def save():
        data = request.get_json()
        try:
            if not isinstance(data, dict):
                raise ValueError('Invalid page')
            writer, strokes, smooth = data.get('writer'), data.get('strokes'), data.get('smooth')
            validate_content(writer, strokes, smooth)
        except (ValueError, TypeError):
            return jsonify(error='Enter a writer name and draw a page before saving. Invalid or oversized stroke data cannot be saved.'), 400
        record = {'id': str(uuid.uuid4()), 'writer': writer.strip(), 'saved_at': datetime.now(timezone.utc).isoformat(),
                  'coordinates': {'width': 1000, 'height': 500, 'y': 'down', 'time': 'milliseconds from first contact'},
                  'raw_strokes': strokes, 'display_smoothing': smooth, 'schema_version': 2}
        payload = json.dumps(record, allow_nan=False).encode('utf-8')
        if len(payload) > MAX_PAGE_BYTES:
            return jsonify(error='This page is too large to save. Download its SVG and start a smaller page.'), 413
        fd, tmp = tempfile.mkstemp(dir=folder)
        try:
            with os.fdopen(fd, 'wb') as file:
                file.write(payload)
                file.flush()
                os.fsync(file.fileno())
            os.replace(tmp, folder / (record['id'] + '.json'))
        finally:
            if os.path.exists(tmp):
                os.unlink(tmp)
        return jsonify(id=record['id'], saved_at=record['saved_at']), 201

    register_letters(app, folder, validate_content)
    return app


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    create_app().run(host=args.host, port=args.port, debug=False)
