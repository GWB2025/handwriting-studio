'use strict';
(()=>{
  const $=id=>document.getElementById(id),dialog=$('backup-dialog'),status=$('backup-status'),file=$('backup-file'),S=window.StudioRecoveryStore;
  let pending=null,ticket=0,timer=null;
  async function refresh(){
    const turn=++ticket;
    try{
      const [files,receipt]=await Promise.all([StudioStorage.snapshot(),S.receipt()]),manifest=await S.manifest(files);if(turn!==ticket)return;
      const count=S.changed(manifest,receipt?.manifest),due=files.length>0&&(!receipt||count>0);
      $('backup-open').classList.toggle('backup-due',due);$('backup-open').textContent=due?'Backup needed / Import':'Backup / Import';
      $('backup-reminder').textContent=!files.length?'No saved writing to back up yet.':!receipt?'Your saved work needs a confirmed backup.':count?count+' saved item'+(count===1?' has':'s have')+' changed since your confirmed backup.':'All saved work matches your last confirmed backup.';
      $('backup-history').textContent=receipt?'Last confirmed backup: '+new Date(receipt.confirmed_at).toLocaleString()+'.':'No backup has been confirmed in this browser. Earlier downloads may still be in your files.';
    }catch(e){if(turn===ticket){$('backup-reminder').textContent='Backup status unavailable. You can still download a backup.';$('backup-history').textContent='Could not read backup history: '+e.message;}}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,400);}
  $('backup-open').onclick=()=>{dialog.showModal();refresh();status.textContent='Backups include saved captures, blends, reviews, preferences, spacing, compositions and free-writing pages. Recovery copies are separate: restore and save drafts first.';};
  $('backup-close').onclick=()=>dialog.close();
  $('backup-download').onclick=async()=>{
    if($('backup-download').disabled)return;$('backup-download').disabled=true;pending=null;$('backup-confirm').hidden=true;
    try{
      const backup=await StudioStorage.backup();
      // A reminder failure must not prevent the actual backup download.
      let manifest=null;try{manifest=await S.manifest(backup.files);}catch{}
      const url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:'application/json'})),a=document.createElement('a');
      a.href=url;a.download='handwriting-studio-backup-'+new Date().toISOString().slice(0,10)+'.json';a.hidden=true;document.body.append(a);
      try{a.click();}finally{setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},60000);}
      pending=manifest;$('backup-confirm').hidden=!pending;
      status.textContent='Backup download requested · '+backup.files.length+' saved records. Check that the JSON file is in your Downloads or chosen folder, then tap “I have saved the backup file”. A download request alone does not clear the reminder.';
    }catch(e){status.textContent='Could not download backup: '+e.message;}finally{$('backup-download').disabled=false;}
  };
  $('backup-confirm').onclick=async()=>{
    if(!pending)return;const manifest=pending;$('backup-confirm').disabled=true;$('backup-download').disabled=true;
    try{await S.confirmBackup(manifest);pending=null;$('backup-confirm').hidden=true;await refresh();status.textContent='Backup confirmed. Changes made after that download will still need a new backup.';}
    catch(e){status.textContent='Your downloaded file is unaffected, but the confirmation could not be saved: '+e.message;}
    finally{$('backup-confirm').disabled=false;$('backup-download').disabled=false;}
  };
  $('backup-import').onclick=async()=>{
    if(!file.files[0]){status.textContent='Choose a backup file first.';return;}
    const button=$('backup-import');button.disabled=true;
    try{
      if(file.files[0].size>100*1024*1024)throw Error('Backup exceeds 100 MB. Use a smaller backup.');
      const added=await StudioStorage.importBackup(JSON.parse(await file.files[0].text()));
      status.textContent='Imported '+added+' new records. Existing identical records were kept. Refresh samples or reopen Capture to see the imported writing.';file.value='';await refresh();
    }catch(e){status.textContent='Nothing imported: '+e.message;}finally{button.disabled=false;}
  };
  window.addEventListener('studio-saved-change',schedule);window.addEventListener('pageshow',schedule);document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});refresh();
})();
