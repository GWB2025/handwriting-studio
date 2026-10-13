# Development and local setup

[README](README.md) · [Public help guide](https://gwb2025.github.io/handwriting-studio/help.html)

The public GitHub Pages app is the current version. The Flask server described below is a legacy option with fewer features.

## Build, test and publish

`web/engine.js` contains browser capture, normalisation, blend and composition rules. `web/browser-api.js` supplies the browser storage adapter using IndexedDB. `web/recovery-store.js` uses a separate local database for recovery copies and confirmed backup manifests; these housekeeping records never enter handwriting backups. `web/recovery.js` provides the shared recovery controls. Shared screens and interaction code are in `static/`; browser-only pages and features are in `web/`. `web/capture.html` and `web/capture-layout.*` provide the compact public capture screen, focus mode and dialog panels. The shared capture scripts call optional layout hooks; the legacy server retains its earlier layout. Guide labels sit outside the canvas, and both normal and focus views keep the same 1000 × 500 capture mapping. `web/help.html` is the public help source. `scripts/build_pages.py` builds nine working screens and the help guide into `docs/`, with relative links and hashed asset URLs. It adapts public instructions separately from the older Mac server. Edit source files and rebuild rather than editing generated `docs/` pages directly.

```sh
npm ci --ignore-scripts
npm run build
npm test
STUDIO_PAGES_TEST=1 node --test tests/test_composer.cjs tests/test_viewport.cjs tests/test_review.cjs tests/test_compositions_ui.cjs tests/test_character_spacing_ui.cjs tests/test_recovery.cjs tests/test_proof_ui.cjs
# With the Python app dependencies installed:
python3 -m unittest discover -s tests
```

Node checks cover capture, browser storage/import, review, composition, saved blends, dragging, preferred versions, saved-mix reopening, proof sheets, live spacing, export, draft recovery and backup reminders. Generated-page checks exercise the adapted browser scripts. Python checks cover the local server, capture/storage validation, the plotting API and simulated serial operation, including pause, cancellation and reconnection. They never open the physical USB port. Use disposable data for manual testing; keep private handwriting and backups out of commits.

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

## Mac plotting window

The public app’s Plotter page explains the local companion. In the repository on the USB-connected Mac, double-click **Start Plotter.command**, or run `python3 launch_plotter.py`. The launcher selects an existing Python environment with Flask, starts `plotter_app.py` on **127.0.0.1:8767**, and opens the plotting window. `--no-browser` starts/checks it without opening a tab; `--port` chooses another local port. Existing unrelated services are left alone. This is separate from the legacy handwriting server on port 8766.

For first-time setup:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt -r requirements-plotter.txt
python3 launch_plotter.py
```

`plotting.py` owns validation, preview geometry, estimates and the serial worker. `plotter_app.py` serves only the plotting screen/assets and its API. It binds to loopback, checks the Host and request origin, and requires a per-session token on API requests. The public page never probes localhost or opens USB. The companion does not expose the handwriting database or a general-purpose G-code console.

The window uses `web/plotting.html`, `web/plotting.css` and `web/plotting.js`, built into `docs/`. After source changes, run `npm run build`; restart the local companion only after its current job is finished. The launcher log is `logs/plotter-server.log`. `logs/plotter-state.json` records the latest job fingerprint, progress and reported position; it is diagnostic, not an automatic resume file. Closing the tab leaves the sender running. Reopening shows its current job; restarting the process requires a new file selection and never resumes prior movement automatically.

## Mac G-code sender

[The README](README.md#sending-g-code-from-the-mac) gives the command-line form. Both the window and `scripts/send_plot.py` use the same validator and serial worker. Files are limited to 32 MB and 600,000 supported commands, with millimetres, explicit absolute moves, A4 bounds, the calibrated pen heights, and a final pen-up home. Unknown commands are rejected. Preview paths are built from validated numbers, never from uploaded SVG/HTML.

The calibrated T-A4 profile is A4 portrait, 210 × 297 mm, with home at the top-left: **+X right, −Y down; Z0.5 up, Z5 down**. Drawing uses 900 mm/min, travel 2400 mm/min and serial 115200 baud. The owner verified this calibration on 8 October 2026. This is a specific DrawCore profile, not a universal plotter controller.

USB discovery recognises the verified vendor/product family and records the selected unit’s serial identity. The Mac window requires its own Home check before Start. The command-line `--run` option retains the requirement that the operator has already physically homed the plotter. Both check an idle home, zero work offset and millimetre/absolute/feed-per-minute modes before drawing. Neither changes firmware settings. The default CLI port is `/dev/cu.usbmodem201912341`; override with `--port`. pyserial is loaded only when needed, with the existing Inkscape dependency as a fallback. A shared process lock prevents simultaneous Studio senders.

**Pause** requests GRBL feed hold, waits for a stopped report and keeps the current job. **Continue** resumes that buffer. **Cancel** (or Ctrl+C in the CLI) holds motion, clears queued commands with a reset, and raises the pen if the controller is idle. If an alarm or unavailable USB prevents this, inspect the machine locally. Cancellation invalidates home and cannot be resumed. Home is never run as a recovery action.

After connection loss, the worker makes up to three attempts to reconnect to the same USB identity. It waits for queued motion to finish and checks modes, zero offset, reset indicators and the last acknowledged/pending command endpoints. Only an unambiguous match can continue. Partial writes, reset controllers, changed modes, unresolved paused movement or ambiguous positions stop the job. The worker never blindly resends a command or restarts the drawing. Reconnection support does not guarantee that every dropped connection can be recovered.

Completion means **Idle at X0 Y0 with Z0.5**, after all commands are acknowledged. The time estimate is a minimum based on travel, drawing and dwell; it excludes acceleration and connection/pausing overhead. See the [GRBL command reference](https://github.com/gnea/grbl/wiki/Grbl-v1.1-Commands) and [interface reference](https://github.com/gnea/grbl/wiki/Grbl-v1.1-Interface) for protocol semantics. The vendor’s installed DrawCore extension also uses `$H` for homing.

## Practical iPad-to-paper check

Automated checks use disposable handwriting and a simulated controller. Before treating a release as hardware-tested:

1. On the iPad, capture letters with a dot and crossbar, review their baseline and scale, and drag two- and four-source blends. Confirm scrolling and Pencil input on that device.
2. Preview a passage at 3, 5, 8, 12 and 20 mm. Export each desired page and compare its geometry with the Mac plotting preview.
3. Download and confirm a backup. Import into a separate empty browser profile; check sample counts, saved blends, preferences and a saved finished composition. Preserve the original browser data.
4. With the plotter prepared, run a small calibration job through the Mac window. Check Pause/Continue, then test Cancel and Home on a separate short job. Compare the plotted dimensions with the SVG. Simulated recovery tests do not require deliberately unplugging a moving machine.

Record device, browser, firmware and the observed result. The current implementation was checked without sending physical movement commands.
