# Handwriting Studio

[Open the public app](https://gwb2025.github.io/handwriting-studio/) · [Read the help guide](https://gwb2025.github.io/handwriting-studio/help.html)

Current public website documentation · updated 9 October 2026.

Handwriting Studio captures your handwriting, reviews and blends individual characters, and composes A4 pages for SVG export or a pen plotter. The website runs in Safari or Chrome, including on an iPad. No Mac server, Python setup or login is needed to use it. **Help guide** on each screen opens the relevant instructions in a separate tab; **Show help** on Capture and Free writing provides short instructions in place.

**Writing is saved in this browser on this device.** It is not uploaded to GitHub and does not automatically sync between devices. Use **Backup / Import** regularly. Save your current sheet or page before refreshing: unsaved drafts are not restored or included in backups.

## Current workflow

1. **Capture** lowercase, uppercase, numbers, punctuation and symbols, or common joined pairs. Repeat sets to collect variations.
2. **Review samples** to include/exclude individual originals or saved blends and adjust baseline placement.
3. **Blend a character** from two or four different original captures by dragging the live result towards its sources. Save the result as a new sample.
4. **My alphabet** shows coverage, original/blend counts and preferred versions for each writer and group.
5. **Alphabet proof sheet**, opened from My alphabet, tests your chosen characters and an optional sentence at physical writing sizes. **Compose** adds live letter spacing, word spacing and line-gap controls. Both export A4 SVG or plotter G-code.
6. **Calibration** provides the verified A4 checking procedure and downloadable stages. Send G-code from the Mac connected to the plotter.

**Free writing** and **Saved pages** are also available through Capture’s Show help and the Help guide. They store notebook pages separately from labelled character samples.

## Capture

Enter a writer name, tap **Done**, and choose a capture type. Use the same name for repeated sets belonging to the same person; names identify separate collections, not signed-in accounts. Practice is optional and is not saved. **Start capture** opens the next unsaved sheet for that writer and type.

Write one labelled character per box with a Pencil or mouse. Fingers can use controls but do not draw on Capture or Free writing. Keep all strokes, including dots and crossbars, in their own box. The app assigns strokes by box; it does not recognise whether you wrote the correct character.

Each set covers every character in its group once, with shuffled positions. Lowercase uses six sheets for all 26 letters; other groups show their own sheet count. Saved orders preserve the labels when resuming or importing. Finish the current set before changing capture type. **Capture another set** adds more examples: two complete sets provide two originals per character, and four provide four.

**Save sheet** advances only after storage confirms the save. Undo/Redo and Clear sheet affect the current draft. Missing boxes, tiny marks or strokes crossing between boxes produce an explanation and leave the draft in place. The writer name is fixed during a set; save the current sheet and reopen Capture to change it. Reopening resumes saved progress, not unsaved strokes.

For f, g, j, p, q and y, keep the body on the baseline and tails below. These lowercase letters retain the drawn baseline; other lowercase letters settle onto the baseline using their lowest point. Capitals, numbers, punctuation and joined pairs retain the drawn baseline. Write capitals near the tall-letter guide and joined pairs as connected shapes.

**Baseline**, **Small letters**, **Tall letters**, **Tails** and **Shading** can be shown independently. Labels and dividers remain visible. **Gentle smoothing** changes the display/export without rewriting original points. The writing surface suppresses scrolling, pinching and selection during capture; the other screens can be scrolled normally.

## Review samples

Choose a writer, group and character, then an example from the newest-first list. Original captures and saved blends share this workflow, with blends labelled separately.

- **Use this sample in composition** includes or excludes that example. Excluded originals are also unavailable as blend sources. Exclusion is reversible and does not delete a sample.
- **Baseline shift (mm)** moves a character down for positive values and up for negative values, from −10 to +10 mm. The preview uses Medium (5 mm); the offset applies as the same physical distance at every Compose size. It does not resize a character.
- **Save changes** confirms the choice and refreshes the preview. **Reset changes** discards pending edits. Save or reset before switching samples.

Review settings are separate from original captures. Generate a fresh Compose preview after reviewing. Saved blends retain the source adjustments used when they were created; later changes to an original do not remake existing blends.

## Blend a character

The workspace follows the letter-level workflow shown around 22–24 minutes in Dan Catt’s video. It mixes different captures of one character, such as two versions of “a”.

1. Choose **Save under writer**, the character and **Two** or **Four** sources.
2. The app looks for compatible included originals when you change character, source pool or source count. You can change any source yourself. If sets were captured under separate writer names, select **Source pool → All saved writers / sets**. The menus identify each source’s writer, date and sample. This does not merge writers or rename captures.
3. Selecting a sample already used by another source swaps the two selections. If there are too few originals, the remaining slots are disabled and the page reports what is needed. Saved blends do not count as originals and cannot be used as further blend sources.
4. Drag the **green-bordered blended character** with a finger, Pencil or mouse. With two sources it moves horizontally between A and B. With four it moves in two dimensions between A/B above and C/D below. Moving towards a source increases that source’s contribution immediately.
5. **Save blended sample** saves the displayed result under the chosen writer, ready for Review, My alphabet and Compose. Source captures remain unchanged.

After saving, a confirmation panel shows the character, destination writer and a preview. **Use as preferred** selects that saved result for the writer immediately. **View saved blend** opens its character in My alphabet and highlights the saved sample. **Blend next character** moves to the next character in the current list, wrapping at the end, and centres the mix. Save before moving on if you want to keep the current result.

**Saved versions → Reopen source mix**, or **Reopen source mix** on a blend in My alphabet, restores the source captures, their stored baseline adjustments and the saved blend position. Drag to adjust, then save a new version. The existing blend stays unchanged. Later Review adjustments on that saved blend are separate and are not applied to the reopened source mix. Excluded or missing source originals must be made available before reopening. Changing source selections switches to their current Review adjustments.

The draggable result has a **transparent background**, so sources remain visible underneath. Blending no longer uses horizontal or vertical sliders. **Centre blend** returns to equal contributions. Arrow keys adjust the focused result by 1%; Shift + arrow keys use 10% steps. Up/down apply to four sources.

**Show guides** is off by default. **Preview size** enlarges the display from 100% to 200% and does not change the saved character size. Scroll or swipe outside the draggable result to navigate an enlarged preview. Fixed preview dimensions and in-place path updates avoid rebuilding the page during a drag.

### Normalisation and compatibility

Original samples are translated to their left edge and appropriate baseline without forcing equal letter heights. The blend resamples each stroke to 64 evenly spaced points, then combines corresponding points. Sources need matching stroke counts, order and direction, and sufficiently similar shapes. The comparison allows size and dot-position variation relative to both letter height and width. Incompatible sources cannot be saved as a blend; the message identifies the conflicting source pair and the reason. **Find compatible sources** searches for another pair or quartet in the current pool, favouring your current choices. It checks every pair in a quartet and leaves manual choices alone until you request a search or change character, pool or source count. Reopening a saved mix restores its exact sources. A large library may reach the search limit; try another source pool or two sources if no quartet is found. For dotted or crossed letters, use a consistent stroke order when capturing. Inspect a compatible blend visually before saving; there is no automatic stroke reordering or manual point editor.

For four sources, weights are `(1-h)(1-v), h(1-v), (1-h)v, hv`, where `h` and `v` range from 0 to 1. The centre gives 25% per source; a corner gives 100% to that source. Two sources use `1-h, h`. Baseline adjustments are blended with the same weights.

Saved blends record their source IDs, source baseline shifts and weights. Backup import validates the result against those original sources. Retrying the same blend save keeps one record.

## My alphabet and preferred versions

Choose a writer and group to see included original counts, saved-blend counts, missing characters and preferred versions. Select a character to compare its samples, then choose **Use as preferred** on an included original or blend. Choices save immediately. **Clear preferred version** restores normal selection for that character. An excluded preferred sample is shown as unavailable and is never used.

**Preview size** enlarges the alphabet tiles and sample cards from 100% to 300%; **Reset size** returns to 100%. The display controls stay at the top while you scroll. Previews crop unused guide space and share a frame within each comparison, keeping relative sample sizes visible. **Colour separate strokes** is enabled initially: the first pen stroke is dark, the second blue, and later strokes use other colours (repeating after six). A “t” crossbar is blue when drawn as the second stroke after lifting the pen. Untick the checkbox for one colour. Zoom and colours affect this page only; saved strokes, preferred choices, SVG exports and plotter dimensions stay unchanged.

Preferences belong to that writer and do not change the samples. In Compose, **Use preferred versions when available** is enabled by default. A preferred sample is used for every occurrence only if it is included and matches the selected source type. Otherwise normal selection applies within the allowed samples. Turn the option off to cycle through variations.

## Alphabet proof sheet

Open **Alphabet proof sheet** from **My alphabet**. It starts with that writer and group. Choose originals, saved blends or both, and Small (3 mm), Medium (5 mm) or Large (8 mm). The proof uses an included preferred version when allowed by the source type; otherwise it uses the newest included sample. It shows the available characters in group order followed by an optional test sentence.

Missing group characters are listed and omitted from the character row. A test sentence requiring unavailable characters reports the missing samples and prevents export; edit it or leave it blank. The initial sentence uses the lowercase pangram when all lowercase letters are available, otherwise a short selection of available characters. Edited text is preserved across setting changes. Settings and sentence edits update the preview automatically; **Refresh preview** also reloads saved choices.

Download `alphabet-proof-a4.svg` or `alphabet-proof-a4.gcode`. Both contain the displayed handwriting on A4 with 20 mm margins, using the existing calibration. The screen fits the page to the display; exported dimensions are physical millimetres. Print SVG at 100% without fit-to-page. This page generates downloads and does not send commands to the plotter.

## Compose and export

Choose a writer and type text using captured lowercase, capitals, digits and supported punctuation, plus spaces and line breaks. The initial example uses available characters; text you have edited is preserved when settings change. The limit is 2,000 characters, all of which must fit on one A4 page.

**Use** selects **Original samples only**, **Saved blends only**, or **Originals and saved blends** (default). Saved-blends-only reports missing blends instead of silently substituting originals. Compose uses saved samples; create and save blends in the separate blending workspace.

**Samples** chooses Latest three per letter (default), Latest four per character, Latest only, or All saved. Unless an eligible preferred version is enabled, repeated characters cycle through this pool, newest first. Excluded samples are skipped. Selection is deterministic for unchanged settings and data.

**Use saved joined pairs** replaces matching pairs where an allowed sample exists; otherwise composition uses the individual characters. Pair samples follow the same source, inclusion and preference rules. Supported pairs are `th he in er an re on at en nd oo fi of tt`. This is not automatic cursive joining between arbitrary letters.

Small/Medium/Large refer to the capture guide’s small-letter height (3/5/8 mm), retaining natural proportions. A review baseline shift is applied as a physical offset afterwards. Gentle smoothing uses midpoint curves without rewriting raw strokes. Neighbouring stroke shapes help determine spacing; whole words wrap at the right margin. An oversized word or overflowing page prompts a smaller writing size or less text rather than clipping.

**Letter spacing**, **Word spacing** and **Line gap** range from 50% to 200%, with 100% preserving the normal layout. Letter spacing changes the distance between character starts; word spacing changes the space width; line gap changes the clearance between lines. Character shape and writing size stay unchanged. Tight letter spacing can overlap characters, so inspect the preview. **Reset spacing** restores all three to 100%.

After the first generated preview, spacing changes update it automatically. The previous image remains visible while updating, with SVG and G-code downloads disabled until the new result is ready. If wider spacing makes the text overflow, reduce spacing, size or text. Other setting changes still require Generate preview. Spacing settings belong to the current Compose session; they do not edit stored handwriting.

**Generate preview**, then **Download A4 SVG** or **Download plotter G-code**. SVG exports the displayed drawing on A4 portrait (210 × 297 mm) with 20 mm margins, one unfilled line path per pen stroke, in captured order and direction, with nominal width 0.3 mm. The G-code follows the same preview; curves are flattened within 0.02 mm and dots receive a brief dwell.

Changes to text, settings, captures, reviews or preferences invalidate stale previews and disable downloads until regenerated. Returning to the tab checks for changed samples. If that check fails, an already displayed preview remains downloadable. Downloads are named `composed-handwriting-a4.svg` and `composed-handwriting-a4.gcode`.

## Backup and import

Use **Backup / Import → Download backup** to keep a JSON copy of saved captures, blends, review choices, alphabet preferences and free-writing pages. Save drafts first. Transfer this file to another device and import it there; there is no automatic cloud sync.

Import validates all records and references before adding anything. Identical records are skipped. Conflicting versions of an existing record reject the entire import without overwriting work. Keep both backups and use a separate browser/profile with no Studio data to inspect the other version. Do not clear current writing to resolve a conflict. Refresh samples or reopen Capture after import. The file limit is 100 MB.

Clearing website data, private browsing or changing browser/device can make writing unavailable. The app requests persistent storage where supported, but backups are still needed. GitHub Pages hosts the application files, not your handwriting.

To copy existing local Mac handwriting into the website without changing the original data, run from the repository:

```sh
python3 scripts/export_backup.py --output ~/Desktop/handwriting-studio-backup.json
```

Import that file through the website. Older supported capture backups remain compatible with the public app; the older Mac server does not support the newer browser-only records.

## Free writing and Saved pages

**Free writing** opens a notebook separate from labelled capture. Enter a name, write with a Pencil or mouse, then **Save page**. **Download SVG** exports the current page at 200 × 100 mm. Gentle smoothing affects the drawing/export only.

**Saved pages** lists free-writing pages newest first and filters by writer. Choose a page, preview it, then **Open this page**. Opening restores original strokes and smoothing; saving edits creates a new copy. A warning protects an unsaved draft, including strokes held in redo history. Undo/Redo preserve original point data; new writing or Clear empties redo history. Notebook pages are not used as character samples by Compose.

## Verified plotter calibration

The owner physically verified the A4 procedure on 8 October 2026. Home is the paper’s top-left corner: **+X right, −Y down; Z0.5 pen up, Z5 pen down**. Drawing speed is 900 mm/min and the Mac USB connection uses 115200 baud.

On **Calibration**, download and run these stages on one fixed A4 portrait sheet:

1. Shapes with pen up, to check movement.
2. Pen down, then up, with no X/Y movement.
3. Draw shapes.
4. Add dimensions.
5. Mark page centre.

After the movement and pen checks, the combined drawing stage can produce shapes, dimensions and centre together. Measure the 170 × 257 mm rectangle with 20 mm margins, 160 mm diameter circle, and 150 × 210 mm triangle. The 6 mm cross is centred at X105 Y−148.5: 105 mm from the left and 148.5 mm from the top.

Downloads use millimetres and absolute coordinates, lift between strokes and finish pen up; drawing stages return to X0 Y0. The page checks the setup; it does not modify firmware calibration or connect to USB.

## Sending G-code from the Mac

Transfer the downloaded G-code to the Mac connected to the plotter. Place the paper, home at its top-left corner and raise the pen. From the repository folder:

```sh
# Check the file without opening a connection:
python3 scripts/send_plot.py ~/Downloads/composed-handwriting-a4.gcode
# Send it once the plotter is prepared:
python3 scripts/send_plot.py ~/Downloads/composed-handwriting-a4.gcode --run
```

Use the relevant downloaded filename for calibration stages. The sender validates the entire file, accepts the Studio command set, rejects coordinates outside A4, and requires an idle controller at X0 Y0 with zero work offset. It does not home automatically. It waits for each acknowledgement and then verifies physical completion at pen-up home. “All commands accepted” is not yet completion.

The default port is `/dev/cu.usbmodem201912341`; override with `--port` if it changes. Install `requirements-plotter.txt` if pyserial is unavailable; the sender can also use the existing Inkscape serial dependency on this Mac. A local lock prevents simultaneous Studio senders. **Ctrl+C requests feed hold** and reports an incomplete job. Check the machine before restarting; restarting sends the whole file, with no resume support.

## Current limits

The public app has no handwriting recognition, individual stroke-point editor, arbitrary cursive joining, multipage layout, direct browser USB control, graphical plotting queue, automatic cloud sync or installed offline mode. It supports the characters offered by Capture and the listed joined pairs. A normal internet connection is used to load the site. Device-specific Pencil/palm behaviour still needs testing on the actual iPad; automated checks cannot establish it.

For missing sources, backup conflicts, stale controls or missing Compose characters, see [Troubleshooting](https://gwb2025.github.io/handwriting-studio/help.html#troubleshooting).

## Development and publishing

`web/engine.js` contains browser capture, normalisation, blend and composition rules. `web/browser-api.js` supplies the browser storage adapter using IndexedDB. Shared screens and interaction code are in `static/`; browser-only pages and features are in `web/`. `web/help.html` is the public help source. `scripts/build_pages.py` builds eight working screens and the help guide into `docs/`, with relative links and hashed asset URLs. It adapts public instructions separately from the older Mac server. Edit source files and rebuild rather than editing generated `docs/` pages directly.

```sh
npm ci --ignore-scripts
npm run build
npm test
STUDIO_PAGES_TEST=1 node --test tests/test_composer.cjs tests/test_viewport.cjs tests/test_review.cjs
# With the Python app dependencies installed:
python3 -m unittest discover -s tests
```

Node checks cover capture, browser storage/import, review, composition, saved blends, dragging, preferred versions, saved-mix reopening, proof sheets, live spacing and export. Generated-page checks exercise the adapted browser scripts. Python checks cover the local server, capture/storage validation and sender rules. Use disposable data for manual testing; keep private handwriting and backups out of commits.

In repository Settings → Pages, choose **GitHub Actions**. The **Publish Handwriting Studio** workflow tests and deploys `docs/` on pushes to `main`. The build copies only named UI files, never local handwriting or backups. When a feature changes, update this README, its Help guide section and nearby control instructions, rebuild, and check help links before publishing.

### Data model

The public app stores records in IndexedDB; these paths are logical record keys, not files uploaded to a server:

- `<uuid>.json`: notebook schema 2, writer, original strokes and smoothing setting.
- `letters/<uuid>.json`: original capture schema 1 (legacy a–e), 2 (lowercase) or 3 (extended characters); raw strokes, labels, guides, order and separately processed samples.
- `letter_reviews/<capture-id>.json`: separate inclusion and baseline settings for original captures or saved blends.
- `blends/<uuid>.json`: derived schema 4; source IDs/shifts, weights and blended strokes, without replacing the originals.
- `alphabets/<encoded-writer>.json`: preferred character choices for that writer.

Capture coordinates are 1000 × 500 with Y down and timestamps measured from first contact. Raw time, pressure, tilt, coordinates and stroke order are preserved where available. Validation checks records, finite values, bounds, chronology, cell assignment and source references. Original captures and blends are immutable; review settings and preferences update separately. Browser writes/imports use transactions. Retrying a sheet or blend save uses the same identifier; different content under an existing ID is rejected.

## Older local Mac app

The current features above describe the **public website**. The original Flask server remains available for lowercase capture, review, composition, free writing and calibration. It uses local `data/` files and fixed lowercase capture groups. It does not offer the browser app’s extended capture groups, single-character blend workspace, preferred alphabet or browser Backup / Import. Its composition limits and sample controls differ from the public app. Do not copy newer browser records directly into its data folder.

For everyday local use, double-click **Start Handwriting Studio.command**. It runs `launch_handwriting_studio.py`, starts or reuses this app on port 8766, and opens Capture. A server started by the launcher continues after its Terminal window closes; logs go to `logs/server.log`. The earlier port-8765 app and its data are separate.

For first-time setup, use Python 3.10+ from the repository:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python app.py --host 0.0.0.0 --port 8766
```

Open `http://127.0.0.1:8766/` on the Mac, or the Mac’s current local IP address with port 8766 on an iPad on the same private Wi-Fi. `127.0.0.1` means the device opening the link; it does not launch an app from GitHub. Use the public website link at the top for normal browser use. The local server is unauthenticated and should not be exposed to the internet. Stop a foreground server with Control-C.

The local repository, handwriting and `.venv` for this setup are on `/Volumes/EXTRA Apps/Documents/Writing Robot T-A4/handwriting-studio-v2`; keep that drive connected. The Desktop launcher points there. `python3 launch_handwriting_studio.py` can also start the local app; `--no-browser` checks/starts it without opening a browser, and `--port` changes its port. It leaves unrelated services untouched and does not install dependencies. Use the launcher instead of opening `static/` HTML files directly.

## Acknowledgement

Inspired by **[Dan Catt](https://revdancatt.com/projects)** and the workflow in [his handwriting video](https://www.youtube.com/watch?v=nD3XlqFhcEI), including guided practice, repeated samples, changing capture positions and blending around 22–24 minutes. His [Generative Handwriting project diary](https://revdancatt.com/projects/Generative%20Handwriting/dev-diary) provides further context. Handwriting Studio is an independent implementation for the 2D Pen Plotter project.
