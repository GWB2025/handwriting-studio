import tempfile
import unittest
from pathlib import Path
from app import create_app


class Fonts(unittest.TestCase):
    def test_optional_catalog_and_scoped_read_only_files(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            client = create_app(folder).test_client()
            self.assertEqual(client.get('/api/fonts').json, {'fonts': []})
            with client.get('/fonts') as response:
                self.assertEqual(response.status_code, 200)
                self.assertIn(b'Compose with fonts', response.data)
            fonts = folder / 'fonts'
            fonts.mkdir()
            content = b'\x00\x01\x00\x00' + b'\x00' * 16
            (fonts / 'Test font.ttf').write_bytes(content)
            (fonts / 'secret.txt').write_text('private')
            (fonts / 'linked.ttf').symlink_to(fonts / 'Test font.ttf')
            (fonts / 'big.ttf').write_bytes(b'\x00' * (2 * 1024 * 1024 + 1))
            (fonts / 'short.ttf').write_bytes(b'x')
            response = client.get('/api/fonts')
            self.assertEqual(response.headers['Cache-Control'], 'no-store')
            self.assertEqual([r['name'] for r in response.json['fonts']], ['Test font.ttf'])
            with client.get(response.json['fonts'][0]['url']) as response:
                self.assertEqual(response.data, content)
                self.assertEqual(response.mimetype, 'font/ttf')
            for name in ['secret.txt', 'linked.ttf', 'big.ttf', 'short.ttf', '../secret.txt', '%2e%2e%2fsecret.txt']:
                self.assertEqual(client.get('/api/fonts/' + name).status_code, 404)
            self.assertEqual(client.post('/api/fonts/Test.ttf', data=content).status_code, 405)

    def test_symlinked_catalog_is_not_served(self):
        with tempfile.TemporaryDirectory() as directory, tempfile.TemporaryDirectory() as other:
            (Path(other) / 'outside.ttf').write_bytes(b'x' * 20)
            (Path(directory) / 'fonts').symlink_to(other)
            client = create_app(directory).test_client()
            self.assertEqual(client.get('/api/fonts').json, {'fonts': []})
            self.assertEqual(client.get('/api/fonts/outside.ttf').status_code, 404)
