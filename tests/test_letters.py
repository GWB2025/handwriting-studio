import copy
import json
from pathlib import Path
import re
import tempfile
import unittest
import uuid
import xml.etree.ElementTree as ET

from app import create_app
from letters import ORDERS, LOWERCASE_ORDERS, ALPHABET, PLAN_ID, DESCENDERS


def sheet(index=0, variant=0, writer='Test writer'):
    strokes = []
    for cell, letter in enumerate(ORDERS[index]):
        x = cell * 200 + 70
        height = 120 if letter in 'bd' else 60
        # Vary vertical placement too: processing should align all bottoms.
        bottom = 320 + variant * 5
        points = [dict(x=px, y=py, t=len(strokes) * 100 + t, pressure=.4, tiltX=10, tiltY=-4)
                  for t, (px, py) in enumerate([(x, bottom), (x + 10, bottom - height), (x + 45 + variant, bottom)])]
        strokes.append({'pointerType': 'pen', 'points': points})
    return {'writer': writer, 'strokes': strokes, 'smooth': True, 'order_index': index, 'request_id': str(uuid.uuid4())}


class LetterCapture(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.folder = Path(self.temporary.name)
        self.client = create_app(self.folder).test_client()

    def test_three_sheets_raw_preservation_baseline_alignment_and_retry(self):
        ids = []
        for index in range(3):
            payload = sheet(index, index)
            original = copy.deepcopy(payload)
            result = self.client.post('/api/letters/pages', json=payload)
            self.assertEqual(result.status_code, 201, result.json)
            capture_id = result.json['id']; ids.append(capture_id)
            path = self.folder / 'letters' / (capture_id + '.json')
            original_bytes = path.read_bytes()
            record = json.loads(original_bytes)
            self.assertEqual(record['raw_strokes'], original['strokes'])
            self.assertEqual(record['order'], ORDERS[index])
            for sample in record['samples']:
                raw = record['raw_strokes'][sample['raw_stroke_indices'][0]]['points']
                processed = sample['processed_strokes'][0]['points']
                self.assertEqual(max(p['y'] for p in processed), 0)
                self.assertEqual(min(p['x'] for p in processed), 0)
                for before, after in zip(raw, processed):
                    for key in ('t', 'pressure', 'tiltX', 'tiltY'):
                        self.assertEqual(before[key], after[key])
            self.assertEqual(self.client.post('/api/letters/pages', json=payload).status_code, 200)
            self.assertEqual(path.read_bytes(), original_bytes)
            payload['writer'] = 'Changed'
            self.assertEqual(self.client.post('/api/letters/pages', json=payload).status_code, 409)
            self.assertEqual(path.read_bytes(), original_bytes)
        profiles = self.client.get('/api/letters/writers')
        self.assertEqual(profiles.headers['Cache-Control'], 'no-store')
        self.assertEqual(len(profiles.json['writers']), 1)
        self.assertEqual(profiles.json['writers'][0]['writer'], 'Test writer')
        self.assertEqual(profiles.json['writers'][0]['counts'], dict.fromkeys('abcde', 3))
        self.assertEqual(profiles.json['writers'][0]['latest_saved_at'], record['saved_at'])
        composed = self.client.post('/api/compose', json={'writer': 'Test writer', 'phrase': 'aaaa bcd e', 'smooth': False, 'height': 5})
        self.assertEqual(composed.status_code, 200, composed.json)
        self.assertEqual([item['capture_id'] for item in composed.json['used_samples'][:4]], ids[::-1] + ids[-1:])
        root = ET.fromstring(composed.json['svg'])
        self.assertEqual((root.get('width'), root.get('height')), ('210mm', '297mm'))
        paths = root.findall('.//{http://www.w3.org/2000/svg}path')
        self.assertEqual(len(paths), 8)
        # All glyphs share a baseline, despite being written at different y positions.
        self.assertEqual(len({path.get('d').split()[-1] for path in paths}), 1)
        for path in paths:
            coordinates = [float(n) for n in re.findall(r'[-+]?\d*\.?\d+', path.get('d'))]
            self.assertTrue(all(20 <= x <= 190 for x in coordinates[::2]))
            self.assertTrue(all(20 <= y <= 277 for y in coordinates[1::2]))
        self.assertEqual(len(list((self.folder / 'letters').glob('*.json'))), 3)
        # Guided captures don't pollute the independent free-writing library.
        self.assertEqual(self.client.get('/api/pages').json['pages'], [])

    def test_invalid_or_incomplete_sheet_never_saves_partially(self):
        for mutate in [lambda p: p['strokes'].pop(),
                       lambda p: p['strokes'][0]['points'][-1].update(x=201),
                       lambda p: p['strokes'][0]['points'][0].update(x=float('nan')),
                       lambda p: p.update(order_index=True),
                       lambda p: p.update(request_id='../bad'),
                       lambda p: p.update(writer='')]:
            payload = sheet(); mutate(payload)
            self.assertEqual(self.client.post('/api/letters/pages', json=payload).status_code, 400)
        self.assertEqual(list((self.folder / 'letters').iterdir()), [])

    def test_new_captures_replace_old_preview_variants_without_changing_files(self):
        ids = []
        for variant in range(3):
            result = self.client.post('/api/letters/pages', json=sheet(variant, variant))
            ids.append(result.json['id'])
        phrase = {'writer': 'Test writer', 'phrase': 'aaaaa bcde'}
        old_svg = self.client.post('/api/compose', json=phrase).json['svg']
        for variant in range(3, 6):
            result = self.client.post('/api/letters/pages', json=sheet(variant % 3, variant))
            ids.append(result.json['id'])
        self.client.post('/api/letters/pages', json=sheet(writer='Different writer'))
        files = {path: path.read_bytes() for path in (self.folder / 'letters').glob('*.json')}
        result = self.client.post('/api/compose', json=phrase).json
        self.assertNotEqual(result['svg'], old_svg)
        self.assertEqual([s['capture_id'] for s in result['used_samples'][:5]],
                         [ids[5], ids[4], ids[3], ids[5], ids[4]])
        self.assertTrue(all(s['capture_id'] in ids[3:] for s in result['used_samples']))
        self.assertEqual(result['sample_selection']['counts'], dict.fromkeys('abcde', 3))
        self.assertEqual(result['sample_selection']['available_counts'], dict.fromkeys('abcde', 6))
        self.assertEqual(result['sample_selection']['newest_saved_at'],
                         json.loads(files[self.folder / 'letters' / (ids[-1] + '.json')])['saved_at'])
        latest = self.client.post('/api/compose', json=phrase | {'samples': 'latest_only'}).json
        self.assertTrue(all(s['capture_id'] == ids[-1] for s in latest['used_samples']))
        self.assertEqual(latest['sample_selection']['counts'], dict.fromkeys('abcde', 1))
        all_samples = self.client.post('/api/compose', json=phrase | {'phrase': 'aaaaaaa', 'samples': 'all'}).json
        self.assertEqual([s['capture_id'] for s in all_samples['used_samples']], ids[::-1] + ids[-1:])
        self.assertEqual({path: path.read_bytes() for path in files}, files)

    def test_partial_new_capture_is_used_immediately_and_timestamp_offsets_sort_correctly(self):
        ids = []
        for index, date in enumerate(('2026-10-04T21:00:00+02:00', '2026-10-04T20:00:00+00:00')):
            capture = self.client.post('/api/letters/pages', json=sheet(index, index)).json
            ids.append(capture['id'])
            path = self.folder / 'letters' / (capture['id'] + '.json')
            record = json.loads(path.read_text()); record['saved_at'] = date
            path.write_text(json.dumps(record))
        result = self.client.post('/api/compose', json={'writer': 'Test writer', 'phrase': 'aaa'}).json
        self.assertEqual([s['capture_id'] for s in result['used_samples']], [ids[1], ids[0], ids[1]])
        self.assertEqual(result['sample_selection']['counts']['a'], 2)
        self.assertEqual(result['sample_selection']['newest_saved_at'], '2026-10-04T20:00:00+00:00')
        self.assertEqual(result['sample_selection']['oldest_saved_at'], '2026-10-04T21:00:00+02:00')
        for mode in ('invalid', [], None):
            self.assertEqual(self.client.post('/api/compose', json={'writer': 'Test writer', 'phrase': 'abc', 'samples': mode}).status_code, 400)

    def test_writer_isolation_and_composition_validation(self):
        self.client.post('/api/letters/pages', json=sheet())
        for phrase in ['ABC', 'hello', '<script>', '', '   ', 'a' * 201]:
            result = self.client.post('/api/compose', json={'writer': 'Test writer', 'phrase': phrase})
            self.assertEqual(result.status_code, 400, phrase)
        self.assertEqual(self.client.post('/api/compose', json={'writer': 'Someone else', 'phrase': 'abc'}).status_code, 400)
        for height in (0, 13, True, float('inf')):
            self.assertEqual(self.client.post('/api/compose', json={'writer': 'Test writer', 'phrase': 'abc', 'height': height}).status_code, 400)
        overflow = self.client.post('/api/compose', json={'writer': 'Test writer', 'phrase': '\n' * 100 + 'a'})
        self.assertEqual(overflow.status_code, 400)
        self.assertIn('does not fit', overflow.json['error'])

    def test_damaged_captures_remain_untouched_and_other_samples_work(self):
        self.client.post('/api/letters/pages', json=sheet())
        path = self.folder / 'letters' / (str(uuid.uuid4()) + '.json')
        path.write_text('{broken')
        result = self.client.get('/api/letters/writers').json
        self.assertEqual(result['unavailable_count'], 1)
        self.assertEqual(result['writers'][0]['counts']['a'], 1)
        self.assertEqual(path.read_text(), '{broken')
        self.assertEqual(self.client.post('/api/compose', json={'writer': 'Test writer', 'phrase': 'a bad cab'}).status_code, 200)

    def test_pages_load_without_cached_old_ui(self):
        for path in ('/', '/notebook', '/compose', '/review', '/api/letters/plan.js'):
            with self.client.get(path) as result:
                self.assertEqual(result.status_code, 200)
                self.assertEqual(result.headers['Cache-Control'], 'no-store')

    def test_full_alphabet_three_sets_multistroke_and_descenders(self):
        for start in (0, 6, 12):
            self.assertEqual(sorted(''.join(LOWERCASE_ORDERS[start:start+6])), list(ALPHABET))
        for letter in ALPHABET:
            positions = [order.index(letter) for order in LOWERCASE_ORDERS if letter in order]
            self.assertEqual(len(set(positions)), 3, letter)
        for index in range(18):
            payload = alphabet_sheet(index)
            response = self.client.post('/api/letters/pages', json=payload)
            self.assertEqual(response.status_code, 201, response.json)
            path = self.folder/'letters'/(response.json['id']+'.json')
            original = path.read_bytes(); record = json.loads(original)
            self.assertEqual(record['raw_strokes'], payload['strokes'])
            self.assertEqual(self.client.post('/api/letters/pages', json=payload).status_code, 200)
            self.assertEqual(path.read_bytes(), original)
            for sample in record['samples']:
                points = [p for s in sample['processed_strokes'] for p in s['points']]
                self.assertEqual(max(p['y'] for p in points), 60 if sample['letter'] in DESCENDERS else 0)
            self.assertEqual(self.client.get('/api/letters/writers').json['writers'][0]['next_order_index'], (index+1)%18)
        profile = self.client.get('/api/letters/writers').json['writers'][0]
        self.assertEqual(profile['counts'], dict.fromkeys(ALPHABET, 3))
        result = self.client.post('/api/compose', json={'writer':'Alphabet writer','phrase':'the quick brown fox jumps over the lazy dog\n'+ALPHABET, 'smooth':False})
        self.assertEqual(result.status_code, 200, result.json)
        paths = ET.fromstring(result.json['svg']).findall('.//{http://www.w3.org/2000/svg}path')
        for path in paths:
            coords = [float(v) for v in re.findall(r'[-+]?\d*\.?\d+', path.get('d'))]
            self.assertTrue(all(20 <= x <= 190 for x in coords[::2]))
            self.assertTrue(all(20 <= y <= 277 for y in coords[1::2]))
        self.assertEqual(self.client.post('/api/compose', json={'writer':'Alphabet writer','phrase':('gjpqy\n'*30), 'height':12}).status_code, 400)

    def test_review_exclude_restore_shift_and_immutable_captures(self):
        old = self.client.post('/api/letters/pages', json=alphabet_sheet(1)).json['id']
        new = self.client.post('/api/letters/pages', json=alphabet_sheet(7)).json['id']
        files = {p:p.read_bytes() for p in (self.folder/'letters').glob('*.json')}
        query = {'writer':'Alphabet writer','phrase':'ggg','samples':'latest_only','smooth':False}
        original = self.client.post('/api/compose', json=query).json
        endpoint = f'/api/letters/samples/{new}/g/review'
        response = self.client.post(endpoint, json={'included':False,'baseline_shift_mm':0})
        self.assertEqual(response.status_code, 200, response.json)
        excluded = self.client.post('/api/compose', json=query).json
        self.assertTrue(all(s['capture_id'] == old for s in excluded['used_samples']))
        self.assertNotEqual(excluded['sample_selection']['writer_revision'], original['sample_selection']['writer_revision'])
        self.assertEqual(self.client.post(endpoint, json={'included':True,'baseline_shift_mm':2}).status_code, 200)
        shifted = self.client.post('/api/compose', json=query).json
        self.assertTrue(all(s['capture_id'] == new for s in shifted['used_samples']))
        listing = self.client.get('/api/letters/samples?writer=Alphabet%20writer&letter=g').json['samples']
        self.assertEqual(listing[0]['baseline_shift_mm'], 2)
        self.assertIn('baseline', listing[0]['svg'])
        # An untouched neighbour makes a baseline shift observable in composition.
        shifted_pair = self.client.post('/api/compose', json=query | {'phrase':'hg'}).json['svg']
        self.client.post(endpoint, json={'included':True,'baseline_shift_mm':0})
        self.assertNotEqual(shifted_pair, self.client.post('/api/compose', json=query | {'phrase':'hg'}).json['svg'])
        for capture_id in (old,new):
            self.client.post(f'/api/letters/samples/{capture_id}/g/review', json={'included':False,'baseline_shift_mm':0})
        missing = self.client.post('/api/compose', json=query)
        self.assertEqual(missing.status_code, 400)
        self.assertIn('No included samples for: g', missing.json['error'])
        self.assertEqual({p:p.read_bytes() for p in files}, files)
        # Reopening the application preserves the exclusion.
        self.assertEqual(create_app(self.folder).test_client().post('/api/compose', json=query).status_code, 400)

    def test_invalid_reviews_and_corrupt_review_are_not_silently_applied(self):
        capture = self.client.post('/api/letters/pages', json=sheet()).json['id']
        endpoint = f'/api/letters/samples/{capture}/a/review'
        for body in ({'included':'false','baseline_shift_mm':0}, {'included':True,'baseline_shift_mm':float('nan')},
                     {'included':True,'baseline_shift_mm':11}, {'included':True,'baseline_shift_mm':True}):
            self.assertEqual(self.client.post(endpoint, json=body).status_code,400)
        self.assertEqual(self.client.post(f'/api/letters/samples/{capture}/z/review', json={'included':False,'baseline_shift_mm':0}).status_code,404)
        review_path=self.folder/'letter_reviews'/(capture+'.json')
        review_path.write_text('{broken')
        response=self.client.post(endpoint, json={'included':True,'baseline_shift_mm':0})
        self.assertEqual(response.status_code,422)
        self.assertEqual(review_path.read_text(),'{broken')
        self.assertEqual(self.client.get('/api/letters/writers').json['unavailable_count'],1)
        self.assertEqual(self.client.post('/api/compose',json={'writer':'Test writer','phrase':'a'}).status_code,400)


def alphabet_sheet(index, writer='Alphabet writer'):
    order = LOWERCASE_ORDERS[index]
    strokes=[]
    for cell,letter in enumerate(order):
        x=cell*1000/len(order)+50
        top=190 if letter in 'bdfhklt' else 270
        bottom=390 if letter in DESCENDERS else 320
        points=[dict(x=px,y=py,t=len(strokes)*100+i,pressure=.5,tiltX=12,tiltY=-3)
                for i,(px,py) in enumerate(((x,330),(x+10,top),(x+45,bottom)))]
        strokes.append({'pointerType':'pen','points':points})
        if letter in 'ij':
            strokes.append({'pointerType':'pen','points':[dict(x=x+10,y=230,t=len(strokes)*100,pressure=.4,tiltX=1,tiltY=2)]})
    return {'writer':writer,'strokes':strokes,'smooth':True,'order_index':index,'plan_id':PLAN_ID,'request_id':str(uuid.uuid4())}


if __name__ == '__main__':
    unittest.main()
