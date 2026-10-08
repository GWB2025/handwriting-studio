'use strict';
const library=$('library');
let pageSummaries=[],selectedPage=null,libraryRequest=0,libraryController=null;
function cancelLibraryRequest(){
  libraryRequest++;
  libraryController?.abort();libraryController=null;
}
async function readLibraryJSON(url){
  libraryController=new AbortController();
  const controller=libraryController,timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await window.studioFetch(url,{signal:controller.signal,cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw Error(data.error || 'Browser storage could not read this page.');
    return data;
  }finally{clearTimeout(timer);}
}
function readableDate(value){return new Date(value).toLocaleString();}
function resetPreview(){
  selectedPage=null;
  $('preview-title').textContent='Choose a saved page';
  $('preview-info').textContent='Select a page to see its handwriting before opening it.';
  $('page-preview').replaceChildren();
  $('replace-warning').hidden=true;$('open-page').disabled=true;
}
function closeLibrary(){
  cancelLibraryRequest();
  library.close();settlePage();
  $('saved-pages').focus({preventScroll:true});
}
function drawPagePreview(page){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 1000 500');
  svg.setAttribute('role','img');svg.setAttribute('aria-label','Handwriting preview for '+page.writer);
  const group=document.createElementNS(ns,'g');
  for(const [name,value] of Object.entries({fill:'none',stroke:'#203832','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round'}))group.setAttribute(name,value);
  for(const stroke of page.raw_strokes){
    const path=document.createElementNS(ns,'path');
    path.setAttribute('d',pathCommands(stroke.points,page.display_smoothing).map(command=>command.join(' ')).join(' '));
    group.append(path);
  }
  svg.append(group);$('page-preview').replaceChildren(svg);
}
function renderPageList(){
  const writer=$('library-writer').value;
  const pages=pageSummaries.filter(page=>!writer || page.writer===writer);
  $('page-list').replaceChildren();
  if(!pages.length){
    const empty=document.createElement('p');empty.className='empty-pages';
    empty.textContent='No saved pages yet. Go back to writing and use Save page.';
    $('page-list').append(empty);return;
  }
  for(const page of pages){
    const button=document.createElement('button');button.className='page-card';button.dataset.pageId=page.id;
    button.setAttribute('aria-pressed',String(page.id===selectedPage?.id));
    const writerName=document.createElement('strong'),date=document.createElement('span'),count=document.createElement('span');
    writerName.textContent=page.writer;date.textContent=readableDate(page.saved_at);
    count.textContent=page.stroke_count+' '+(page.stroke_count===1?'stroke':'strokes');
    button.append(writerName,date,count);
    button.onclick=()=>previewPage(page.id);
    $('page-list').append(button);
  }
}
async function loadLibrary(){
  cancelLibraryRequest();const request=libraryRequest;
  resetPreview();pageSummaries=[];$('page-list').replaceChildren();
  $('library-writer').disabled=true;$('library-refresh').disabled=true;
  $('library-status').textContent='Loading saved pages…';
  try{
    const data=await readLibraryJSON('/api/pages');
    if(request!==libraryRequest || !library.open)return;
    pageSummaries=data.pages;
    const filter=$('library-writer');filter.replaceChildren();
    const all=document.createElement('option');all.value='';all.textContent='All writers';filter.append(all);
    for(const writer of [...new Set(pageSummaries.map(page=>page.writer))].sort((a,b)=>a.localeCompare(b))){
      const option=document.createElement('option');option.value=writer;option.textContent=writer;filter.append(option);
    }
    filter.disabled=!pageSummaries.length;
    $('library-status').textContent=pageSummaries.length+' saved '+(pageSummaries.length===1?'page':'pages')+' · newest first'+
      (data.unavailable_count?'. '+data.unavailable_count+' unreadable '+(data.unavailable_count===1?'file was':'files were')+' left untouched.':'');
    renderPageList();
  }catch(error){
    if(request!==libraryRequest || !library.open)return;
    $('library-status').textContent='Could not load saved pages. Try reopening this page in a regular browser window, then tap Refresh list. Your current writing is still here.';
  }finally{if(request===libraryRequest)$('library-refresh').disabled=false;}
}
async function previewPage(id){
  cancelLibraryRequest();const request=libraryRequest;
  resetPreview();$('preview-title').textContent='Loading preview…';$('preview-info').textContent='';
  // Clear any previous selection while its replacement is loading.
  for(const button of $('page-list').querySelectorAll('button'))button.setAttribute('aria-pressed','false');
  try{
    const page=await readLibraryJSON('/api/pages/'+encodeURIComponent(id));
    if(request!==libraryRequest || !library.open)return;
    selectedPage=page;
    $('preview-title').textContent=page.writer;
    $('preview-info').textContent=readableDate(page.saved_at)+' · '+page.raw_strokes.length+' '+(page.raw_strokes.length===1?'stroke':'strokes');
    drawPagePreview(page);$('open-page').disabled=false;
    // Preserve scroll position while marking the selected card.
    for(const button of $('page-list').querySelectorAll('button')){
      button.setAttribute('aria-pressed',String(button.dataset.pageId===id));
    }
  }catch(error){
    if(request!==libraryRequest || !library.open)return;
    $('preview-title').textContent='Preview unavailable';
    $('preview-info').textContent=error.name==='AbortError'?'Browser storage took too long to respond. Select the page to try again.':error.message;
  }
}
function openSelectedPage(){
  if(!selectedPage)return;
  openSavedPage(selectedPage);closeLibrary();
}
$('saved-pages').onclick=()=>{
  if(saving || active)return;
  finishWriter();library.showModal();settlePage();loadLibrary();
};
$('library-close').onclick=closeLibrary;
library.addEventListener('cancel',event=>{event.preventDefault();closeLibrary();});
$('library-refresh').onclick=loadLibrary;
$('library-writer').onchange=()=>{cancelLibraryRequest();resetPreview();renderPageList();};
$('open-page').onclick=()=>{
  if(!selectedPage)return;
  if(hasUnsavedWriting()){
    $('replace-warning').hidden=false;$('keep-writing').focus({preventScroll:true});return;
  }
  openSelectedPage();
};
$('keep-writing').onclick=closeLibrary;
$('replace-page').onclick=openSelectedPage;
