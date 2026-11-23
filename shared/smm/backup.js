/* SMM progress backup/restore controller. Restore always requires explicit confirmation. */
(function(){"use strict";
const core=window.PVACore,manifest=window.PVASMMManifest,rules=window.PVASMMValidators;
const status=document.getElementById("status"),file=document.getElementById("backup-file"),paste=document.getElementById("backup-text"),preview=document.getElementById("restore-preview"),confirm=document.getElementById("confirm-restore");
if(!core||!manifest||!rules){status.textContent="Progress tools could not load. Existing course data has not been changed.";return;}
const store=core.create({storageKey:"pva-smm-ft-v2",courseId:manifest.courseId,manifest,rules,legacy:{key:"pva-smm-ft-progress"}});
let pending="";
function say(s){status.textContent=s;}
function download(text,name){const blob=new Blob([text],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
document.getElementById("download-backup").addEventListener("click",()=>{download(store.exportBackup(),"smm-va-progress-backup-"+new Date().toISOString().slice(0,10)+".json");say("Backup prepared. Keep it somewhere safe.");});
document.getElementById("copy-backup").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(store.exportBackup());say("Backup copied.");}catch(e){say("Copy unavailable here. Use Download my progress.");}});
file.addEventListener("change",async()=>{const f=file.files&&file.files[0];if(!f)return;if(f.size>core.LIMITS.backupBytes){say("This file exceeds the 2 MB limit.");return;}paste.value=await f.text();});
document.getElementById("inspect-backup").addEventListener("click",()=>{pending=paste.value.trim();const r=store.inspectBackup(pending);if(!r.ok){preview.textContent="Backup not accepted: "+r.error+". Current progress is unchanged.";confirm.disabled=true;return;}preview.textContent="Current: "+r.current.lessonsComplete+" lessons complete; "+r.current.requirementsPassed+" requirements passed. Backup: "+r.backup.lessonsComplete+" lessons complete; "+r.backup.requirementsPassed+" requirements passed. Restoring replaces current progress.";confirm.disabled=false;});
confirm.addEventListener("click",()=>{
  if(!store.isPersistent()){say("Browser storage is unavailable. Restore was stopped; current progress was not replaced.");return;}
  download(store.exportBackup(),"smm-va-safety-copy-before-restore-"+new Date().toISOString().slice(0,10)+".json");
  const r=store.restoreBackup(pending,{confirmed:true});
  if(r.ok&&r.saved){say("Backup restored. A safety copy of the previous progress was downloaded. Reload the course to refresh its progress display.");confirm.disabled=true;}
  else say("Restore could not be saved. Keep the safety copy; reload before trying again.");
});
store.on("storage-unavailable",()=>{say("Browser storage is unavailable. Progress may not be saved; download a backup before leaving.");confirm.disabled=true;});
if(store.snapshot().legacyV1)say("Previous-version data was read for migration. Previous completion flags are display-only and do not count toward the new certificate.");
})();
