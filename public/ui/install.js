const button=document.querySelector('#install-app');
const dialog=document.querySelector('#install-dialog');
let installPrompt;
const standalone=window.matchMedia('(display-mode: standalone)');
function updateButton(){button.hidden=standalone.matches||navigator.standalone===true;}
updateButton();
standalone.addEventListener('change',updateButton);
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  installPrompt=event;
});
window.addEventListener('appinstalled',()=>{
  installPrompt=null;
  button.hidden=true;
  if(dialog.open)dialog.close();
});
button.addEventListener('click',async()=>{
  if(installPrompt){
    const prompt=installPrompt;
    installPrompt=null;
    try{
      await prompt.prompt();
      const result=await prompt.userChoice;
      if(result.outcome==='accepted')button.hidden=true;
      return;
    }catch{}
  }
  dialog.showModal();
});
document.querySelector('#close-install').addEventListener('click',()=>dialog.close());
