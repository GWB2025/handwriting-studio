"""Build a standalone Pages site without copying any personal data."""
from pathlib import Path
import re
import hashlib
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'docs'
DEST.mkdir(exist_ok=True)
assets = DEST / 'assets'
assets.mkdir(exist_ok=True)
notice = '''<aside class="browser-storage"><span>Saved on this browser · use Backup to keep a copy or move writing between devices.</span> <button id="backup-open" type="button">Backup / Import</button></aside>
<dialog id="backup-dialog" aria-labelledby="backup-title"><h2 id="backup-title">Keep your handwriting</h2><p>Writing stays on this browser and device. Clearing website data, using private browsing, or switching devices can make it unavailable. Download backups regularly.</p><button id="backup-download" type="button">Download backup</button><hr><label>Backup JSON file <input id="backup-file" type="file" accept=".json,application/json"></label><button id="backup-import" type="button">Import backup</button><p>Import adds records without replacing existing writing. Different versions of the same record are rejected together.</p><p id="backup-status" role="status" aria-live="polite"></p><button id="backup-close" type="button">Close</button></dialog>'''
route = {'/calibration':'calibration.html','/review':'review.html','/compose':'compose.html','/notebook':'notebook.html','/':'index.html'}
def adapt(text):
    text = text.replace('fetch(', 'window.studioFetch(')
    for old,new in sorted(route.items(), key=lambda pair: -len(pair[0])):
        text = text.replace("'"+old+"?", "'"+new+"?")
        text = text.replace('href="'+old+'"','href="'+new+'"')
    text = text.replace('on this Mac','in this browser').replace('stored on this Mac','stored in this browser')
    text = text.replace('Check the connection to the Mac.','Browser storage could not be read. Try reopening this page in a regular browser window.')
    text = text.replace('Check that the Mac is running the app, then tap Refresh samples.','Try reopening this page in a regular browser window, then tap Refresh samples.')
    text = text.replace('Check that the Mac is running the app, then tap Refresh list.','Try reopening this page in a regular browser window, then tap Refresh list.')
    text = text.replace('The Mac took too long', 'Browser storage took too long').replace('The Mac could not read this page.', 'Browser storage could not read this page.')
    return text
for name in ['app.js','capture.js','compose.js','review.js','library.js','calibration.js','plotter.js']:
    (assets/name).write_text(adapt((ROOT/'static'/name).read_text()))
style=(ROOT/'static/style.css').read_text()
style+='\n.browser-storage { padding: .6rem 1rem; background: #edf3ed; color: #203832; font-size: .85rem; display: flex; align-items: center; gap: 1rem; justify-content: space-between; }\n#backup-dialog { max-width: 36rem; width: calc(100% - 2rem); padding: 1.5rem; border: 1px solid #93ad9b; border-radius: 12px; }\n#backup-dialog::backdrop { background: #10231c66; }\n#backup-dialog[open] { display: block; height: auto; max-height: 90svh; overflow: auto; inset: 0; margin: auto; touch-action: auto; }\n#backup-dialog p { line-height: 1.5; }\n#backup-file { max-width: 100%; }\n'
(assets/'style.css').write_text(style)
for name in ['engine.js','browser-api.js','backup.js','blend-preview.js']:
    (assets/name).write_text((ROOT/'web'/name).read_text())
for source,target in [('capture.html','index.html'),('compose.html','compose.html'),('review.html','review.html'),('index.html','notebook.html'),('calibration.html','calibration.html')]:
    html=adapt((ROOT/'static'/source).read_text())
    html=re.sub(r'/static/([a-z.]+)\?v=\d+', r'assets/\1', html)
    html=html.replace('<script src="/api/letters/plan.js"></script>','')
    html=html.replace('</head>','<script src="assets/engine.js"></script><script src="assets/browser-api.js"></script>\n</head>')
    if(source=='review.html'):
        html=html.replace('<label>Letter <select', '<label>Group <select id="review-kind"><option value="lowercase">Lowercase</option><option value="uppercase">Uppercase</option><option value="numbers">Numbers</option><option value="symbols">Symbols</option><option value="pairs">Joined pairs</option></select></label><label>Character <select')
    if(source=='compose.html'):
        html=html.replace('<div class="compose-actions">','<div class="compose-settings"><label>Variation <select id="compose-variation"><option value="original">Saved examples</option><option value="blend">Blend compatible examples</option></select></label><label><input id="compose-joined" type="checkbox" checked> Use saved joined pairs</label></div><div class="compose-actions">')
        html=html.replace('<div class="compose-actions">','<label id="blend-count-label">Blend sources <select id="blend-count"><option value="2">Two samples</option><option value="4">Four samples · A/B top, C/D bottom</option></select></label><label id="blend-vertical-label" hidden>Vertical mix · <output id="blend-vertical-value">50% bottom row</output><input id="blend-vertical" type="range" min="0" max="100" step="1" value="50"></label><label id="blend-mix-label">Horizontal mix · <output id="blend-mix-value">50% right source</output><input id="blend-mix" type="range" min="0" max="100" step="1" value="50"></label><div class="compose-actions">')
        html=html.replace('</body>','<section id="blend-comparison" hidden aria-labelledby="blend-heading"><h2 id="blend-heading">Compare blended samples</h2><p>Sources and result use the same scale and baseline guides. Originals remain unchanged. Showing up to six blended occurrences from this preview.</p><label>Example <select id="blend-example"></select></label><div id="blend-cards"></div></section><script src="assets/blend-preview.js"></script></body>')
        html=html.replace('<option value="all">','<option value="latest_four">Latest four per character</option><option value="all">')
        html=html.replace('maxlength="200"','maxlength="2000"')
        html=html.replace('Type with your saved lowercase a–z captures.', 'Type with your saved letters, numbers and punctuation.')
        html=html.replace('Capitals, punctuation and cursive joins come later.', 'Capture capitals, numbers, punctuation and common joined pairs as needed. Words wrap together; full cursive is not included.')
    if(source=='capture.html'):
        html=html.replace('<div class="capture-heading">','<label>Capture <select id="capture-kind"><option value="lowercase">Lowercase a–z</option><option value="uppercase">Uppercase A–Z</option><option value="numbers">Numbers 0–9</option><option value="symbols">Punctuation and symbols</option><option value="pairs">Joined pairs</option></select></label><div class="capture-heading">')
        html=html.replace('Six sheets capture one example of every lowercase letter a–z. Repeat the set for more variations; positions change across three sets.', 'Choose a capture type. Each set covers its characters once, with shuffled positions. Capitals reach the tall-letter line; punctuation stays where you draw it relative to the baseline. Write joined pairs as a connected shape.')
    banner,modal=notice.split('<dialog',1)
    html=html.replace('<header>',banner+'<header>',1)
    html=html.replace('</body>','<dialog'+modal+'\n<script src="assets/backup.js"></script>\n</body>')
    # Changed assets get fresh URLs when a tablet reloads the page.
    html=re.sub(r'assets/([a-z.-]+)', lambda m: m.group(0)+'?v='+hashlib.sha256((assets/m.group(1)).read_bytes()).hexdigest()[:12], html)
    (DEST/target).write_text(html)
(DEST/'.nojekyll').write_text('')
print('Built five Pages screens and browser-only assets in docs/. No handwriting data was copied.')
