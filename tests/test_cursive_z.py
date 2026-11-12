import copy
import unittest
from letters import extract_samples, baseline_sample


class CursiveZTests(unittest.TestCase):
    def test_optional_tail_preserves_raw_capture_and_manual_alignment(self):
        for bottom in (330, 340, 395):
            strokes = [{'pointerType': 'pen', 'points': [
                {'x': 10, 'y': 330}, {'x': 30, 'y': 250}, {'x': 50, 'y': bottom}]}]
            sample = extract_samples(strokes, 'z', 2)[0]
            record = {'schema_version': 2, 'guides': {'baseline': 330}}
            before = copy.deepcopy(sample)
            aligned = baseline_sample(sample, record)
            self.assertEqual(max(p['y'] for p in aligned['processed_strokes'][0]['points']),
                             65 if bottom == 395 else 0)
            self.assertEqual(sample, before)
            self.assertEqual(baseline_sample(sample, record, 2), before)
            self.assertEqual(baseline_sample(sample, {'schema_version': 1}), before)
