import json,tempfile,unittest
from pathlib import Path
from app import create_app
class Pages(unittest.TestCase):
    def test_save_and_validate(self):
        with tempfile.TemporaryDirectory() as d:
            c=create_app(d).test_client()
            strokes=[{'pointerType':'pen','points':[{'x':20,'y':35,'t':0,'pressure':.4,'tiltX':5,'tiltY':2}]}]
            for writer in ('Writer one','Writer two'):
                self.assertEqual(c.post('/api/pages',json={'writer':writer,'strokes':strokes,'smooth':True}).status_code,201)
            pages=[json.loads(p.read_text()) for p in Path(d).glob('*.json')]
            self.assertEqual(len(pages),2)
            self.assertEqual({p['writer'] for p in pages},{'Writer one','Writer two'})
            self.assertTrue(all(p['raw_strokes']==strokes for p in pages))
            strokes[0]['points'][0]['t']=-1
            self.assertEqual(c.post('/api/pages',json={'writer':'X','strokes':strokes,'smooth':False}).status_code,400)
            self.assertEqual(c.post('/api/pages',json={}).status_code,400)
            self.assertEqual(len(list(Path(d).glob('*.json'))),2)
            with c.get('/') as r:self.assertEqual(r.status_code,200)

    def test_list_reopen_and_save_copy(self):
        with tempfile.TemporaryDirectory() as d:
            c=create_app(d).test_client()
            self.assertEqual(c.get('/api/pages').json, {'pages': [], 'unavailable_count': 0})
            strokes=[{'pointerType':'pen','points':[{'x':20,'y':35,'t':500,'pressure':.4,'tiltX':5,'tiltY':2}]}]
            first=c.post('/api/pages',json={'writer':'Original','strokes':strokes,'smooth':False}).json
            original_file=Path(d)/(first['id']+'.json')
            original_bytes=original_file.read_bytes()
            opened=c.get('/api/pages/'+first['id'])
            self.assertEqual(opened.status_code,200)
            self.assertEqual(opened.json['raw_strokes'],strokes)
            self.assertFalse(opened.json['display_smoothing'])
            self.assertEqual(opened.headers['Cache-Control'],'no-store')
            edited=opened.json['raw_strokes']
            edited.append({'pointerType':'pen','points':[{'x':30,'y':45,'t':501,'pressure':None,'tiltX':None,'tiltY':None}]})
            second=c.post('/api/pages',json={'writer':'Copy','strokes':edited,'smooth':True}).json
            pages=c.get('/api/pages').json['pages']
            self.assertEqual([p['id'] for p in pages],[second['id'],first['id']])
            self.assertEqual([p['stroke_count'] for p in pages],[2,1])
            self.assertNotIn('raw_strokes',pages[0])
            self.assertEqual(original_file.read_bytes(),original_bytes)
            self.assertEqual(c.get('/api/pages/'+first['id']).json['raw_strokes'],strokes)

    def test_unreadable_pages_do_not_hide_valid_pages(self):
        import uuid
        with tempfile.TemporaryDirectory() as d:
            c=create_app(d).test_client()
            valid=c.post('/api/pages',json={'writer':'Valid','smooth':True,'strokes':[{'pointerType':'pen','points':[{'x':1,'y':2,'t':0}]}]}).json
            invalid_id=str(uuid.uuid4())
            bad=Path(d)/(invalid_id+'.json');bad.write_text('{broken')
            symlink_id=str(uuid.uuid4())
            (Path(d)/(symlink_id+'.json')).symlink_to(Path(d)/(valid['id']+'.json'))
            response=c.get('/api/pages').json
            self.assertEqual([p['id'] for p in response['pages']],[valid['id']])
            self.assertEqual(response['unavailable_count'],2)
            self.assertEqual(c.get('/api/pages/'+invalid_id).status_code,422)
            self.assertEqual(c.get('/api/pages/'+symlink_id).status_code,422)
            self.assertEqual(c.get('/api/pages/'+str(uuid.uuid4())).status_code,404)
            self.assertEqual(c.get('/api/pages/not-a-page').status_code,404)
            self.assertEqual(c.get('/api/pages/%2e%2e%2fapp.py').status_code,404)
            self.assertEqual(bad.read_text(),'{broken')

    def test_saved_file_size_is_checked_before_writing(self):
        from unittest.mock import patch
        with tempfile.TemporaryDirectory() as d:
            c=create_app(d).test_client()
            with patch('app.MAX_PAGE_BYTES',100):
                r=c.post('/api/pages',json={'writer':'Writer','smooth':True,'strokes':[{'pointerType':'pen','points':[{'x':1,'y':2,'t':0}]}]})
            self.assertEqual(r.status_code,413)
            self.assertEqual([p for p in Path(d).rglob('*') if p.is_file()],[])
