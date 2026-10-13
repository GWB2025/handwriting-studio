# Handwriting Studio

[Open the app](https://gwb2025.github.io/handwriting-studio/) · [Help guide](https://gwb2025.github.io/handwriting-studio/help.html) · [Development and local setup](DEVELOPMENT.md)

Capture your handwriting, blend individual characters, and compose A4 pages for SVG export or the calibrated T-A4 pen plotter. The public app runs in Safari or Chrome, including on an iPad, without a server setup or sign-in.

**Your writing stays in this browser on this device.** It is not uploaded to GitHub or automatically synced. Use **Backup / Import** to keep an external copy or move between devices.

## Get started

1. **Capture** letters, capitals, numbers and symbols with a Pencil or mouse. Repeat sets under the same writer name to collect variations. Fingers operate controls but do not draw.
2. **Review samples** to include/exclude examples, adjust their size and baseline, and correct stroke order or direction.
3. **Blend a character** from two or four different originals of the same character. Drag the transparent result towards its sources, then **Save blended sample**.
4. **My alphabet** shows coverage, lets you choose preferred versions, and adjusts spacing before and after each character.
5. Open **Alphabet proof sheet** to test pangrams, Sonnet 18, the original sonnet *The Hand in Ink*, or your own text. **Compare versions** puts originals, blends and preferred choices side by side.
6. **Compose** lays out your text across A4 pages. Generate a preview, inspect each page and download its SVG or G-code. Generate before **Save composition** to keep the exact finished drawing too.

The iPad layout uses compact navigation and **More** for extra pages and tools. **Writing focus** enlarges Capture and Free writing; **Preview focus** gives other handwriting previews more room. Settings fold into labelled sections, with choices beside the preview on wider screens. Main save and download actions stay within reach.

**Help → Help guide** opens full instructions. Hover or use Tab for tooltips, or tap **Help → Control tips**, then a control to read its explanation. Tap **Done with tips** to resume using it.

## Sizes and variations

- **Preview size / Preview zoom** only enlarges the screen display.
- Review’s **Letter size** scales one sample from **50% to 400%**. **Save changes** applies it to future writing and blends; original strokes are kept.
- **Writing size** sets the physical small-letter guide height: **3, 5, 8, 10, 12, 16 or 20 mm**. Tall letters and tails keep their proportions.
- **Sample order** in Compose can shuffle saved versions. **Natural variation**, off by default, adds subtle changes to word gaps, letter sizes and line slope/curve in Compose and ordinary proof sheets.
- **Joined pairs are experimental and off for new compositions.** Their sizing and joins can differ from individual letters. Existing captures remain available; saved compositions and recovered drafts keep their previous choice. Full cursive joining is not implemented.

Proof sheets and Compose support up to 20 A4 pages with separate downloads. [Detailed instructions](https://gwb2025.github.io/handwriting-studio/help.html#proof) cover longer passages, comparisons, spacing and live previews.

## Keep your writing

**Backup / Import → Download backup** saves captures, blends, reviews, preferences, spacing, compositions and free-writing pages. Check that the file is saved, then tap **I have saved the backup file**. Import adds records; conflicting versions are reported without overwriting existing work.

Capture, Free writing and Compose also keep local **Drafts** for recovery. Restore and save them before backing up: recovery copies are not included. Review and blending changes need their own Save buttons. Clearing website data can remove your writing. See [Backup and import](https://gwb2025.github.io/handwriting-studio/help.html#backup).

## Sending G-code from the Mac

Open **Plotter** in the app for instructions. On the USB-connected Mac, double-click **Start Plotter.command**. Choose a G-code file to preview and check, connect the idle plotter, use **Home**, prepare the paper and start. The window shows progress and time estimates, with **Pause**, **Continue** and **Cancel drawing**. See [Mac plotting setup](DEVELOPMENT.md#mac-plotting-window).

The public website downloads files; USB control runs locally on the Mac. For command-line use, prepare and home the plotter with its pen raised, then run from the repository folder:

```sh
# Validate without moving the plotter:
python3 scripts/send_plot.py ~/Downloads/composed-handwriting-a4.gcode
# Send the checked file when ready:
python3 scripts/send_plot.py ~/Downloads/composed-handwriting-a4.gcode --run
```

Replace the filename with your download. The verified setup uses **+X right, −Y down; Z0.5 pen up, Z5 pen down**. The [Calibration help](https://gwb2025.github.io/handwriting-studio/help.html#calibration) explains the pen checks, dimensioned shapes and centre mark.

Wait for **Completed**, not just all commands sent. Both senders try three reconnections and continue only when the stopping point is verified. A reset or uncertain position stops the job. Cancel (or Ctrl+C in the command-line sender) ends the drawing; a new Start sends the whole file. [Sender details](DEVELOPMENT.md#mac-g-code-sender) explain interrupted jobs.

## Development

Edit sources in `static/` and `web/`, then run `npm run build` and `npm test`. The build produces the public site in `docs/`; do not edit those generated files directly. GitHub Actions publishes pushes to `main` when Pages is configured to use **GitHub Actions**. See [Development and local setup](DEVELOPMENT.md) for all checks, the data model and legacy Mac app.

## Licence and acknowledgement

[MIT License](LICENSE) · Copyright © 2026 Gordon Brindle. Reuse and modification, including commercial use, are permitted under its terms.

Inspired by [Dan Catt’s handwriting workflow](https://www.youtube.com/watch?v=nD3XlqFhcEI), including the two- and four-source blending demonstration around 22–24 minutes. Handwriting Studio is an independent implementation.
