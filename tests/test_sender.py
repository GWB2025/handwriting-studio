import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('sender',Path(__file__).resolve().parents[1]/'scripts/send_plot.py')
sender=importlib.util.module_from_spec(spec);spec.loader.exec_module(sender)
class SenderTests(unittest.TestCase):
 def test_validated_calibration_and_handwriting(self):
  self.assertEqual(len(sender.validate('G21\nG90 G1 Z0.5 F1200\nG90 G1 X20 Y-20 F2400\nG90 G1 Z5 F3000\nG90 G1 X30 Y-30 F900\nG90 G1 Z0.5 F3000\nG90 G1 X0 Y0 F2400')),7)
 def test_reject_unsafe_commands(self):
  for body in ['G91','G90 G1 X20 Y20 F900','G90 G1 Z5 F3000','G90 G1 X220 Y-20 F900','G90 G1 Z5 F3000\nG90 G1 X20 Y-20 F2400\nG90 G1 Z0.5 F3000\nG90 G1 X0 Y0 F2400']:
   with self.assertRaises(ValueError):sender.validate('G21\nG90 G1 Z0.5 F1200\n'+body)
