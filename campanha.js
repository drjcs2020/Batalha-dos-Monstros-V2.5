
'use strict';
/* Modo teste V2.5 — um controlador de navegação, único dono de F6/F7/F8.
   Não sobrescreve o combate e os chefões individuais. */
const CAMPAIGN=window.CM25_CONFIG.reinos.map(r=>[r.nome,r.territorios,r.dificuldade]);
const $=id=>document.getElementById(id),frame=$('gameWindow'),sel=$('realmSelect');
let realm=1,territory=1,ready=false,pendingArea=1,identity=null,loadId=0,lastCommand=0,autoTimer=null,automaticEntry=false,campaignStarted=false;
CAMPAIGN.forEach((r,i)=>{const o=document.createElement('option');o.value=i+1;o.textContent=`${i+1}. ${r[0]} — nível ${r[2]}`;sel.appendChild(o)});
try{identity=JSON.parse(sessionStorage.getItem('cm25TesteIdentidade')||'null')}catch(e){}
function report(s){$('status').textContent=s;}
function info(){const a=CAMPAIGN[realm-1];sel.value=String(realm);$('realmTitle').textContent=`Reino ${realm}/10 · ${a[0]} · Terr. ${territory}/${a[1]}`;}
function capture(){try{const s=frame.contentWindow.CM25RealmBridge?.status();if(s&&s.realm===realm){identity={hero:s.hero,name:s.name,className:s.className};sessionStorage.setItem('cm25TesteIdentidade',JSON.stringify(identity))}}catch(e){console.warn('Não foi possível preservar personagem',e)}}
function switchRealm(next,target=1,direct=true){
 if(next<1||next>10){report('Limite da campanha: Reino '+realm);return;}
 if(next!==realm)capture();
 if(autoTimer){clearTimeout(autoTimer);autoTimer=null;}
 realm=next;territory=target;pendingArea=target;ready=false;automaticEntry=direct;loadId++;
 info();report(`Carregando ${CAMPAIGN[realm-1][0]} · território ${target}…`);
 frame.src=`reinos/${String(realm).padStart(2,'0')}/index.html?cm25=${loadId}&direct=${direct?'1':'0'}`;
}
function area(n){
 const maximum=CAMPAIGN[realm-1][1];n=Math.max(1,Math.min(maximum,n));
 if(!ready){pendingArea=n;territory=n;info();report('Carregando recursos antes de abrir território '+n+'…');return;}
 const bridge=frame.contentWindow.CM25RealmBridge;
 if(!bridge||bridge.realm!==realm){report('Erro de ligação: reino diferente do selecionado');return;}
 try{
  const confirmed=bridge.selectArea(n-1,identity),s=bridge.status();
  if(confirmed!==n||!s.active||s.territory!==n)throw Error('O jogo não confirmou a entrada no território');
  if(n<maximum&&s.monstersLoaded===0)throw Error('Nenhum monstro foi criado; território interrompido para evitar um cenário vazio');
  territory=n;pendingArea=0;campaignStarted=true;info();frame.focus();try{frame.contentWindow.focus()}catch(e){};report(`Reino ${realm} · território ${n} · ${n===maximum?'chefão':s.monstersLoaded+' monstros carregados'}`);
 }catch(e){const error=String(e.message||e);report('ERRO NO TERRITÓRIO: '+error);console.error('[ClassMana] Falha ao iniciar',realm,n,e);}
}
function command(key,shift=false){
 if(key==='F8'){if(realm+(shift?-1:1)<1||realm+(shift?-1:1)>10){report('Limite da campanha');return;}switchRealm(realm+(shift?-1:1),1);return;}
 if(key==='F7'){if(!campaignStarted){switchRealm(realm,CAMPAIGN[realm-1][1],true);}else area(CAMPAIGN[realm-1][1]);return;}
 if(key==='F6'){
  if(!campaignStarted){switchRealm(realm,Math.min(2,CAMPAIGN[realm-1][1]),true);return;}
  if(!ready){report('Carregamento do reino em andamento; comando ignorado');return;}
  try{const s=frame.contentWindow.CM25RealmBridge?.status();if(s?.active&&s.realm===realm)territory=s.territory;}catch(e){}
  if(territory<CAMPAIGN[realm-1][1])area(territory+1);
  else if(realm<10)switchRealm(realm+1,1);else report('Você está no chefão final, Reino 10');
 }
}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.namespace!=='CM25')return;
 const data=e.data;if(String(data.token)!==String(loadId)||data.realm!==realm)return;
 if(data.action==='READY'){
   ready=true;
   if(automaticEntry){report('Reino '+realm+' carregado — iniciando território '+pendingArea);if(pendingArea)area(pendingArea);}
   else report('Abertura original: aguarde o carregamento, assista ou pule o vídeo e selecione seu herói. Depois clique em INICIAR TESTE V2.5.');
 }
 else if(data.action==='INTRO_DONE'){report('Vídeo concluído. Selecione o personagem e clique em INICIAR TESTE V2.5.');}
 else if(data.action==='START'){
   if(automaticEntry||campaignStarted)return;
   const x=data.profile||{};
   identity={hero:Number.isInteger(x.hero)?x.hero:0,name:String(x.name||'Jogador teste').slice(0,70),className:String(x.className||'4º A').slice(0,24)};
   sessionStorage.setItem('cm25TesteIdentidade',JSON.stringify(identity));
   area(1);
 }
 else if(data.action==='KEY')command(data.key,!!data.shift);
 else if(data.action==='COMPLETE'){
  const completedRealm=realm,completedToken=loadId;
  report('Chefão derrotado! Preparando o próximo reino…');
  if(realm<10)autoTimer=setTimeout(()=>{if(realm===completedRealm&&loadId===completedToken)switchRealm(realm+1,1);},2300);
 }
});
window.addEventListener('keydown',e=>{
 if(!['F6','F7','F8'].includes(e.code))return;
 e.preventDefault();if(e.repeat)return;
 const now=performance.now();if(now-lastCommand<220)return;lastCommand=now;
 command(e.code,e.shiftKey);
},true);
sel.addEventListener('change',()=>switchRealm(Number(sel.value),1));
$('startHere').onclick=()=>{if(!campaignStarted)switchRealm(realm,1,true);else if(!ready)switchRealm(realm,1,true);else area(1);};
$('f6').onclick=()=>command('F6');$('f7').onclick=()=>command('F7');$('f8').onclick=()=>command('F8');$('prev').onclick=()=>command('F8',true);
$('musicButton').onclick=()=>{try{const game=frame.contentWindow;const ok=game.ClassManaNucleo?.audio?.play();report(ok?'Música solicitada para o reino atual. Se estiver sem som, confira o botão de áudio no jogo e a conexão.':'Não foi possível iniciar a música. Inicie o território e tente novamente.')}catch(e){report('Áudio indisponível: '+e.message)}};
$('helpButton').onclick=()=>{$('help').hidden=!$('help').hidden};
setInterval(()=>{
 if(!ready)return;try{const s=frame.contentWindow.CM25RealmBridge?.status();if(s&&s.realm===realm&&s.active&&s.territory!==territory){territory=s.territory;info();}}catch(e){}
},900);
// Em cada abertura começar de forma previsível no primeiro reino. Selecionar outro reino inicia automaticamente o seu T1.
switchRealm(1,1,false);
