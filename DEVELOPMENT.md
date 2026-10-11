# Development and local setup

[README](README.md) · [Public help guide](https://gwb2025.github.io/handwriting-studio/help.html)

The public GitHub Pages app is the current version. The Flask server described below is a legacy option with fewer features.

## Build, test and publish

`web/engine.js` contains browser capture, normalisation, blend and composition rules. `web/browser-api.js` supplies the browser storage adapter using IndexedDB. `web/recovery-store.js` uses a separate local database for recovery copies and confirmed backup manifests; these housekeeping records never enter handwriting backups. `web/recovery.js` provides the shared recovery controls. Shared screens and interaction code are in `static/`; browser-only pages and features are in `web/`. `web/help.html` is the public help source. `scripts/build_pages.py` builds eight working screens and the help guide into `docs/`, with relative links and hashed asset URLs. It adapts public instructions separately from the older Mac server. Edit source files and rebuild rather than editing generated `docs/` pages directly.

```sh
npm ci --ignore-scripts
npm run build
npm test
STUDIO_PAGES_TEST=1 node --test tests/test_composer.cjs tests/test_viewport.cjs tests/test_review.cjs tests/test_compositions_ui.cjs tests/test_character_spacing_ui.cjs tests/test_recovery.cjs tests/test_proof_ui.cjs
# With the Python app dependencies installed:
python3 -m unittest discover -s tests
```

Node checks cover capture, browser storage/import, review, composition, saved blends, dragging, preferred versions, saved-mix reopening, proof sheets, live spacing, export, draft recovery and backup reminders. Generated-page checks exercise the adapted browser scripts. Python checks cover the local server, capture/storage validation and sender rules. Use disposable data for manual testing; keep private handwriting and backups out of commits.

In repository Settings → Pages, choose **GitHub Actions**. The **Publish Handwriting Studio** workflow tests and deploys `docs/` on pushes to `main`. The build copies only named UI files, never local handwriting or backups. When a feature changes, update the relevant Help guide section and tooltips, plus the README overview when needed, rebuild, and check help links before publishing.

### Data model

The public app stores records in IndexedDB; these paths are logical record keys, not files uploaded to a server:

- `<uuid>.json`: notebook schema 2, writer, original strokes and smoothing setting.
- `letters/<uuid>.json`: original capture schema 1 (legacy a–e), 2 (lowercase) or 3 (extended characters); raw strokes, labels, guides, order and separately processed samples.
- `letter_reviews/<capture-id>.json`: separate inclusion, baseline, optional scale and optional stroke-order/direction settings for original captures or saved blends.
- `blends/<uuid>.json`: derived schema 4, 5 or 6; source IDs/shifts, weights and blended strokes, without replacing originals. Schema 5 also freezes source size factors; schema 4 implies 100%. Schema 6 additionally freezes each source’s stroke permutation and reversal flags. Older blends imply the original stroke sequence, independent of current reviews.
- `alphabets/<encoded-writer>.json`: preferred character choices for that writer; schema 1 stores one ID per character, schema 2 stores ordered lists.
- `character_spacing/<encoded-writer>.json`: schema 1; per-character before/after spacing at 5 mm writing size.
- `compositions/<uuid>.json`: schema 1 stores title, update time, text, writer and layout/source settings, including optional sample-order and variation seed; schema 2 also stores a validated path-only A4 SVG drawing; schema 3 stores an array of 1–20 validated A4 drawings. Optional `page_layout` settings hold margins, alignment and paragraph gap. Save updates this record; Save a copy creates another.

Capture coordinates are 1000 × 500 with Y down and timestamps measured from first contact. Raw time, pressure, tilt, coordinates and stroke order are preserved where available. Validation checks records, finite values, bounds, chronology, cell assignment and source references. Original captures and blends are immutable; review settings, stroke corrections and preferences update separately. Finished compositions retain SVG snapshots for all pages independently of source changes. Imported drawings accept only the app’s path-only A4 format, finite in-bounds coordinates, and no executable content. Browser writes/imports use transactions. Retrying a sheet or blend save uses the same identifier; different content under an existing ID is rejected.

## Older local Mac app

The current features above describe the **public website**. The original Flask server remains available for lowercase capture, review, composition, free writing and calibration. It uses local `data/` files and fixed lowercase capture groups. It does not offer the browser app’s extended capture groups, single-character blend workspace, preferred alphabet, letter-size adjustment, saved compositions or browser Backup / Import. Its composition limits and sample controls differ from the public app. Do not copy newer browser records directly into its data folder.

For everyday local use, double-click **Start Handwriting Studio.command**. It runs `launch_handwriting_studio.py`, starts or reuses this app on port 8766, and opens Capture. A server started by the launcher continues after its Terminal window closes; logs go to `logs/server.log`. The earlier port-8765 app and its data are separate.

For first-time setup, use Python 3.10+ from the repository:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python app.py --host 0.0.0.0 --port 8766
```

Open `http://127.0.0.1:8766/` on the Mac, or the Mac’s current local IP address with port 8766 on an iPad on the same private Wi-Fi. `127.0.0.1` means the device opening the link; it does not launch an app from GitHub. Use the public website link at the top for normal browser use. The local server is unauthenticated and should not be exposed to the internet. Stop a foreground server with Control-C.

Keep the repository and its `data/` folder available when using a local launcher. `python3 launch_handwriting_studio.py` can also start the local app; `--no-browser` checks/starts it without opening a browser, and `--port` changes its port. It leaves unrelated services untouched and does not install dependencies. Use the launcher instead of opening `static/` HTML files directly.

## Export local handwriting to the public app

From the repository folder:

```sh
python3 scripts/export_backup.py --output ~/Desktop/handwriting-studio-backup.json
```

Import the file through the public app’s **Backup / Import**. Export does not change the original local data. Keep private handwriting, backups and plotting jobs out of commits. Newer browser-only records cannot be copied into the legacy server’s data folder.

## Mac G-code sender

See [Sending G-code from the Mac](README.md#sending-g-code-from-the-mac) for the commands. The repository sender validates the entire Studio file, rejects coordinates outside A4, and requires an idle controller at X0 Y0 with zero work offset. It does not home automatically. Each command needs an acknowledgement; the sender then checks physical completion at home with the pen raised.

The calibrated T-A4 profile is A4 portrait, 210 × 297 mm, with home at the paper’s top-left: **+X right, −Y down; Z0.5 up, Z5 down**. Drawing uses 900 mm/min, travel 2400 mm/min and serial 115200 baud. The owner verified the calibration on 8 October 2026; the [help guide](https://gwb2025.github.io/handwriting-studio/help.html#calibration) describes the checks. These commands are specific to that setup, not a universal plotter profile.

The default port is `/dev/cu.usbmodem201912341`; use `--port` to override it. If pyserial is unavailable, install `requirements-plotter.txt` in your Python environment. The sender also supports the existing Inkscape serial dependency on the configured Mac. A lock prevents simultaneous Studio senders.

**Ctrl+C requests feed hold** when connected. A lost USB connection may prevent that request reaching the machine. Check the plotter locally if it keeps moving. The repository sender has no automatic reconnect or resume: restarting sends the whole file. Do not assume a controller’s coordinates survived a disconnection; check and home the machine before a deliberate new run. “All commands accepted” means the controller has received the job, not that movement has finished.
