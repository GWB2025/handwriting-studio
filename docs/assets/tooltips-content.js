'use strict';
(function(root){
 const size='Set the physical small-letter guide height to 3, 5, 8, 10, 12, 16 or 20 mm. Captured proportions and saved Review scaling still apply. Larger writing may need more A4 pages.';
 const colours='Show each pen stroke in a different colour: first dark, second blue, then other colours. Exported writing stays black.';
 const starts='Show numbered dots where each stroke begins, so you can compare drawing order and direction.';
 const smooth='Use gentle curves in the preview and exported drawing. Your original captured points are kept.';
 const natural='Off by default. Choose Subtle or More pronounced to vary word gaps, letter sizes and the slope and curve of lines. Saved samples stay unchanged.';
 const ids={
  'backup-open':'Open backup and import tools for the writing saved in this browser.',
  'backup-download':'Download saved captures, blends, Review adjustments, preferred choices, spacing, compositions and free-writing pages. Save unfinished drafts first; recovery copies are not included.',
  'backup-confirm':'Confirm that you have kept the downloaded backup file. This updates the backup reminder.',
  'backup-file':'Choose a Handwriting Studio JSON backup from this device. Selecting a file does not import it yet.',
  'backup-import':'Add the selected backup to this browser. Existing records are kept; conflicting versions are reported instead of overwritten.',
  'backup-close':'Close the backup window and return to your work.',
  'recovery-open':'Find unfinished work kept as recovery drafts on this device.',
  'recovery-list':'Choose an unfinished draft to inspect before restoring or discarding it.',
  'recovery-restore':'Restore the selected draft as working content. Save it normally to keep it in your handwriting library and backups.',
  'recovery-discard':'Delete the selected recovery draft. Saved handwriting and finished compositions are kept.',
  'recovery-later':'Close this window and keep the recovery draft for later.',
  'writer':'Enter or choose a writer name. Use the same name for samples that belong to the same handwriting collection.',
  'writer-done':'Finish entering the writer name and dismiss the keyboard.',
  'capture-kind':'Choose lowercase letters, capitals, numbers, symbols or experimental joined pairs. Changing this clears unsaved practice after confirmation.',
  'more-sheets':'Start another shuffled capture set under this writer name to add more sample variations.',
  'smooth':smooth,'guide-small':'Show the small-letter height line, used for the bodies of letters such as a, c and e.',
  'guide-tall':'Show the taller-letter line, used for letters such as b and d and for capitals.',
  'guide-tail':'Show the lower guide for tails on letters such as g, j and y.',
  'guide-symbols':'Show faint examples and reference letters that suggest where to place punctuation. Draw only the labelled symbol.',
  'guide-shading':'Shade the suggested writing area for each character. These guides are not saved as pen strokes.',
  'undo':'Remove the most recent unsaved stroke. Redo can restore it.',
  'redo':'Restore the most recently undone stroke.',
  'saved-pages':'Browse saved free-writing pages. These are separate from the character samples used by Compose.',
  'library-close':'Close the saved-pages window and return to the current writing.',
  'library-writer':'Filter saved free-writing pages by writer, or show all writers.',
  'library-refresh':'Reload the list of saved free-writing pages from this browser.',
  'keep-writing':'Keep the current unsaved writing and return to it.',
  'replace-page':'Open the selected saved page without saving the current working page. Unsaved changes to the current page will be replaced.',
  'open-page':'Open the selected free-writing page to continue writing or download it. Saving edits creates a new copy.',
  'review-writer':'Choose whose saved character samples to review.',
  'review-kind':'Choose the character group to review, including symbols and experimental joined pairs.',
  'review-letter':'Choose a character to see all its saved originals and blends.',
  'review-refresh':'Reload saved samples and their latest review adjustments.',
  'review-zoom':'Enlarge this sample’s display from 100% to 300%. To resize the saved sample, use Letter size below and Save changes.','review-colours':colours,'review-starts':starts,
  'sample-shift':'Move the character up or down relative to the fixed baseline. Slide up to raise it. Save changes to keep the position.',
  'sample-included':'Include or exclude this sample without deleting it. Excluded originals also cannot be blend sources. Save changes to keep your choice.',
  'stroke-target':'Choose which pen stroke to move in the sequence or reverse.',
  'stroke-earlier':'Move the selected stroke one place earlier in the drawing order. Save changes to keep it.',
  'stroke-later':'Move the selected stroke one place later in the drawing order. Save changes to keep it.',
  'stroke-reverse':'Reverse the drawing direction of the selected stroke. Its shape stays the same.',
  'stroke-undo':'Undo the most recent stroke-order or direction adjustment in this review session.',
  'stroke-original':'Return to the captured stroke order and directions. Save changes to keep this reset.',
  'sample-size':'Scale this sample’s height and width from 50% to 400% around its baseline. Save changes to use it in new blends, My alphabet, proofs and Compose. Preview zoom only changes the display.',
  'sample-size-reset':'Return this sample to its original 100% size. Save changes to keep it.',
  'review-word':'Try the pending size and baseline adjustment in a short word at 5 mm writing size. A joined-pair review uses that selected pair wherever it occurs. Previewing does not save changes.',
  'review-word-preview':'Inspect the pending adjustment at a steady display scale. Scroll sideways for long words. Changes are kept only after Save changes.',
  'sample-zero':'Return this sample to its original baseline position. Save changes to keep it.',
  'review-save':'Save this sample’s inclusion, baseline, size and stroke corrections. Original captured strokes are kept.',
  'review-reset':'Discard pending review edits and restore this sample’s last saved adjustments.',
  'single-writer':'Choose the writer under whose name the new blended sample will be saved.',
  'single-pool':'Choose whether source originals come from this writer only or all writers. This helps when capture sets used different names.',
  'single-letter':'Choose the character to blend. Only characters with included original samples are listed.',
  'single-count':'Choose two or four distinct, compatible originals of the same character. Drag the result left/right for two sources, or in any direction for four.',
  'single-find':'Choose two or four distinct originals with compatible stroke counts, order and direction where possible.',
  'single-save':'Save the blend in this browser under the selected writer, ready for Review, My alphabet and Compose. Source originals stay unchanged. Use Backup / Import to keep an external copy.',
  'single-refresh':'Reload the original samples and their latest Review adjustments.',
  'single-prefer':'Use this newly saved blend as a preferred version for the character in Compose and proof sheets.',
  'single-view':'Open the saved blended sample in My alphabet.',
  'single-next':'Move to the next character and centre the mix. Save blended sample first if you want to keep the current result.',
  'single-saved-choice':'Choose a previously saved blend of this character to reopen.',
  'single-reopen':'Restore the selected blend’s original source samples, adjustments and mix position. Saving creates a new version.',
  'single-guides':'Show or hide baseline guides and background shading behind the sample letters.',
  'single-colours':colours,'single-starts':starts,'single-zoom':'Enlarge source letters and the result from 100% to 200% for inspection. This changes only the display, not the saved blend.',
  'single-centre':'Return the blend to the midpoint: equal weight from two sources, or all four sources.',
  'alphabet-writer':'Choose whose alphabet and preferred samples to manage.',
  'alphabet-kind':'Show lowercase letters, capitals, numbers, symbols or experimental joined pairs.',
  'alphabet-proof':'Open a proof sheet for this writer and group, with test sentences and physical writing sizes from 3 to 20 mm.',
  'alphabet-compare':'Compare originals, saved blends and preferred versions in three columns. Choose the classic 3, 5 and 8 mm sheet or a single size up to 20 mm.',
  'alphabet-refresh':'Reload the alphabet, saved samples and preferred choices.',
  'alphabet-zoom':'Enlarge alphabet tiles and sample cards from 100% to 300%. This changes only the display; use Review to resize one sample, or a proof sheet to choose a physical writing size.','alphabet-zoom-reset':'Return the alphabet previews to 100% display size.',
  'alphabet-colours':colours,'alphabet-clear':'Clear the preferred choices for this character. Samples are kept, and Compose can use the available sample pool.',
  'spacing-before':'Adjust space before this character, from −2 to +3 mm at 5 mm writing size. Negative values tighten the gap; Save spacing keeps it.',
  'spacing-after':'Adjust space after this character, from −2 to +3 mm at 5 mm writing size. It scales with writing size; Save spacing keeps it.',
  'spacing-zero':'Set both character-spacing adjustments to zero. Save spacing to keep the normal spacing.',
  'spacing-save':'Save spacing for every version of this character under the selected writer.',
  'spacing-reset':'Discard pending spacing edits and restore the last saved values.',
  'spacing-word':'Type a short word containing the selected character to preview the pending spacing.',
  'proof-mode':'Choose an alphabet with test sentences, a text passage, or a three-column comparison with writing sizes up to 20 mm.',
  'proof-writer':'Choose whose handwriting to use for this proof.',
  'proof-kind':'Choose the character group for the alphabet sheet. Joined pairs are experimental and are used only when this group is selected; text passages use individual letters.',
  'proof-source':'Use original samples, saved blends, or both. Included preferred versions are used when the chosen source type allows them.',
  'proof-size':size,'proof-smooth':smooth,
  'proof-example':'Replace the text with a pangram, Sonnet 18 or The Hand in Ink. Passage examples open Text passage. Lowercase-only versions need no capitals or punctuation; Your own text keeps the current text editable.',
  'proof-sentence':'Edit the test sentences or passage to show in your handwriting. Line breaks are kept and long lines wrap between words.',
  'proof-compare-size':'Compare all three source columns at 3, 5 and 8 mm together, or choose a single physical writing size from 3 to 20 mm. Larger sizes may need shorter test words.',
  'proof-compare-text':'Enter short words or characters for comparison. All three source columns use the selected comparison writing size.',
  'proof-refresh':'Rebuild the proof with current settings and reload your saved handwriting choices.',
  'proof-svg':'Download the displayed A4 page as an SVG drawing. Print at 100% to keep its physical size.',
  'proof-gcode':'Download plotter instructions for the displayed A4 page. Downloading does not move the plotter.',
  'proof-previous':'Show the previous A4 proof page. Downloads use the page currently displayed.',
  'proof-next':'Show the next A4 proof page. Downloads use the page currently displayed.',
  'proof-zoom':'Inspect the handwriting from Fit page width up to 400%. Scroll inside the preview to see enlarged areas. Exported writing keeps its selected physical size.',
  'proof-natural':natural+' The handwriting preview below updates live. Compare versions does not use natural variation.',
  'proof-natural-new':'Try a different pattern of natural variation while keeping the selected amount.',
  'composition-title':'Name this composition so you can find it again in this browser and in backups.',
  'composition-save':'Save the text and settings, updating the open composition if there is one. Generate first to keep every finished page too.',
  'composition-copy':'Save the current composition as a separate copy, keeping the existing saved version.',
  'composition-list':'Choose a saved composition to open. Finished documents keep their exact page drawings.',
  'composition-open':'Open the selected composition with its saved text, settings and any finished pages.',
  'compose-writer':'Choose the handwriting collection to use for this composition.',
  'compose-size':size,'compose-smooth':smooth,
  'compose-samples':'Choose how many recent included samples per character to use. Eligible preferred choices take priority when enabled.',
  'phrase':'Enter text using captured characters. Line breaks are kept, words wrap, and longer writing continues onto more A4 pages.',
  'compose-natural':natural+' After Generate preview, the amount updates live on every page.','compose-natural-new':'Try a different natural-variation pattern without changing the selected letter samples.',
  'compose-order':'Cycle through eligible samples in sequence, or shuffle them for a varied but repeatable result.',
  'compose-shuffle':'Shuffle the sample choices again. The new selection stays fixed through spacing and layout edits.',
  'compose-source':'Choose original samples, saved blends, or both. Missing characters are reported before export.',
  'compose-preferred':'Use the preferred versions chosen in My alphabet when they match the selected source type.',
  'compose-joined':'Experimental; off for new compositions. Use saved pairs such as th or oo where available. Their size may differ from individual letters, and they do not automatically join neighbouring letters. Saved compositions and restored drafts retain their choice.',
  'compose-variation':'Use saved handwriting examples for the composition.',
  'compose-letter-spacing':'Adjust the distance between character starts. 100% is normal; lower values tighten spacing and may overlap ink.',
  'compose-word-spacing':'Adjust the gaps between words. 100% uses normal spacing.',
  'compose-line-spacing':'Adjust the space between lines. This does not change character size.',
  'compose-spacing-reset':'Return letter spacing, word spacing and line gap to 100%.',
  'compose-alignment':'Align each line to the left, centre or right within the page margins.',
  'compose-paragraph-gap':'Add up to 30 mm after a blank line between paragraphs.',
  'compose-layout-reset':'Restore 20 mm margins, left alignment and no extra paragraph gap.',
  'generate':'Generate fresh A4 previews using the current text, settings and saved handwriting.',
  'compose-download':'Download only the displayed composition page as an A4 SVG drawing.',
  'compose-gcode':'Download plotter instructions for the displayed composition page. Downloading does not move the plotter.',
  'refresh-writers':'Reload writer names, sample counts and changes to saved handwriting.',
  'compose-page-previous':'Show the previous composition page. Downloads use the displayed page.',
  'compose-page-select':'Choose which finished page to preview and download.',
  'compose-page-next':'Show the next composition page. Downloads use the displayed page.',
  'calibration-stage':'Choose a stage of the verified A4 calibration check, or the combined drawing. This does not change machine settings.',
  'download-gcode':'Download the selected calibration stage as plotter instructions. Send the file from the connected Mac when ready.',
  'download-svg':'Download an A4 drawing of the selected calibration stage. The pen-only check has no drawing.',
  'plot-open-local':'Open the plotting window after starting Start Plotter.command on the USB-connected Mac. This address does not start the sender or work from an iPad.',
  'plot-file':'Choose a Studio G-code file to check page bounds, preview its paths and estimate movement time. Loading a file does not move the plotter.',
  'plot-port':'Choose the connected T-A4 controller. Only supported USB devices appear here.',
  'plot-refresh':'Look again for the USB plotter. This does not open a serial connection or move the machine.',
  'plot-connect':'Connect to the idle plotter. Use Home afterwards before starting a drawing.',
  'plot-disconnect':'Close the USB connection after the current operation has finished. To end a running drawing, use Cancel drawing first.',
  'plot-home':'Raise the pen and run the machine’s homing cycle, then verify top-left home with the pen raised. This moves the plotter and is available only outside a drawing.',
  'plot-ready':'Confirm that paper is in place and the pen and bed are ready for this drawing. Start also requires a checked file and a homed plotter.',
  'plot-start':'Start the checked drawing from the beginning. Progress counts commands sent; completion is confirmed only when movement finishes at home with the pen raised.',
  'plot-pause':'Pause the current drawing without discarding it. Wait for Paused, then use Continue to resume or Cancel drawing to end it.',
  'plot-continue':'Continue the paused drawing from its current point. This does not restart the file.',
  'plot-cancel':'Stop the drawing and clear queued movement. The cancelled job cannot be continued; use Home before a deliberate new run.',
  'plot-travel':'Show dashed pen-up travel in the A4 preview. This changes only the display, not the G-code or plotter movement.',
 };
 for(const side of ['top','bottom','left','right'])ids['compose-margin-'+side]='Set the '+side+' page margin from 20 to 60 mm. Larger margins leave less room for writing.';
 const routes={
  'index.html':'Open character capture to add handwriting samples.',
  'notebook.html':'Open free writing to draw and save whole pages.',
  'review.html':'Review saved originals and blends, adjust their position and size, or correct stroke order.',
  'blending.html':'Blend two or four original samples into a new character.',
  'alphabet.html':'Inspect your alphabet, choose preferred versions and adjust character spacing.',
  'compose.html':'Compose text using your saved handwriting and export A4 pages.',
  'proof.html':'Create handwriting proof sheets, passages or comparisons.',
  'calibration.html':'Download the verified A4 calibration checks for the plotter.',
  'plotting.html':'Open instructions for the USB-connected Mac plotting window.',
  'help.html':'Open the help guide with instructions for the current screen.'
 };
 function describe(control,doc){
  const capture=!!doc.getElementById('capture-kind'),id=control.id,text=(control.textContent||'').trim();let tip=ids[id]||'';
  if(id==='writer'&&!capture)tip='Enter the writer name to keep with this free-writing page.';
  if(id==='save')tip=capture?(text.startsWith('Start')?'Start capturing a shuffled set of labelled characters. Practice strokes are cleared; they are not saved as samples.':text.startsWith('Compose')?'Open Compose using the character samples you have saved.':'Save this capture sheet in your browser and move to the next sheet. Use Backup / Import to keep an external copy.'):'Save this free-writing page in your browser. Editing an opened page creates a new copy; download a backup to keep it elsewhere.';
  if(id==='clear')tip=capture?'Clear the current unsaved sheet. Previously saved samples are kept.':'Clear the current working page. Previously saved pages are kept.';
  if(id==='export')tip=capture?'Download the current capture sheet as an SVG drawing. This does not save its characters into your alphabet.':'Download the current free-writing page as an SVG drawing.';
  if(id==='guides')tip=capture?'Show the baseline where the bodies of your letters sit. Guides are not saved as pen strokes.':'Show writing lines on the free-writing area. Lines are not saved as pen strokes.';
  if(id==='focus')tip=control.getAttribute('aria-expanded')==='true'?'Hide the short writing instructions to leave more room on screen.':'Show short instructions for this writing screen.';
  if(id==='paper')tip=capture?'Draw one labelled character in each box using a Pencil, pen or mouse. Lift the pen between strokes; use Start capture to begin saving samples.':'Write or draw with a Pencil, pen or mouse. Fingers operate the controls; Save page keeps your writing.';
  if(control.matches('#single-sources select'))tip='Choose a distinct original for this source. Choosing one already in another source swaps the two. Compatible stroke counts, order and direction are needed.';
  if(control.matches('.blend-result'))tip='Drag the blended character towards a source to make it more like that source. Two samples blend left/right; four also blend up/down. Arrow keys work too.';
  if(control.matches('#alphabet-grid button'))tip='Select this character to inspect its samples, choose preferred versions and adjust spacing.';
  if(control.matches('#alphabet-samples button'))tip=text.startsWith('Remove')?'Remove this version from the preferred choices. The saved sample is kept.':'Add this included version to the preferred choices used by Compose and proof sheets.';
  if(control.matches('#alphabet-samples a'))tip='Reopen the saved blend with its original sources and mix position. Saving makes a new version.';
  if(control.matches('#review-alphabet button'))tip='Choose this character to review its saved examples.';
  if(control.matches('#sample-list button'))tip='Open this saved example to inspect it and adjust inclusion, baseline, size or stroke order.';
  if(control.matches('#page-list button'))tip='Preview this saved free-writing page before opening it.';
  if(control.matches('.preview-scroll'))tip='Scroll sideways to inspect enlarged source letters. Drag the outlined blended character to change the mix.';
  if(control.matches('.proof-paper'))tip='Scroll or swipe inside the preview to inspect the enlarged page. Preview zoom does not affect exports.';
  if(!tip&&control.matches('a')){
   const href=control.getAttribute('href')||'',path=href.replace(/^https:\/\/gwb2025\.github\.io\/handwriting-studio\//,'').split(/[?#]/)[0];
   tip=href.startsWith('#')?'Jump to '+text+' in the help guide.':routes[path]||'Open '+text+'.';
   if(href.includes('github.com/GWB2025/handwriting-studio'))tip=href.includes('#sending-g-code')?'Read the instructions for sending a downloaded plotter file from the connected Mac.':href.includes('DEVELOPMENT.md')?'Read the developer documentation, local setup and Mac sender limits.':'Open the Handwriting Studio source code, README and project history on GitHub.';
   if(href.includes('shakespeare.mit.edu'))tip='Read the original text of Shakespeare’s Sonnet 18.';
   if(control.getAttribute('target')==='_blank')tip+=' Opens in a separate tab.';
  }
  if(tip&&(control.disabled||control.closest('fieldset[disabled]')||control.getAttribute('aria-disabled')==='true'))tip+=' This control is currently unavailable.';
  return tip;
 }
 const api={describe,ids};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudioTipContent=api;
})(typeof window!=='undefined'?window:globalThis);
