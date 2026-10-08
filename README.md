# Handwriting Studio — guided capture and composition

## Use the website

[Open Handwriting Studio](https://gwb2025.github.io/handwriting-studio/)

The GitHub Pages version runs entirely in Safari or Chrome, including on an iPad. No Mac server, Python setup or login is needed. Capture all 26 lowercase letters, review individual samples, compose A4 handwriting and download SVGs. Free writing and Saved pages are also available.

**Writing is saved in this browser on this device.** It is not uploaded to GitHub and does not automatically sync between devices. Use **Backup / Import** to download a JSON backup regularly and move writing between devices. Clearing website data or using private browsing can remove saved writing. The app requests persistent browser storage where supported, but backups are still needed. Unsaved drafts are not part of a backup: save your sheet or page first.

Import validates every record before adding anything. Identical records are skipped. Conflicting versions of the same record reject the entire import; use a fresh browser for the other version. Import does not overwrite captures or review choices. The import limit is 100 MB.


### Extended handwriting workflow (public website)

Choose **Capture** → **Lowercase**, **Uppercase**, **Numbers**, **Punctuation and symbols**, or **Joined pairs**. Each type has its own saved progress. Complete the current set before changing type; unsaved practice can be cleared with confirmation. Capture capitals to the tall-letter guide. New character types retain the drawn baseline, so write dots, commas and quotes at their normal positions. Joined pairs should be written as one connected shape in each box.

Review has matching groups, with individual inclusion and baseline controls. Existing lowercase samples remain unchanged. Extended records use schema 3, supported by the public website and its backup/import; the original Mac app does not support these new records.

Compose supports captured capitals, digits and the symbols offered by Capture. It wraps whole words, uses neighbouring stroke shapes to adjust spacing, and accepts up to 2,000 characters when they fit on one A4 page. Oversized words and overflowing pages produce a message instead of clipping.

Choose **Blend compatible examples** to resample matching strokes at equal arc-length intervals and blend two examples. Stroke counts and corresponding geometry/direction must match; unsuitable combinations use an original sample. This is a conservative heuristic, not handwriting recognition: inspect the preview before plotting. Saved raw strokes are never resampled or overwritten. Each generated preview is fixed for downloading; generating again chooses fresh blend weights. **Use saved joined pairs** substitutes included pairs where available and otherwise uses individual characters. Full cursive joining is not included.

Direct plotter control and an editable pending plot queue remain dependent on the controller and connection used by the T-A4. This release exports SVGs for the existing plotting workflow.

### Bring existing Mac handwriting to the website

From the local app folder, export your original data without changing it:

```
python3 scripts/export_backup.py --output ~/Desktop/handwriting-studio-backup.json
```

Then open the website, choose **Backup / Import**, select that JSON file and import it. Transfer the file to your iPad to import there too. Keep the original local data and the backup.

### Build and publish

Browser capture and composition rules live in `web/`. `scripts/build_pages.py` adapts the established screens into `docs/` with relative links and browser storage. It copies only named UI assets, never `data/` or local backups. The original Python app below remains available.

```
npm ci --ignore-scripts
npm test
python3 scripts/build_pages.py
```

In repository Settings → Pages, choose **GitHub Actions** as the source. The Publish Handwriting Studio workflow tests and deploys `docs/` on pushes to `main`. A normal internet connection loads the website; this version does not include an offline installation or automatic cloud sync.

---

## Original Mac app


A local iPad/Safari handwriting app for the 2D Pen Plotter project. Guided lowercase a–z capture, repeat sets for natural variations, individual sample review, and a typed handwriting preview. No cloud service or account is required.

The original app on port 8765 and its data remain separate. This app runs on port 8766. Existing free-writing pages remain in `data/`; new labelled letter sheets live in `data/letters/`.

## Launch Handwriting Studio

[![Open Handwriting Studio on this Mac](docs/open-handwriting-studio.svg)](http://127.0.0.1:8766/)

The button opens **Capture** on the Mac running the app. **Start the app first** by double-clicking **Start Handwriting Studio.command** on your Desktop or in the project folder. Once the server is running, you can use this button whenever you want to return to it. GitHub's README cannot start a Python program on your Mac; if the button reports that it cannot connect, run the desktop launcher and try again. For a new installation, follow [Run on the Mac](#run-on-the-mac) below.

On the iPad, use the [iPad Capture link](http://192.168.178.112:8766/) while the Mac is awake and both devices are on the same Wi-Fi. This is the current Mac address for this setup; use your Mac's current address if it changes. The button above uses `127.0.0.1`, which always means the device you are browsing on, so it is for the Mac, not the iPad.

## Acknowledgement

This project was inspired by **[Dan Catt](https://revdancatt.com/projects)** and the handwriting-capture workflow demonstrated in [his handwriting video](https://www.youtube.com/watch?v=nD3XlqFhcEI). Thank you, Dan, for sharing the approach: guided practice, repeated character samples, changing capture positions, and composing handwriting with natural variations. His [Generative Handwriting project diary](https://revdancatt.com/projects/Generative%20Handwriting/dev-diary) provides further context for his work.

Handwriting Studio is an independent implementation of these ideas for the 2D Pen Plotter project.

## Run on the Mac

For everyday use, double-click **Start Handwriting Studio.command** in Finder. It runs `launch_handwriting_studio.py`, starts the server if needed, waits for Capture to be ready, and opens `http://127.0.0.1:8766/` in your default browser. Opening it again reuses the running server. You can close the launcher's Terminal window; a server started by the launcher keeps running. Its output goes to `logs/server.log`.

You can also run the Python launcher directly from this folder:

```
python3 launch_handwriting_studio.py
```

Use this launcher instead of opening files in `static/`: a local HTML file cannot load the running app correctly. The launcher always opens **Capture** first. It prefers this app's virtual environment and can also use the current Python if Flask is already installed. It does not install packages automatically. `--no-browser` checks/starts the server without opening a browser; `--port` changes the default port if needed. An unrelated service already using the chosen port is left untouched and reported.

For first-time setup or to run the server in the foreground, follow the steps below.

Use Python 3.10+ from this folder:

```
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python app.py --host 0.0.0.0 --port 8766
```

On this Mac, the repository, saved handwriting and app's `.venv` are stored on **EXTRA Apps**:

```text
/Volumes/EXTRA Apps/Documents/Writing Robot T-A4/handwriting-studio-v2
```

Keep that drive connected while using the app. The Desktop launcher points to this location. The previous project-folder location is a symbolic link to the same external-drive folder, so existing local references continue to work without keeping a second copy on the main disk.

Open http://127.0.0.1:8766 on the Mac, or http://192.168.178.112:8766 on the iPad on the same private Wi-Fi. The Mac's address may change when the network changes. Use the explicit `http://` address. This is an unauthenticated local HTTP server; do not expose it to the internet. Stop with Control-C.

Flask is the only installed dependency. The browser uses ordinary HTML, CSS, JavaScript, Canvas and Pointer Events; no build step is needed. HTML and API responses are uncached. If updating an already open page, save or download current writing before reloading.

## Capture the lowercase alphabet

The public GitHub Pages app shuffles all 26 letters across each new six-sheet set. Saved records retain the shuffled order for resuming and backup/import. If you resume an older fixed-order set, only its remaining letters are shuffled; completed sheets keep their original meaning. The original Mac server uses its existing fixed groups.

1. Enter the writer's name. If you tap Start capture with no name entered, the app highlights and focuses the Writer box without clearing practice strokes. Use the same name for later sessions; existing names appear as suggestions. Tap **Done** to finish text entry.
2. The initial sheet is optional **Practice** with a–e. These marks are not stored. **Start capture** clears them and opens the next unsaved alphabet sheet for this writer.
3. A set has six sheets: two with five letters, four with four letters, covering all 26 lowercase letters. Keep each entire letter inside its own box, including dots and separate strokes. Use the small-letter and tall-letter guides for comfortable proportions.
4. For **f, g, j, p, q and y**, place the body on the baseline and any tail below it. These letters use the drawn baseline instead of moving the bottom of the tail to the baseline. Other letters still settle onto the baseline automatically. Review can adjust an individual sample's placement if needed.
5. Tap **Save sheet**. Only confirmation from the Mac clears it and advances. Each saved sheet can be used immediately in Compose. Reopening Capture with the same writer continues after the most recently saved alphabet sheet; an unsaved draft itself is not restored.
6. After six sheets, **Review samples** lets you inspect your alphabet and **Compose handwriting** opens the composer. **Capture another set** collects further variants. Three sets give three examples of each letter, with positions rotated between sets; further sets repeat that positioning cycle.

Undo/Redo work on the current sheet. Clear sheet clears only that draft. Missing boxes, tiny marks or a stroke that crosses between boxes produce an explanation and leave the writing in place. The app associates strokes with the labelled box; it does not recognise whether the correct letter was written. Check the letters before saving.

The **Guides** checkboxes control **Baseline**, **Small letters**, **Tall letters**, **Tails** and **Shading** independently. For a baseline only, untick the others. Letter labels and box dividers stay visible so each letter can still be assigned to its box. Changing guides only changes the display; it does not change strokes or SVG exports. Choices stay in place between sheets in the current visit.

The writer name is fixed during capture to prevent mixing writers. To start a new writer, reopen the capture page and edit the name on the Practice screen. Saved samples are retained, including incomplete sets. Existing a–e captures remain usable and can also be reviewed; the first full alphabet set starts at sheet 1 when there are no newer alphabet sheets. Unsaved capture drafts are not restored after a refresh; the browser is asked to warn before leaving.

Pencil and mouse draw; fingers do not. The entire capture screen suppresses touch scrolling, pinching, text selection and copy menus. The editable Writer field is the exception when no Pencil stroke is active. Safari's toolbar and system edge gestures are outside the app's control. Actual iPad/Pencil behaviour still needs device testing.

## Review individual samples

Open **Review samples**, choose the writer and letter, then select an example from the list (newest first). The preview shows that sample against a baseline at the Medium writing scale. **Use this sample in composition** includes or excludes just that example. **Baseline shift (mm)** moves it down for positive values or up for negative values, between −10 and 10 mm. This is a physical shift in the exported SVG at all writing sizes. It does not resize a letter.

Tap **Save changes** for an explicit confirmation and updated preview. Save is only enabled when something changed; **Reset changes** discards pending edits. Switching samples is disabled while edits are pending. Exclusions are reversible, and originals are never deleted. Review settings are stored separately in `data/letter_reviews/`. Unreadable review files are preserved and their samples are skipped rather than silently re-enabled.

The page reports which letters still need included samples. Existing a–e examples and newly captured alphabet examples share this review workflow. Return to Compose and generate a fresh preview after reviewing.

## Compose and export

Choose a writer, type a short phrase using lowercase a–z, spaces and line breaks, and select **Generate preview**. After capturing the alphabet, try `the quick brown fox jumps over the lazy dog`. The phrase box starts with that full-alphabet sentence and an a–z line when the selected writer has all 26 letters included. For incomplete alphabets, the automatic example uses only available letters. Changing writers or refreshing samples updates an untouched example, while text you have edited is preserved. By default, successive occurrences cycle through that writer's **latest three included examples per letter**, newest first. Choose **Latest only** or **All saved** for different selection limits; excluded samples are always skipped. The choice is deterministic. Each generation reads captures and review choices afresh. Returning from another tab or Safari's back/forward cache checks for changes, including baseline adjustments: an unchanged preview stays downloadable; changed captures or reviews clear it and prompt regeneration without losing the phrase. If that check cannot reach the Mac, the existing preview remains available to download.

Every letter is translated so its left edge is zero. Letters with tails use the capture baseline; others use their lowest point. A review shift is applied afterwards. All letters use the same scale: Small/Medium/Large refer to the capture guide's small-letter height (3/5/8 mm), not a forced height for each character. Line spacing and A4 bounds allow for both ascenders and descenders. Gentle smoothing uses the same quadratic midpoint curves as the notebook; it never rewrites raw points.

**Download A4 SVG** exports exactly the generated preview, on a 210 × 297 mm portrait page with 20 mm margins. The app confirms when it requests the download; look for `composed-handwriting-a4.svg` in the browser's Downloads. The preview remains available for another download. Each pen stroke is its own unfilled centre-line path, in captured order and direction, with nominal width 0.3 mm. Text wraps at the right margin, potentially within a word. If it cannot fit on one page, the app asks for less text or a smaller size instead of clipping it. Changes to phrase/writer/size/smoothing/sample selection clear the old preview and disable download until regenerated.

This stage spaces separate lowercase letters. It does not yet include capitals, numbers, punctuation, cursive joins, pair-specific spacing, blending new shapes between samples, stroke editing or handwriting recognition. It sends no commands to the plotter.

## Free writing and saved pages

**Free writing** opens `/notebook`, using the established notebook and Saved pages browser. Enter a name and write at a comfortable size. Done is active only for a non-empty name that differs from the last finished name. A Pencil stroke also ends name entry. The fitted paper waits until that stroke finishes before resizing after the keyboard closes.

Save page stores a new immutable JSON file in `data/`. It changes to Saving… and then ✓ Saved only after confirmation from the Mac. Editing enables Save again. Undo removes the last completed stroke; Redo restores its original point data. New writing or Clear empties redo history. SVG exports the current free-writing page at 200 × 100 mm.

Saved pages lists free-writing pages newest first and can filter by writer. Select a page to preview it, then Open this page. Opening restores original strokes and smoothing. Saving edits creates a new file. There is a warning before replacing an unsaved draft, including strokes held in redo history. Unreadable files are left untouched and counted; there is no delete action. Labelled capture sheets are used by the composer and are not mixed into this free-writing list.

## Data and validation

- `data/<uuid>.json`: existing notebook schema 2, ordered `raw_strokes`, writer and display setting.
- `data/letters/<uuid>.json`: immutable schema 1 (legacy a–e) or schema 2 (lowercase alphabet), writer, ordered original `raw_strokes`, cell order and guides. Each sample holds raw stroke indices and a separate `processed_strokes` copy translated to its baseline. Time, pressure, tilt, stroke order and raw coordinates remain unchanged. Processing version and method are recorded explicitly; old captures are read without migration or rewriting.
- `data/letter_reviews/<uuid>.json`: separate per-letter inclusion and baseline offsets for that capture, saved atomically. Writer revisions include review choices, so a baseline-only adjustment invalidates stale compositions too.
- Capture coordinates are 1000 × 500 with y increasing down the page; timestamps are milliseconds from first contact. Pressure and tilt are retained where available. Captured data is never replaced by display smoothing.
- A save request UUID is reused when retrying the same sheet after a timeout, preventing duplicate samples from a lost response. Files are written atomically. Existing IDs with different content are rejected.
- The server checks finite coordinate values, ordered timestamps, pressure/tilt ranges, writer names, stroke/point counts, whole-cell assignment and file size. Stored letter records are validated again before composition. Writers are labels, not authenticated accounts.

APIs: `GET/POST /api/pages`, `GET /api/pages/<uuid>`, `GET /api/letters/plan.js`, `GET /api/letters/writers`, `POST /api/letters/pages`, `GET /api/letters/samples?writer=…&letter=…`, `POST /api/letters/samples/<uuid>/<letter>/review`, `POST /api/compose`.

## Verification

```
python -m unittest discover -s tests
node --test tests/*.cjs
```

Python checks persistence, raw preservation, legacy compatibility, all 26 letters across three sets, multi-stroke letters, descenders, A4 bounds, reversible exclusions, baseline shifts, safe retries and unreadable files. JavaScript checks capture continuation, sample selection, stale preview/download invalidation after review, keyboard viewport recovery, first-stroke preservation, Writer focus, Undo/Redo, timestamps and selection protection. Browser checks use isolated disposable data for capture/save, review persistence and full-alphabet composition. Desktop checks cannot establish real iPad palm-rejection quality.

A pre-guided-capture code snapshot is in `backups/before-guided-capture/`; user data is not part of that snapshot.

The previous a–e version is in `backups/before-lowercase-alphabet/`, including fingerprints of the original saved data for preservation checks.

## Verified plotter calibration

Open **Calibration** from Capture, Review or Compose for the repeatable A4 check, preview and downloadable G-code/SVG. The procedure was physically verified by the owner on 8 October 2026: top-left home, +X right, −Y down, Z0.5 pen up, Z5 pen down, 115200 baud on the Mac USB connection. Run the pen-up movement check, the pen down/up check (no X/Y commands), then shapes, dimensions and centre on one fixed sheet. Rectangle 170 × 257 mm with 20 mm margins; circle diameter 160 mm; triangle 150 × 210 mm; centre X105 Y−148.5 with a 6 mm cross. Downloads use millimetres and absolute coordinates, lift between strokes and finish pen up; drawing stages return to X0 Y0. The page does not connect directly to USB or modify firmware calibration.

## Plot your handwriting

In Compose, generate a preview and choose **Download plotter G-code**. It exports that preview’s strokes in the same order; smoothing is flattened to straight segments within 0.02 mm. Dots receive a brief dwell. The file uses the verified pen settings, 20 mm A4 margins, negative Y down, pen lifts between strokes, and returns home pen up. Changes to writing or sample settings invalidate both downloads. Transfer the downloaded file to the Mac attached to the plotter.

The reusable sender validates the entire file before opening USB. It accepts only the Studio command set, rejects coordinates outside A4, verifies the controller is idle at X0 Y0 with zero work offset, waits for each acknowledgement, and checks final completion and pen-up home position. It does not home automatically. Place paper, home the plotter at its top-left corner and raise the pen before running.

```sh
# Check a downloaded file without connecting or moving the plotter:
python3 scripts/send_plot.py ~/Downloads/composed-handwriting-a4.gcode
# Send it after preparing the paper and homing:
python3 scripts/send_plot.py ~/Downloads/composed-handwriting-a4.gcode --run
```

The default USB port is `/dev/cu.usbmodem201912341` at 115200 baud; override with `--port` if it changes. Install `requirements-plotter.txt` if pyserial is unavailable; the sender can also use this Mac’s existing Inkscape serial dependency. Progress reports commands accepted, then waits for physical motion to finish. **Ctrl+C requests feed hold** and reports an incomplete job. Check the machine before restarting; restarting sends the whole file, and no resume is attempted. A local lock prevents simultaneous Studio senders. The GitHub Pages app downloads files; USB transmission runs on the Mac.

## Inspect normalisation and blending

On the public Compose screen choose **Blend compatible examples**. For two samples, **Horizontal mix** controls the contribution of source B (0–100%; 50% gives equal contributions). Each occurrence still selects compatible source examples from the chosen sample pool. After generating, **Compare blended samples** shows up to six actual blended occurrences: source A, source B and the result, with common scale and baseline guides. Source IDs identify the original captures. The previews are derived from the exact samples used in that composition, not a separate demonstration. The status reports blended occurrences and original-sample fallbacks. Moving the mix controls automatically rebuilds the SVG, G-code and comparisons after a preview has been generated. Source records remain unchanged. Matching stroke counts and directions are still required; differing pen strokes fall back to originals. This inspection feature is available in the browser version; the original Mac capture server remains unchanged.

### Two- and four-source live blending

Choose two or four samples in Compose. Horizontal mix moves from A to B; for four samples, A/B form the top row and C/D the bottom row, with Vertical mix moving between rows. The four weights are bilinear: `(1-h)(1-v), h(1-v), (1-h)v, hv`. At the centre each contributes 25%; at a corner one contributes 100%. All four sources must be mutually compatible. If fewer than four are available, that occurrence uses its original sample and is counted as a fallback. Selecting four sources switches Latest three to Latest four. After the first generated preview, moving either slider automatically updates the phrase and source comparisons using the same selected sources. Downloads remain disabled while rebuilding, and always match the latest preview.
