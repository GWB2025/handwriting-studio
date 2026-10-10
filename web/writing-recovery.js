'use strict';
(()=>{
 const E=window.StudioEngine;
 const mode=window.notebookMode?.recovery;
 window.StudioRecovery.init(mode||{kind:'notebook',canRestore:()=>!saving&&!active,read:()=>dirty&&(strokes.length||undone.length)?{writer:$('writer').value,strokes,undone,smooth:$('smooth').checked}:null,restore:async data=>{
  release();strokes=E.clone(data.strokes);undone=E.clone(data.undone);origin=null;dirty=true;saved=false;finishedWriter=data.writer.trim();$('writer').value=data.writer;$('smooth').checked=data.smooth;redraw();settlePage();message('Free-writing draft restored. Save page to keep it in your library.');
 }});
})();
