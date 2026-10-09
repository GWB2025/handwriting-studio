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
route = {'/proof':'proof.html','/help':'help.html','/alphabet':'alphabet.html','/blending':'blending.html','/calibration':'calibration.html','/review':'review.html','/compose':'compose.html','/notebook':'notebook.html','/':'index.html'}
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
style+='\n.compose-spacing {margin:16px 0;border:1px solid #b9c9bf;border-radius:10px;padding:12px;display:flex;flex-wrap:wrap;gap:12px 24px;} .compose-spacing label {display:block;flex:1 1 180px;} .compose-spacing input {display:block;width:100%;} .compose-spacing p {width:100%;margin:0;line-height:1.5;}\n.browser-storage { padding: .6rem 1rem; background: #edf3ed; color: #203832; font-size: .85rem; display: flex; align-items: center; gap: 1rem; justify-content: space-between; }\n#backup-dialog { max-width: 36rem; width: calc(100% - 2rem); padding: 1.5rem; border: 1px solid #93ad9b; border-radius: 12px; }\n#backup-dialog::backdrop { background: #10231c66; }\n#backup-dialog[open] { display: block; height: auto; max-height: 90svh; overflow: auto; inset: 0; margin: auto; touch-action: auto; }\n#backup-dialog p { line-height: 1.5; }\n#backup-file { max-width: 100%; }\n'
(assets/'style.css').write_text(style)
for name in ['engine.js','browser-api.js','backup.js','blend-preview.js','blending.js','alphabet.js','proof.js','proof-comparison.js','compositions.js','character-spacing.js']:
    (assets/name).write_text((ROOT/'web'/name).read_text())
for source,target in [('capture.html','index.html'),('compose.html','compose.html'),('review.html','review.html'),('index.html','notebook.html'),('calibration.html','calibration.html'),('blending.html','blending.html'),('alphabet.html','alphabet.html'),('help.html','help.html'),('proof.html','proof.html')]:
    html=adapt((ROOT/('web' if source in ['help.html','proof.html'] else 'static')/source).read_text())
    if source not in ['alphabet.html','help.html','proof.html']:html=html.replace('</nav>','<a class="button" href="alphabet.html">My alphabet</a></nav>',1)
    if source not in ['blending.html','alphabet.html','help.html']:html=html.replace('</nav>','<a class="button" href="blending.html">Blend a character</a></nav>',1)
    if source!='help.html':
        topic={'capture.html':'capture','index.html':'notebook'}.get(source,source.removesuffix('.html'))
        help_link=f'<a class="button" href="help.html#{topic}" target="_blank" rel="noopener" aria-label="Help guide (opens in a new tab)">Help guide</a>'
        if '</nav>' in html:html=html.replace('</nav>',help_link+'</nav>',1)
        else:html=html.replace('<div class="header-actions">','<div class="header-actions">'+help_link,1)
    html=re.sub(r'/static/([a-z.]+)\?v=\d+', r'assets/\1', html)
    html=html.replace('<script src="/api/letters/plan.js"></script>','')
    html=html.replace('</head>','<script src="assets/engine.js"></script><script src="assets/browser-api.js"></script>\n</head>')
    if(source=='alphabet.html'):
        html=html.replace('<div id="alphabet-samples"></div>',(ROOT/'web/character-spacing.html').read_text()+'<div id="alphabet-samples"></div>')
        html=html.replace('<script src="assets/alphabet.js">','<script src="assets/character-spacing.js"></script><script src="assets/alphabet.js">')
    if(source=='review.html'):
        html=html.replace('<div class="sample-preview-row">',(ROOT/'web/review-tools.html').read_text()+'<div class="sample-preview-row">')
        html=html.replace('<div class="sample-shift-readout">',(ROOT/'web/review-sizing.html').read_text()+'<div class="sample-shift-readout">')
        html=html.replace('<label>Letter <select', '<label>Group <select id="review-kind"><option value="lowercase">Lowercase</option><option value="uppercase">Uppercase</option><option value="numbers">Numbers</option><option value="symbols">Symbols</option><option value="pairs">Joined pairs</option></select></label><label>Character <select')
        html=html.replace('Choose a letter and inspect its saved examples, newest first.', 'Choose a writer, group and character, then inspect its originals and saved blends, newest first. Blends are labelled.')
    if(source=='compose.html'):
        html=html.replace('<script src="assets/compose.js"></script>','<script src="assets/compositions.js"></script><script src="assets/compose.js"></script>')
        html=html.replace('<div class="compose-actions">','<div class="compose-settings"><label>Use <select id="compose-source"><option value="both">Originals and saved blends</option><option value="originals">Original samples only</option><option value="blends">Saved blends only</option></select></label><label><input id="compose-preferred" type="checkbox" checked> Use preferred versions when available</label></div><p>Preferred versions must match the chosen source type. Missing saved blends are reported before generating. <a href="alphabet.html">Manage my alphabet</a></p><div class="compose-actions">')
        html=html.replace('<div class="compose-actions">','<label><input id="compose-joined" type="checkbox" checked> Use saved joined pairs</label><select id="compose-variation" hidden><option value="original">Saved examples</option></select><p><a href="blending.html">Blend and save a single character</a>, then use it here as a saved sample.</p><div class="compose-actions">')
        html=html.replace('<option value="all">','<option value="latest_four">Latest four per character</option><option value="all">')
        spacing_controls='<fieldset class="compose-spacing"><legend>Spacing · live after Generate preview</legend>'
        for name,label in [('letter','Letter spacing'),('word','Word spacing'),('line','Line gap')]:
            spacing_controls+=f'<label>{label} · <output id="compose-{name}-value">100%</output><input id="compose-{name}-spacing" type="range" min="50" max="200" step="5" value="100"></label>'
        spacing_controls+='<button type="button" id="compose-spacing-reset">Reset spacing</button><p>100% uses the normal layout. Letter spacing changes the distance between character starts; line gap changes the space between lines. Size and character shapes stay the same.</p></fieldset>'
        html=html.replace('<div class="compose-actions">',spacing_controls+'<div class="compose-actions">',1)
        html=html.replace('maxlength="200"','maxlength="2000"')
        html=html.replace('Type with your saved lowercase a–z captures.', 'Type with your saved letters, numbers and punctuation.')
        html=html.replace('Repeated letters cycle through the newest three included examples of each letter.', 'Included preferred versions cycle in your chosen order when enabled and allowed by the source type. Otherwise, repeated characters cycle through your chosen sample pool, newest first.')
        html=html.replace('Lowercase a–z, spaces and line breaks; size refers to the small-letter guide, keeping your natural letter proportions.', 'Use captured capitals, lowercase, numbers and supported punctuation, plus spaces and line breaks. Up to 2,000 characters must fit on one A4 page. Size refers to the small-letter guide, keeping your natural proportions.')
        html=html.replace('Capitals, punctuation and cursive joins come later.', 'Capture capitals, numbers, punctuation and common joined pairs as needed. Words wrap together; full cursive is not included.')
        html=html.replace('<form id="compose-form">',(ROOT/'web/compositions.html').read_text()+'<form id="compose-form">')
    if(source=='capture.html'):
        html=html.replace('<div class="capture-heading">','<label>Capture <select id="capture-kind"><option value="lowercase">Lowercase a–z</option><option value="uppercase">Uppercase A–Z</option><option value="numbers">Numbers 0–9</option><option value="symbols">Punctuation and symbols</option><option value="pairs">Joined pairs</option></select></label><div class="capture-heading">')
        html=html.replace('Six sheets capture one example of every lowercase letter a–z. Repeat the set for more variations; positions change across three sets.', 'Choose lowercase, uppercase, numbers, punctuation and symbols, or joined pairs. Each set covers its characters once, in shuffled positions. Lowercase has six sheets. Repeat sets under the same writer name for more samples; each type keeps separate progress.')
        html=html.replace('These letters keep the drawn baseline; other letters settle onto it automatically.', 'These lowercase letters keep the drawn baseline; other lowercase letters settle onto it automatically. Capitals reach the tall-letter line. Capitals, numbers, punctuation and joined pairs keep their drawn baseline; write joined pairs as a connected shape.')
        html=html.replace('<a href="notebook.html">Open free writing</a>.', '<a href="notebook.html">Open free writing</a>. Pencil or mouse draws; fingers use controls. Save sheets before leaving or refreshing: unsaved drafts are not restored. Use Backup / Import to keep a copy of saved work.')
        html=html.replace('</div>\n    <div class="toolbar">', '<p>After capture, use Review samples to check originals, Blend a character to mix two or four examples, and My alphabet to choose preferred versions for Compose.</p></div>\n    <div class="toolbar">',1)
    if(source=='index.html'):
        html=html.replace('Smoothing changes the display and SVG only.', 'Smoothing changes the display and SVG only. Saved pages reopens earlier writing; saving edits creates a new copy. These pages are separate from character samples used by Compose. Use Backup / Import to keep a copy; unsaved drafts are not backed up.')
    banner,modal=notice.split('<dialog',1)
    html=html.replace('<header>',banner+'<header>',1)
    html=html.replace('</body>','<dialog'+modal+'\n<script src="assets/backup.js"></script>\n</body>')
    # Changed assets get fresh URLs when a tablet reloads the page.
    html=re.sub(r'assets/([a-z.-]+)', lambda m: m.group(0)+'?v='+hashlib.sha256((assets/m.group(1)).read_bytes()).hexdigest()[:12], html)
    (DEST/target).write_text(html)
(DEST/'.nojekyll').write_text('')
print('Built eight Pages screens, the help guide and browser-only assets in docs/. No handwriting data was copied.')
