# Handwriting Studio

[Open the public app](https://gwb2025.github.io/handwriting-studio/) · [Read the help guide](https://gwb2025.github.io/handwriting-studio/help.html)

Current public website documentation · updated 10 October 2026.

Handwriting Studio captures your handwriting, reviews and blends individual characters, and composes A4 pages for SVG export or a pen plotter. The website runs in Safari or Chrome, including on an iPad. No Mac server, Python setup or login is needed to use it. **Help guide** on each screen opens the relevant instructions in a separate tab; **Show help** on Capture and Free writing provides short instructions in place.

**Writing is saved in this browser on this device.** It is not uploaded to GitHub and does not automatically sync between devices. Use **Backup / Import** regularly. Automatic recovery keeps local copies of unfinished capture, free writing and Compose edits. Reopening offers Restore draft or Discard draft. Save restored work normally before backing up; recovery copies are not included in backups.

## Current workflow

1. **Capture** lowercase, uppercase, numbers, punctuation and symbols, or common joined pairs. Repeat sets to collect variations.
2. **Review samples** to include/exclude individual originals or saved blends, adjust their size and baseline, and compare a short word live.
3. **Blend a character** from two or four different original captures by dragging the live result towards its sources. Save the result as a new sample.
4. **My alphabet** shows coverage, original/blend counts and preferred versions for each writer and group.
5. **Alphabet proof sheet**, opened from My alphabet, tests your chosen characters with pangrams or longer passages at physical writing sizes. **Compose** adds live spacing, margins, alignment and paragraph-gap controls. Both support automatic page breaks and export A4 SVG or plotter G-code.
6. **Calibration** provides the verified A4 checking procedure and downloadable stages. Send G-code from the Mac connected to the plotter.

**Free writing** and **Saved pages** are also available through Capture’s Show help and the Help guide. They store notebook pages separately from labelled character samples.

## Capture

Enter a writer name, tap **Done**, and choose a capture type. Use the same name for repeated sets belonging to the same person; names identify separate collections, not signed-in accounts. Practice is optional and does not become a saved character sample; its unfinished strokes can have a local recovery copy. **Start capture** opens the next unsaved sheet for that writer and type.

Write one labelled character per box with a Pencil or mouse. Fingers can use controls but do not draw on Capture or Free writing. Keep all strokes, including dots and crossbars, in their own box. The app assigns strokes by box; it does not recognise whether you wrote the correct character.

Each set covers every character in its group once, with shuffled positions. Lowercase uses six sheets for all 26 letters; other groups show their own sheet count. Saved orders preserve the labels when resuming or importing. Finish the current set before changing capture type. **Capture another set** adds more examples: two complete sets provide two originals per character, and four provide four.

**Save sheet** advances only after storage confirms the save. Undo/Redo and Clear sheet affect the current draft. Missing boxes, tiny marks or strokes crossing between boxes produce an explanation and leave the draft in place. The writer name is fixed during a set; save the current sheet and reopen Capture to change it. Reopening resumes saved progress and offers any unfinished recovery copies. Restore a capture draft to keep its exact shuffled labels, sheet position and strokes.

For f, g, j, p, q and y, keep the body on the baseline and tails below. These lowercase letters retain the drawn baseline; other lowercase letters settle onto the baseline using their lowest point. Capitals, numbers, punctuation and joined pairs retain the drawn baseline. Write capitals near the tall-letter guide and joined pairs as connected shapes.

**Baseline**, **Small letters**, **Tall letters**, **Tails** and **Shading** can be shown independently. Labels and dividers remain visible. **Gentle smoothing** changes the display/export without rewriting original points. The writing surface suppresses scrolling, pinching and selection during capture; the other screens can be scrolled normally.

## Review samples

Choose a writer, group and character, then an example from the newest-first list. Original captures and saved blends share this workflow, with blends labelled separately.

- **Use this sample in composition** includes or excludes that example. Excluded originals are also unavailable as blend sources. Exclusion is reversible and does not delete a sample.
- The vertical **Position** slider sits beside the preview. Slide up to raise the letter or down to lower it, by up to 10 mm. The readout says how far up or down it sits, and the preview moves immediately against fixed guide lines at Medium (5 mm). The whole character, including dots and crossbars, stays centred horizontally in the preview. **Original baseline** returns to zero offset; save to keep it. Arrow keys adjust by 0.1 mm, or 1 mm with Shift. The offset applies as the same physical distance at every Compose size; preview centring does not alter saved writing or composition spacing.
- **Letter size** adjusts this sample from 50% to 200%, scaling height and width together around its original baseline. The preview updates immediately; **Original size** returns to 100%. **Try a short word** compares the pending adjustment with your other saved characters at Medium (5 mm). Edit the suggested word if it needs characters you have not captured. This preview always includes the selected sample, even while reviewing an excluded one; it does not save changes or change preferences.
- **Preview size** enlarges the display from 100% to 300% without resizing the saved letter. **Colour separate strokes** starts on; **Show numbered stroke starts** optionally labels where each stroke begins, in its current reviewed order. These inspection controls do not affect exported writing.
- **Correct stroke order and direction** lets you select a stroke, **Move earlier**, **Move later**, or **Reverse direction**. The preview updates its colours and numbered starts. **Undo stroke change** steps back through up to 50 changes in the current review; **Original order and directions** restores the saved sample’s original sequence.
- **Save changes** stores inclusion, letter size, position and stroke corrections. **Reset changes** restores all saved settings. Save or reset before switching samples.

Review settings are separate from original captures. Saved letter sizes apply in My alphabet, new blends, proof sheets and Compose. Original strokes are kept, and 100% restores the original size. This is a manual, proportion-preserving adjustment, not automatic equalisation of character heights. Generate a fresh Compose preview after reviewing. Saved blends retain the source sizes, positions and stroke corrections used when they were created; later changes to an original do not remake existing blends.

Stroke corrections are separate from the original points, timestamps and sensor data. Saved corrections apply to that sample in new blends, My alphabet, proof sheets and Compose. They cannot add, delete or join strokes. To blend differently captured letters, match their body/dot/crossbar sequence and drawing direction, save the reviews, then **Refresh originals** in Blend a character. Different stroke counts or very different shapes still need other sources or a new capture. Corrections to a saved blend affect that sample’s future use; its stored source recipe stays unchanged.

## Blend a character

The workspace follows the letter-level workflow shown around 22–24 minutes in Dan Catt’s video. It mixes different captures of one character, such as two versions of “a”.

1. Choose **Save under writer**, the character and **Two** or **Four** sources.
2. The app looks for compatible included originals when you change character, source pool or source count. You can change any source yourself. If sets were captured under separate writer names, select **Source pool → All saved writers / sets**. The menus identify each source’s writer, date and sample. This does not merge writers or rename captures.
3. Selecting a sample already used by another source swaps the two selections. If there are too few originals, the remaining slots are disabled and the page reports what is needed. Saved blends do not count as originals and cannot be used as further blend sources.
4. Drag the **green-bordered blended character** with a finger, Pencil or mouse. With two sources it moves horizontally between A and B. With four it moves in two dimensions between A/B above and C/D below. Moving towards a source increases that source’s contribution immediately.
5. **Save blended sample** saves the displayed result under the chosen writer, ready for Review, My alphabet and Compose. Source captures remain unchanged.

After saving, a confirmation panel shows the character, destination writer and a preview. **Use as preferred** adds that result to the writer’s preferred choices without removing other choices. **View saved blend** opens its character in My alphabet and highlights the saved sample. **Blend next character** moves to the next character in the current list, wrapping at the end, and centres the mix. Save before moving on if you want to keep the current result.

**Saved versions → Reopen source mix**, or **Reopen source mix** on a blend in My alphabet, restores the source captures, their stored sizes, baseline adjustments and stroke corrections, and the saved blend position. Older blends restore their original source sizes and uncorrected stroke order. Drag to adjust, then save a new version. The existing blend stays unchanged. Later Review adjustments on that saved blend are separate and are not applied to the reopened source mix. Excluded or missing source originals must be made available before reopening. Changing source selections switches to their current Review adjustments.

The draggable result has a **transparent background**, so sources remain visible underneath. Blending no longer uses horizontal or vertical sliders. **Centre blend** returns to equal contributions. Arrow keys adjust the focused result by 1%; Shift + arrow keys use 10% steps. Up/down apply to four sources.

**Show guides** is off by default. **Preview size** enlarges the display from 100% to 200% and does not change the saved character size. Scroll or swipe outside the draggable result to navigate an enlarged preview. Fixed preview dimensions and in-place path updates avoid rebuilding the page during a drag.

**Colour separate strokes** and **Show numbered stroke starts** work as in Review. The first stroke is dark, the second blue, and later strokes use other colours. Numbered starts help compare stroke order and follow the result as you drag. These inspection aids do not reorder strokes or change exported ink.

### Normalisation and compatibility

Original samples are translated to their left edge and appropriate baseline without forcing equal letter heights. The blend resamples each stroke to 64 evenly spaced points, then combines corresponding points. Sources need matching stroke counts, order and direction, and sufficiently similar shapes. The comparison allows size and dot-position variation relative to both letter height and width. Incompatible sources cannot be saved as a blend; the message identifies the conflicting source pair and the reason. **Find compatible sources** searches for another pair or quartet in the current pool, favouring your current choices. It checks every pair in a quartet and leaves manual choices alone until you request a search or change character, pool or source count. Reopening a saved mix restores its exact sources. A large library may reach the search limit; try another source pool or two sources if no quartet is found. For dotted or crossed letters, use a consistent stroke order when capturing. Inspect a compatible blend visually before saving; stroke order and direction can be corrected manually in Review, while automatic stroke matching and individual point editing are not available.

For four sources, weights are `(1-h)(1-v), h(1-v), (1-h)v, hv`, where `h` and `v` range from 0 to 1. The centre gives 25% per source; a corner gives 100% to that source. Two sources use `1-h, h`. Baseline adjustments are blended with the same weights.

Saved blends record their source IDs, source baseline shifts, source sizes and weights. Backup import validates the result against those original sources. Retrying the same blend save keeps one record.

## My alphabet and preferred versions

Choose a writer and group to see included original counts, saved-blend counts, missing characters and preferred versions. Select a character to compare its samples, then choose **Add to preferred** on one or more included originals or blends. Choices save immediately, in the order added. **Remove from preferred** removes just that choice; **Clear preferred choices** restores normal selection for that character. Existing single preferences remain selected. An excluded preferred sample is shown as unavailable and is never used.

**Preview size** enlarges the alphabet tiles and sample cards from 100% to 300%; **Reset size** returns to 100%. The display controls stay at the top while you scroll. Previews crop unused guide space and share a frame within each comparison, keeping relative sample sizes visible. **Colour separate strokes** is enabled initially: the first pen stroke is dark, the second blue, and later strokes use other colours (repeating after six). A “t” crossbar is blue when drawn as the second stroke after lifting the pen. Untick the checkbox for one colour. Zoom and colours affect this page only; saved strokes, preferred choices, SVG exports and plotter dimensions stay unchanged.

Preferences belong to that writer and do not change the samples. In Compose, **Use preferred versions when available** is enabled by default. Repeated characters use your included preferred choices, provided they match the selected source type. One eligible choice is reused for every occurrence. If none qualify, normal selection applies within the allowed sample pool. Turn the option off to use that pool instead. Preferred choices are not limited by the Latest three/four/only setting.

### Individual character spacing

In **My alphabet**, select a character and use **Spacing for…** to adjust **Before the character** and **After the character** from −2 to +3 mm. These measurements refer to Medium (5 mm) writing and scale proportionally at other writing sizes. Negative values tighten the gap; positive values add space. Tight settings can overlap ink, but character starts keep their left-to-right order. The page margins still apply.

**Try a short word** previews pending spacing using your preferred versions or normal sample pool. **Save spacing** applies it to every version of that character for this writer, in Compose and proof sheets. **Normal spacing** returns both adjustments to zero; save to keep it. **Reset changes** discards pending edits. Save or reset before changing characters. Arrow keys adjust by 0.1 mm, or 0.5 mm with Shift.

These settings do not move or resize the saved strokes or change blend geometry. Joined pairs have their own spacing settings; when a pair is used, the separate letters’ settings do not apply inside it. Generate a fresh Compose preview after saving spacing. Already saved finished drawings remain unchanged.

## Alphabet proof sheet

Open **Alphabet proof sheet** from **My alphabet**. It starts with that writer and group. Choose originals, saved blends or both, and Small (3 mm), Medium (5 mm) or Large (8 mm). The proof cycles through included preferred choices when allowed by the source type; otherwise it uses the newest included sample. It shows the available characters in group order followed by an optional test sentence.

Missing group characters are listed and omitted from the character row. A test sentence requiring unavailable characters reports the missing samples and prevents export; edit it or leave it blank. The initial sentence uses the lowercase pangram when all lowercase letters are available, otherwise a short selection of available characters. Edited text is preserved across setting changes. Settings and sentence edits update the preview automatically; **Refresh preview** also reloads saved choices.

**Test sentences** offers eight pangrams, each using all 26 lowercase letters: The quick brown fox, Pack my box, Sphinx of black quartz, How vexingly quick, The five boxing wizards, Bright vixens, Waltz bad nymph and Jackdaws love. Choose **All eight pangrams** to load them together. Choosing an example replaces the text; **Your own text** keeps it available for editing, and **Automatic example** restores the original behaviour based on available samples.

Choose **Sheet → Text passage** to view a block of writing without the alphabet row. The examples include William Shakespeare’s [Sonnet 18](https://shakespeare.mit.edu/Poetry/sonnet.XVIII.html), with all fourteen verse lines. **Lowercase letters only** omits punctuation so a lowercase collection is sufficient; **Original text** needs the corresponding capital and punctuation samples too. Choosing a passage example opens Text passage automatically. You can edit it or paste your own text. Explicit line breaks are kept and long lines wrap at word boundaries. The group control does not apply to Text passage; the writer, source type, writing size, preferred versions and Review adjustments still apply.

Alphabet sheets and passages continue onto further A4 pages when needed, up to 10,000 characters (including the alphabet row) and 20 pages. Use **Previous page** and **Next page** to inspect them. Each download contains exactly the displayed page. Single-page downloads are `alphabet-proof-a4.svg` / `.gcode`, or `text-proof-a4.svg` / `.gcode` for a passage; longer documents add `-page-1`, `-page-2`, and so on. Download each page separately. Downloads are disabled while updating or when text cannot be laid out, including missing samples or a word wider than the page.

**Natural variation → Off / Subtle / More pronounced** adds gentle changes to word spacing, letter size and line slope/curve, with a live preview. Off is the default and keeps the original geometry. **Try another natural variation** chooses another pattern; refresh, page navigation and amount changes keep the current one while this page is open. Download SVG or G-code to keep the exact proof; proof settings are not saved on closing the page. Natural variation is unavailable in Compare versions, which keeps its fixed comparison layout.

Exports use A4 with 20 mm margins and the existing calibration. The screen fits the page to the display; exported dimensions are physical millimetres. Print SVG at 100% without fit-to-page. This page generates downloads and does not send commands to the plotter.

### Compare originals, blends and preferred choices

Choose **Compare versions** in My alphabet, or **Sheet → Compare versions** on the proof screen. It compares your latest included originals, latest included saved blends, and included preferred choices in three labelled columns at **3, 5 and 8 mm** on one A4 page. Preferred choices cycle in their saved order; each size restarts the same choices. Current Review size/position and individual character spacing apply. Joined-pair substitution is off so individual characters can be compared.

The starting text is `f i j l t z`, `fizz` and `jilt`. Edit it to test other characters or short words, up to six lines and 120 characters. **Crossed boxes mark missing versions**; available characters are still shown and the status lists the gaps. The preferred column requires explicit choices in My alphabet. It does not substitute the newest sample when a preference is missing. Originals and blends ignore preferences so the columns remain distinct.

The columns share baseline placement within each test line. Text wraps within each column at its physical size; if the page or a word does not fit, shorten the text. Labels and missing markers are paths, so SVG and G-code contain the same complete sheet. Downloads are `comparison-proof-a4.svg` and `comparison-proof-a4.gcode`. The page generates files; it does not send them to the plotter.

## Compose and export

Choose a writer and type text using captured lowercase, capitals, digits and supported punctuation, plus spaces and line breaks. The initial example uses available characters; text you have edited is preserved when settings change. The limit is 10,000 characters across up to 20 A4 pages. Whole words continue onto a new page when needed.

### Natural variation

Choose **Off** (the default), **Subtle** or **More pronounced**. After Generate preview, the amount control and **Try another natural variation** update the preview live. Variation works even with one sample per character and is separate from Sample order, which chooses between saved versions.

| Setting | Word-gap variation | Letter-size variation | Line slope | Gentle line curve |
| --- | --- | --- | --- | --- |
| Subtle | Up to ±5% | Up to ±1.5% | Up to ±0.15° | Up to ±0.15 mm |
| More pronounced | Up to ±10% | Up to ±3% | Up to ±0.35° | Up to ±0.35 mm |

Word gaps vary around your Word spacing setting. Whole letters, including dots, crossbars and joined-pair samples, scale together around their reviewed baselines. Nearby sizes and gaps change gradually. Lines share a slight overall slope with slowly varying slope and curve between lines. Extra vertical clearance keeps the varied writing inside the selected margins and keeps lines apart; this can add pages. These effects apply to generated pages and never rewrite saved samples or Review settings.

Changing amount, spacing or layout, or pressing Generate preview, keeps the same pattern for unchanged text and samples. **Try another natural variation** changes the pattern without changing which samples were selected. **Save composition** stores the amount and pattern with the other settings; generating before saving preserves every finished page exactly. Draft recovery and Backup / Import retain the pattern too. Older compositions open with natural variation Off. SVG and G-code use the same finished geometry shown in the preview. Proof sheets offer the same controls for alphabet sheets and text passages.

### Choose samples and layout

**Use** selects **Original samples only**, **Saved blends only**, or **Originals and saved blends** (default). Saved-blends-only reports missing blends instead of silently substituting originals. Compose uses saved samples; create and save blends in the separate blending workspace.

**Samples** chooses Latest three per letter (default), Latest four per character, Latest only, or All saved. Unless an eligible preferred version is enabled, Compose selects from this pool. In sequence mode cycles through it newest first; shuffled mode varies the order. Excluded samples are skipped. Selection is deterministic for unchanged settings and data.

**Sample order → In sequence** keeps that fixed cycle. **Shuffled · avoid repetition** uses each eligible version once per shuffled round, avoiding the same sample on consecutive occurrences of a character when alternatives exist. It respects inclusion, source, preferred choices and the selected pool, including joined pairs. A character with only one eligible version cannot vary; with two, avoiding repetition means alternating them.

**Try another variation** generates a new selection immediately in shuffled mode. Changing spacing, margins or alignment, or pressing Generate preview again, keeps the current selection for unchanged text and samples. **Save composition** stores the variation so reopening a draft can regenerate it from the same library. Generating before saving also preserves the exact drawing independently of later library changes. Older compositions open with In sequence. Shuffling changes sample selection, not letter shapes or sizes.

**Use saved joined pairs** replaces matching pairs where an allowed sample exists; otherwise composition uses the individual characters. Pair samples follow the same source, inclusion and preference rules. Supported pairs are `th he in er an re on at en nd oo fi of tt`. This is not automatic cursive joining between arbitrary letters.

Small/Medium/Large refer to the capture guide’s small-letter height (3/5/8 mm), retaining natural proportions. A review baseline shift is applied as a physical offset afterwards. Saved character spacing scales with writing size and is applied in addition to the general spacing controls. Gentle smoothing uses midpoint curves without rewriting raw strokes. Neighbouring stroke shapes help determine spacing; whole words wrap at the right margin. An oversized word prompts smaller writing, narrower margins or a space. Documents beyond 20 pages must be split or shortened; output is never silently clipped.

**Letter spacing**, **Word spacing** and **Line gap** range from 50% to 200%, with 100% preserving the normal layout. Letter spacing changes the distance between character starts; word spacing changes the space width; line gap changes the clearance between lines. Character shape and writing size stay unchanged. Tight letter spacing can overlap characters, so inspect the preview. **Reset spacing** restores all three to 100%.

After the first generated preview, spacing and page-layout changes update all pages automatically. The previous image remains visible while updating, with SVG and G-code downloads disabled until the new result is ready. Wider spacing may add pages. If a word cannot fit or the document exceeds 20 pages, reduce spacing, size or text. Other setting changes still require Generate preview. Spacing settings do not edit stored handwriting and can be kept in a saved composition.

**Page layout** sets each margin independently from 20 to 60 mm. The 20 mm minimum preserves the verified plotting area. **Alignment** places each line left, centre or right within those margins. **Extra paragraph gap** adds 0–30 mm after a blank line between paragraphs; one line break starts a new line without that extra gap. **Reset page layout** restores 20 mm margins, left alignment and no extra paragraph gap. Leading/trailing blank lines do not create empty pages, and extra blank space at a page break is discarded. Letter variants continue through page breaks without restarting.

**Generate preview**, then use **Previous page**, **Preview page** or **Next page** to inspect the document. **Download A4 SVG** and **Download plotter G-code** export only the selected page. SVG exports on A4 portrait (210 × 297 mm) with your chosen margins, one unfilled line path per pen stroke, in captured order and direction, with nominal width 0.3 mm. The G-code follows the same preview; curves are flattened within 0.02 mm and dots receive a brief dwell.

Changes to text, settings, captures, reviews, character spacing or preferences invalidate fresh previews and disable downloads until regenerated. Reopened finished drawings retain their saved output when the handwriting library changes; editing the composition or choosing Generate preview switches back to current handwriting. Returning to the tab checks for changed samples. If that check fails, an already displayed preview remains downloadable. Single-page downloads are named `composed-handwriting-a4.svg` and `composed-handwriting-a4.gcode`. Documents with several pages use numbered names such as `composed-handwriting-a4-page-02-of-03.gcode`. Download each page separately. Finish plotting one file and fit a fresh sheet at the same top-left home before sending the next file. Pages are separate jobs; the app does not feed paper or send files automatically.

### Save and reopen compositions

In Compose, give the document a name under **Saved compositions**, then tap **Save composition**. This keeps its text, writer, writing size, smoothing, sample pool, source type, preferred-version and joined-pair options and all three spacing settings, plus margins, alignment and paragraph gap. Save updates the current composition; **Save a copy** keeps a separate version. You can save a draft before generating a preview.

**Generate preview before saving** to keep every finished page exactly alongside the text and settings. The list labels entries **Finished drawing**, **Finished document · N pages** or **Draft**. Choose one and tap **Open composition**; confirm replacement if there are unsaved edits. A finished document opens immediately with all pages available and SVG and G-code downloads ready, even if its source handwriting is no longer present. Later review, spacing, preference or capture changes do not remake that drawing.

**Generate preview** deliberately replaces the displayed drawing using your current saved handwriting and settings. Editing composition controls invalidates the old output; live layout updates keep the previous image visible while rebuilding. Generate again before updating a finished document, or **Save a copy** to keep edited settings as a separate draft. This prevents a draft from silently removing the existing finished drawing. Older settings-only compositions remain supported and require Generate preview after opening. Older single-page drawings also reopen unchanged. Browsing pages does not count as an edit.

Saved compositions and their finished drawings stay in this browser and are included in Backup / Import. Snapshots retain the exact SVG geometry of every page; G-code is generated from that geometry using the app’s plotter settings. The saved-record limit is 8 MB; if a very detailed document exceeds it, export its pages and save shorter compositions.

## Recover unfinished work

**Capture**, **Free writing** and **Compose** keep recovery copies in this browser. Completed strokes are copied after the pen lifts; text and setting edits are copied shortly after changes. The banner reports when a recovery copy is saved or if recovery storage fails. A stroke still being drawn is not copied.

When reopening a screen with unfinished work, choose a dated copy and **Restore draft**, **Discard draft**, or **Keep for later**. **Drafts** reopens the list. Discard removes only the selected recovery copy, with confirmation. Clearing the current writing or successfully saving it clears that working recovery copy. If you restore while another draft is on screen, the current draft is retained as a separate recovery copy.

Capture recovery preserves the writer, capture type, shuffled labels, sheet number, guide settings, completed strokes and Undo/Redo history. Practice recovery remains practice; starting capture clears it as usual. Free-writing recovery preserves strokes, Undo/Redo and smoothing. Neither becomes library handwriting until you use the normal Save button.

Compose recovery preserves text, title, writing and page settings, including partially entered fields and the shuffled variation. **Generate preview** again before exporting. **Save composition** creates a separate record for recovered work, preserving any earlier saved finished document. Preview images are not stored in recovery copies; use Save composition to retain exact finished pages.

Each browser tab keeps its own copy. A draft may also be open in another tab; restoring creates a working copy without overwriting newer changes. Recovery relies on browser storage and cannot guarantee the last edits after an abrupt device shutdown. It does not replace Save or Backup / Import, and clearing website data removes recovery copies too. Recovery is currently provided for these three screens; save review and blending edits explicitly.

## Backup and import

Use **Backup / Import → Download backup** to keep a JSON copy of saved captures, blends, review choices, alphabet preferences, character spacing, compositions with finished drawings and free-writing pages. Save drafts first. Transfer this file to another device and import it there; there is no automatic cloud sync.

The **Backup needed / Import** reminder appears when saved work differs from the last confirmed backup, including changes to existing reviews, preferences, spacing or compositions. It counts changed saved items, not individual letters. Open Backup / Import to see the last confirmation time.

After **Download backup**, check that the JSON file is in Downloads or your chosen folder, then tap **I have saved the backup file**. Requesting a download alone does not clear the reminder. Confirmation applies to that downloaded snapshot; changes made afterwards still need a new backup. Earlier downloads made before this feature are not automatically marked as confirmed. Importing adds saved work but does not confirm a backup of the combined library.

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

The public app has no handwriting recognition, individual stroke-point editor, arbitrary cursive joining, direct browser USB control, graphical plotting queue, automatic cloud sync or installed offline mode. It supports the characters offered by Capture and the listed joined pairs. A normal internet connection is used to load the site. Device-specific Pencil/palm behaviour still needs testing on the actual iPad; automated checks cannot establish it.

For missing sources, backup conflicts, stale controls or missing Compose characters, see [Troubleshooting](https://gwb2025.github.io/handwriting-studio/help.html#troubleshooting).

## Development and publishing

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

In repository Settings → Pages, choose **GitHub Actions**. The **Publish Handwriting Studio** workflow tests and deploys `docs/` on pushes to `main`. The build copies only named UI files, never local handwriting or backups. When a feature changes, update this README, its Help guide section and nearby control instructions, rebuild, and check help links before publishing.

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

The local repository, handwriting and `.venv` for this setup are on `/Volumes/EXTRA Apps/Documents/Writing Robot T-A4/handwriting-studio-v2`; keep that drive connected. The Desktop launcher points there. `python3 launch_handwriting_studio.py` can also start the local app; `--no-browser` checks/starts it without opening a browser, and `--port` changes its port. It leaves unrelated services untouched and does not install dependencies. Use the launcher instead of opening `static/` HTML files directly.

## Licence

Handwriting Studio is licensed under the [MIT License](LICENSE). Copyright © 2026 Gordon Brindle.

You may use, modify and redistribute the software, including commercially, provided you retain the copyright and licence notice. See the [full licence](LICENSE) for the terms and warranty disclaimer.

## Acknowledgement

Inspired by **[Dan Catt](https://revdancatt.com/projects)** and the workflow in [his handwriting video](https://www.youtube.com/watch?v=nD3XlqFhcEI), including guided practice, repeated samples, changing capture positions and blending around 22–24 minutes. His [Generative Handwriting project diary](https://revdancatt.com/projects/Generative%20Handwriting/dev-diary) provides further context. Handwriting Studio is an independent implementation for the 2D Pen Plotter project.
