'use strict';
(()=>{
  const dialog=document.getElementById('backup-dialog'),status=document.getElementById('backup-status'),file=document.getElementById('backup-file');
  document.getElementById('backup-open').onclick=()=>{dialog.showModal();status.textContent='Backups include letter captures, review choices and free-writing pages.';};
  document.getElementById('backup-close').onclick=()=>dialog.close();
  document.getElementById('backup-download').onclick=async()=>{
    try{
      const backup=await StudioStorage.backup(),url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:'application/json'})),a=document.createElement('a');
      a.href=url;a.download='handwriting-studio-backup-'+new Date().toISOString().slice(0,10)+'.json';a.hidden=true;document.body.append(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url);},60000);
      status.textContent='Backup download requested · '+backup.files.length+' saved records. Keep it somewhere safe, or import it on another device.';
    }catch(e){status.textContent='Could not download backup: '+e.message;}
  };
  document.getElementById('backup-import').onclick=async()=>{
    if(!file.files[0]){status.textContent='Choose a backup file first.';return;}
    const button=document.getElementById('backup-import');button.disabled=true;
    try{
      if(file.files[0].size>100*1024*1024)throw Error('Backup exceeds 100 MB. Use a smaller backup.');
      const added=await StudioStorage.importBackup(JSON.parse(await file.files[0].text()));
      status.textContent='Imported '+added+' new records. Existing identical records were kept. Refresh samples or reopen Capture to see the imported writing.';file.value='';
    }catch(e){status.textContent='Nothing imported: '+e.message;}finally{button.disabled=false;}
  };
})();
