"""Lowercase capture, reversible sample review and centre-line composition."""
import copy
import hashlib
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import tempfile
from threading import Lock
import uuid
import xml.etree.ElementTree as ET

from flask import jsonify, request

ORDERS = ('acebd', 'ebdac', 'daceb')
ALPHABET = 'abcdefghijklmnopqrstuvwxyz'
PLAN_ID = 'lowercase-v2'
GROUPS = ('acebd', 'fhjgi', 'kmln', 'oqpr', 'sutv', 'wyxz')
LOWERCASE_ORDERS = tuple(group[shift:] + group[:shift]
                         for repeat in range(3) for group in GROUPS
                         for shift in [(repeat * 2 if len(group) == 5 else repeat) % len(group)])
GUIDES = {'ascender': 170, 'x_height': 250, 'baseline': 330, 'descender': 410}
DESCENDERS = 'fgjpqy'
TALL_LETTERS = 'bdfhklt'
LIMIT = 8 * 1024 * 1024


def extract_samples(strokes, order, version=1):
    """Assign whole strokes to cells; never split or drop a crossing stroke."""
    groups = [[] for _ in order]
    for index, stroke in enumerate(strokes):
        cells = {min(len(order) - 1, int(point['x'] / (1000 / len(order)))) for point in stroke['points']}
        if len(cells) != 1:
            raise ValueError('A stroke crosses between letter boxes. Undo it or clear the sheet, then keep each letter inside its own box.')
        groups[cells.pop()].append(index)
    missing = [order[i] for i, indices in enumerate(groups) if not indices]
    if missing:
        raise ValueError('Write one letter in each box. Still needed: ' + ', '.join(missing) + '.')
    samples = []
    for letter, indices in zip(order, groups):
        points = [p for i in indices for p in strokes[i]['points']]
        left, right = min(p['x'] for p in points), max(p['x'] for p in points)
        top, bottom = min(p['y'] for p in points), max(p['y'] for p in points)
        if right - left < 2 or bottom - top < 2:
            raise ValueError(f'The {letter} box contains only a very small mark. Please draw the whole letter.')
        processed = copy.deepcopy([strokes[i] for i in indices])
        baseline = GUIDES['baseline'] if version == 2 and letter in DESCENDERS else bottom
        for stroke in processed:
            for point in stroke['points']:
                point['x'] -= left
                point['y'] -= baseline
        samples.append({'letter': letter, 'raw_stroke_indices': indices,
                        'bounds': {'left': left, 'top': top, 'right': right, 'bottom': bottom},
                        'processed_strokes': processed})
    return samples


def path_data(points, smooth, x, baseline, scale):
    def xy(point):
        return x + point['x'] * scale, baseline + point['y'] * scale
    def command(op, values):
        return op + ' '.join(f'{value:.4f}' for value in values)
    result = [command('M', xy(points[0]))]
    if len(points) == 1:
        result.append(command('L', xy(points[0])))
    elif not smooth or len(points) < 3:
        result.extend(command('L', xy(point)) for point in points[1:])
    else:
        for a, b in zip(points[1:-1], points[2:]):
            ax, ay = xy(a)
            bx, by = xy(b)
            result.append(command('Q', (ax, ay, (ax + bx) / 2, (ay + by) / 2)))
        result.append(command('L', xy(points[-1])))
    return ' '.join(result)


def compose(samples, phrase, height, smooth):
    # Preserve letter proportions and reserve space both above and below baseline.
    scale = height / 80
    used, occurrences = [], {}
    for char in phrase:
        if char in ALPHABET:
            variants = samples[char]
            occurrence = occurrences.get(char, 0)
            used.append(variants[occurrence % len(variants)])
            occurrences[char] = occurrence + 1
        else:
            used.append(None)
    extents = [(p['y'] * scale + s.get('baseline_shift_mm', 0)) for s in used if s
               for stroke in s['processed_strokes'] for p in stroke['points']]
    above, below = max(0, -min(extents)), max(0, max(extents))
    baseline, x = 20 + above, 20
    gap, space, line = height * .22, height * .7, above + below + height * .8
    svg = ET.Element('svg', {'xmlns': 'http://www.w3.org/2000/svg', 'width': '210mm',
                            'height': '297mm', 'viewBox': '0 0 210 297'})
    ET.SubElement(svg, 'title').text = 'Handwriting: ' + phrase
    group = ET.SubElement(svg, 'g', {'fill': 'none', 'stroke': 'black', 'stroke-width': '0.3',
                                    'stroke-linecap': 'round', 'stroke-linejoin': 'round'})
    chosen = []
    for char, sample in zip(phrase, used):
        if char == '\n':
            x, baseline = 20, baseline + line
            continue
        if char == ' ':
            x += space
            continue
        width = (sample['bounds']['right'] - sample['bounds']['left']) * scale
        if width > 170:
            raise ValueError('A letter is too wide for the page. Choose a smaller writing size.')
        if x + width > 190:
            x, baseline = 20, baseline + line
        if baseline + below > 277:
            raise ValueError('This phrase does not fit on one A4 page. Use fewer words or a smaller writing size.')
        for stroke in sample['processed_strokes']:
            ET.SubElement(group, 'path', {'d': path_data(stroke['points'], smooth, x, baseline + sample.get('baseline_shift_mm', 0), scale)})
        chosen.append({'letter': char, 'capture_id': sample['capture_id']})
        x += width + gap
    return ET.tostring(svg, encoding='unicode'), chosen


def review_svg(sample):
    """Review at the medium 5 mm scale, including the baseline and any tail."""
    points = [p for s in sample['processed_strokes'] for p in s['points']]
    shift = sample.get('baseline_shift_mm', 0) * 16
    top = min(-180, min(p['y'] for p in points) + shift - 25)
    bottom = max(110, max(p['y'] for p in points) + shift + 25)
    width = max(240, max(p['x'] for p in points) + 60)
    svg = ET.Element('svg', {'xmlns': 'http://www.w3.org/2000/svg', 'viewBox': f'-30 {top} {width} {bottom-top}'})
    for y, label in ((-80, 'small-letter height'), (0, 'baseline'), (80, 'tail guide')):
        ET.SubElement(svg, 'line', {'x1': '-20', 'x2': str(width-40), 'y1': str(y), 'y2': str(y),
                                  'stroke': '#93ad9b' if y == 0 else '#d1dcd1', 'stroke-width': '1',
                                  'stroke-dasharray': 'none' if y == 0 else '4 4'})
        ET.SubElement(svg, 'text', {'x': '-18', 'y': str(y-5), 'fill': '#52675f', 'font-size': '9',
                                  'font-family': 'sans-serif'}).text = label
    for stroke in sample['processed_strokes']:
        ET.SubElement(svg, 'path', {'d': path_data(stroke['points'], True, 0, shift, 1), 'fill': 'none',
                                  'stroke': '#203832', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round'})
    return ET.tostring(svg, encoding='unicode')


def atomic_json(path, content):
    payload = json.dumps(content, allow_nan=False).encode('utf-8')
    fd, temporary = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, 'wb') as file:
            file.write(payload); file.flush(); os.fsync(file.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def register_letters(app, data_folder, validate_content):
    folder = Path(data_folder) / 'letters'
    folder.mkdir(parents=True, exist_ok=True)
    review_folder = Path(data_folder) / 'letter_reviews'
    review_folder.mkdir(parents=True, exist_ok=True)
    lock = Lock()

    def read_record(path):
        if path.is_symlink() or path.stat().st_size > LIMIT:
            raise ValueError('Unsupported capture file')
        record = json.loads(path.read_text(encoding='utf-8'))
        version = record.get('schema_version')
        if type(version) is not int or version not in (1, 2) or record.get('id') != path.stem:
            raise ValueError('Unsupported capture format')
        uuid.UUID(record['id'])
        if datetime.fromisoformat(record['saved_at']).tzinfo is None:
            raise ValueError('Missing timezone')
        index = record['order_index']
        orders = ORDERS if version == 1 else LOWERCASE_ORDERS
        if version == 2 and record.get('plan_id') != PLAN_ID:
            raise ValueError('Unsupported capture plan')
        if type(index) is not int or index not in range(len(orders)) or record['order'] != orders[index]:
            raise ValueError('Unsupported letter order')
        validate_content(record['writer'], record['raw_strokes'], record['display_smoothing'])
        if record['samples'] != extract_samples(record['raw_strokes'], record['order'], version):
            raise ValueError('Unsupported processed data')
        return record

    def records():
        result, unavailable = [], 0
        for path in folder.glob('*.json'):
            try:
                result.append(read_record(path))
            except (OSError, ValueError, TypeError, KeyError, AttributeError):
                unavailable += 1
        # Compose from the newest captures, including records with an explicit
        # timezone offset rather than assuming ISO strings sort chronologically.
        result.sort(key=lambda record: (datetime.fromisoformat(record['saved_at']), record['id']), reverse=True)
        return result, unavailable

    def read_reviews(capture_id):
        path = review_folder / (capture_id + '.json')
        if not path.exists() and not path.is_symlink():
            return {}
        if path.is_symlink() or path.stat().st_size > 65536:
            raise ValueError('Unsupported review file')
        record = json.loads(path.read_text(encoding='utf-8'))
        if record.get('schema_version') != 1 or record.get('capture_id') != capture_id:
            raise ValueError('Unsupported review format')
        reviews = record['reviews']
        if not isinstance(reviews, dict):
            raise ValueError('Invalid reviews')
        for letter, review in reviews.items():
            if len(letter) != 1 or letter not in ALPHABET or not isinstance(review, dict):
                raise ValueError('Invalid sample review')
            validate_review(review)
        return reviews

    def validate_review(review):
        shift = review.get('baseline_shift_mm')
        if type(review.get('included')) is not bool or type(shift) not in (int, float) or not math.isfinite(shift) or not -10 <= shift <= 10:
            raise ValueError('Choose whether to use this sample and a baseline shift between −10 and 10 mm.')

    def catalog():
        captures, unavailable = records()
        profiles, all_samples, states, next_found = {}, {}, {}, set()
        for record in captures:
            try:
                reviews = read_reviews(record['id'])
            except (OSError, ValueError, TypeError, KeyError, AttributeError):
                unavailable += 1
                continue  # Never silently re-enable samples with unreadable reviews.
            writer = record['writer']
            profile = profiles.setdefault(writer, {'writer': writer, 'counts': {}, 'total_counts': {},
                                                   'latest_saved_at': record['saved_at'], 'next_order_index': 0})
            if record['schema_version'] == 2 and writer not in next_found:
                profile['next_order_index'] = (record['order_index'] + 1) % len(LOWERCASE_ORDERS)
                next_found.add(writer)
            states.setdefault(writer, []).append([record['id'], record['saved_at'], reviews])
            for sample in record['samples']:
                letter = sample['letter']
                review = reviews.get(letter, {'included': True, 'baseline_shift_mm': 0})
                profile['total_counts'][letter] = profile['total_counts'].get(letter, 0) + 1
                profile['counts'][letter] = profile['counts'].get(letter, 0) + int(review['included'])
                all_samples.setdefault(writer, []).append(sample | review | {'capture_id': record['id'], 'saved_at': record['saved_at']})
        for writer, profile in profiles.items():
            profile['counts'] = dict(sorted(profile['counts'].items()))
            profile['total_counts'] = dict(sorted(profile['total_counts'].items()))
            profile['revision'] = hashlib.sha256(json.dumps(states[writer], sort_keys=True).encode()).hexdigest()
        return profiles, all_samples, unavailable

    @app.get('/api/letters/plan.js')
    def plan_script():
        plan = {'id': PLAN_ID, 'alphabet': ALPHABET, 'orders': LOWERCASE_ORDERS, 'sheets_per_set': len(GROUPS),
                'guides': GUIDES, 'descenders': DESCENDERS, 'tall_letters': TALL_LETTERS}
        return app.response_class('window.capturePlan = ' + json.dumps(plan) + ';', mimetype='application/javascript')

    @app.get('/api/letters/writers')
    def writers():
        profiles, _, unavailable = catalog()
        return jsonify(writers=sorted(profiles.values(), key=lambda profile: profile['writer'].casefold()),
                       unavailable_count=unavailable)

    @app.post('/api/letters/pages')
    def save_letters():
        data = request.get_json()
        try:
            if not isinstance(data, dict):
                raise ValueError('Invalid capture')
            writer, strokes, smooth = data.get('writer'), data.get('strokes'), data.get('smooth')
            validate_content(writer, strokes, smooth)
            index = data.get('order_index')
            plan_id = data.get('plan_id')
            if plan_id not in (None, PLAN_ID):
                raise ValueError('Unknown capture plan. Keep your draft and reload the app.')
            version = 1 if plan_id is None else 2
            orders = ORDERS if version == 1 else LOWERCASE_ORDERS
            if type(index) is not int or index not in range(len(orders)):
                raise ValueError('Invalid letter order. Reload the app after keeping any unsaved writing.')
            capture_id = str(uuid.UUID(data.get('request_id', '')))
            samples = extract_samples(strokes, orders[index], version)
        except (ValueError, TypeError, AttributeError) as error:
            return jsonify(error=str(error)), 400
        record = {'schema_version': version, 'id': capture_id, 'writer': writer.strip(),
                  'saved_at': datetime.now(timezone.utc).isoformat(), 'order_index': index,
                  'order': orders[index], 'display_smoothing': smooth,
                  'coordinates': {'width': 1000, 'height': 500, 'y': 'down',
                                  'time': 'milliseconds from first contact'},
                  'guides': GUIDES if version == 2 else {k: v for k, v in GUIDES.items() if k != 'descender'},
                  'processing': {'version': version, 'method': 'translate left edge to x=0; baseline from capture guide for f/g/j/p/q/y, bottom otherwise; no resizing' if version == 2 else 'translate left edge to x=0, bottom to y=0; no resizing'},
                  'raw_strokes': strokes, 'samples': samples}
        if version == 2:
            record['plan_id'] = PLAN_ID
        payload = json.dumps(record, allow_nan=False).encode('utf-8')
        if len(payload) > LIMIT:
            return jsonify(error='This sheet is too large to save. Download its SVG and try a simpler sheet.'), 413
        with lock:
            path = folder / (capture_id + '.json')
            # A retry after a lost response returns the same save, not duplicates.
            if path.exists():
                try:
                    existing = read_record(path)
                    if all(existing[k] == record[k] for k in ('schema_version', 'writer', 'raw_strokes', 'order_index', 'display_smoothing')):
                        return jsonify(id=existing['id'], saved_at=existing['saved_at']), 200
                except (OSError, ValueError, TypeError, KeyError, AttributeError):
                    pass
                return jsonify(error='This save identifier is already in use. Your existing capture was kept.'), 409
            atomic_json(path, record)
        return jsonify(id=record['id'], saved_at=record['saved_at']), 201

    @app.get('/api/letters/samples')
    def list_samples():
        writer, letter = request.args.get('writer', ''), request.args.get('letter', '')
        if len(letter) != 1 or letter not in ALPHABET:
            return jsonify(error='Choose a lowercase letter.'), 400
        _, by_writer, unavailable = catalog()
        selected = [sample for sample in by_writer.get(writer, []) if sample['letter'] == letter]
        return jsonify(samples=[{key: sample[key] for key in ('capture_id', 'letter', 'saved_at', 'included', 'baseline_shift_mm')} |
                                {'svg': review_svg(sample), 'stroke_count': len(sample['processed_strokes'])} for sample in selected],
                       unavailable_count=unavailable)

    @app.post('/api/letters/samples/<uuid:capture_id>/<letter>/review')
    def save_review(capture_id, letter):
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify(error='Invalid review.'), 400
        try:
            validate_review(data)
        except ValueError as error:
            return jsonify(error=str(error)), 400
        with lock:
            try:
                capture = read_record(folder / (str(capture_id) + '.json'))
                sample = next((s for s in capture['samples'] if s['letter'] == letter), None)
                if sample is None:
                    return jsonify(error='This letter is not on the selected sheet.'), 404
                reviews = read_reviews(str(capture_id))
                review = {'included': data['included'], 'baseline_shift_mm': data['baseline_shift_mm'],
                          'reviewed_at': datetime.now(timezone.utc).isoformat()}
                reviews[letter] = review
                atomic_json(review_folder / (str(capture_id) + '.json'),
                            {'schema_version': 1, 'capture_id': str(capture_id), 'reviews': reviews})
            except FileNotFoundError:
                return jsonify(error='This capture is no longer available.'), 404
            except (OSError, ValueError, TypeError, KeyError, AttributeError):
                return jsonify(error='The review could not be saved. Existing capture and review files have been kept.'), 422
        return jsonify(saved=True, **review, svg=review_svg(sample | review))

    @app.post('/api/compose')
    def compose_letters():
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify(error='Invalid phrase'), 400
        writer, phrase = data.get('writer'), data.get('phrase')
        height, smooth = data.get('height', 5), data.get('smooth', True)
        sample_mode = data.get('samples', 'latest_three')
        if sample_mode not in ('latest_three', 'latest_only', 'all'):
            return jsonify(error='Choose which saved samples to use.'), 400
        if not isinstance(writer, str) or not 1 <= len(writer.strip()) <= 80:
            return jsonify(error='Choose a writer.'), 400
        if not isinstance(phrase, str) or not 1 <= len(phrase) <= 200 or not any(c in ALPHABET for c in phrase):
            return jsonify(error='Type a short lowercase phrase (up to 200 characters).'), 400
        if any(char not in ALPHABET + ' \n' for char in phrase):
            return jsonify(error='Use lowercase a–z, spaces and line breaks. Capitals and punctuation come later.'), 400
        if type(height) not in (int, float) or not math.isfinite(height) or not 2 <= height <= 12 or type(smooth) is not bool:
            return jsonify(error='Choose a writing size from 2 to 12 mm.'), 400
        profiles, by_writer, unavailable = catalog()
        samples = {}
        for sample in by_writer.get(writer.strip(), []):
            variants = samples.setdefault(sample['letter'], [])
            if sample['included']:
                variants.append(sample)
        available_counts = {letter: len(variants) for letter, variants in samples.items()}
        limit = {'latest_three': 3, 'latest_only': 1, 'all': None}[sample_mode]
        samples = {letter: variants[:limit] for letter, variants in samples.items()}
        missing = sorted({c for c in phrase if c in ALPHABET and not samples.get(c)})
        if missing:
            return jsonify(error='No included samples for: ' + ', '.join(missing) + '. Capture them or include a saved example in Review samples.'), 400
        try:
            svg, chosen = compose(samples, phrase, height, smooth)
        except ValueError as error:
            return jsonify(error=str(error)), 400
        dates = {sample['capture_id']: sample['saved_at'] for variants in samples.values() for sample in variants}
        used_dates = [dates[item['capture_id']] for item in chosen]
        return jsonify(svg=svg, used_samples=chosen, unavailable_count=unavailable,
                       sample_selection={'mode': sample_mode, 'available_counts': available_counts,
                                         'writer_revision': profiles[writer.strip()]['revision'],
                                         'latest_saved_at': profiles[writer.strip()]['latest_saved_at'],
                                         'counts': {letter: len(variants) for letter, variants in samples.items()},
                                         'newest_saved_at': max(used_dates, key=datetime.fromisoformat),
                                         'oldest_saved_at': min(used_dates, key=datetime.fromisoformat)})
