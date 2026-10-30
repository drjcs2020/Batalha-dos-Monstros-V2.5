
'use strict';
/* Modo teste V2.5 — um controlador de navegação, único dono de F6/F7/F8.
   Não sobrescreve o combate e os chefões individuais. */
const CAMPAIGN=window.CM25_CONFIG.reinos.map(r=>[r.nome,r.territorios,r.dificuldade]);
const $=id=>document.getElementById(id),frame=$('gameWindow'),sel=$('realmSelect');
let realm=1,territory=1,ready=false,pendingArea=1,identity=null,loadId=0,lastCommand=0,autoTimer=null,automaticEntry=false,campaignStarted=false,entering=false;
CAMPAIGN.forEach((r,i)=>{const o=document.createElement('option');o.value=i+1;o.textContent=`${i+1}. ${r[0]} — nível ${r[2]}`;sel.appendChild(o)});
try{identity=JSON.parse(sessionStorage.getItem('cm25TesteIdentidade')||'null')}catch(e){}
function report(s){$('status').textContent=s;}
function info(){const a=CAMPAIGN[realm-1];sel.value=String(realm);$('realmTitle').textContent=`Reino ${realm}/10 · ${a[0]} · Terr. ${territory}/${a[1]}`;}
function capture(){try{const s=frame.contentWindow.CM25RealmBridge?.status();if(s&&s.realm===realm){identity={hero:s.hero,name:s.name,className:s.className};sessionStorage.setItem('cm25TesteIdentidade',JSON.stringify(identity))}}catch(e){console.warn('Não foi possível preservar personagem',e)}}
function switchRealm(next,target=1,direct=true){
 if(next<1||next>10){report('Limite da campanha: Reino '+realm);return;}
 // Preservar o personagem também ao mudar de território no mesmo reino.
 if(ready)capture();
 if(autoTimer){clearTimeout(autoTimer);autoTimer=null;}
 realm=next;territory=target;pendingArea=target;ready=false;entering=false;automaticEntry=direct;loadId++;
 info();report(`Carregando ${CAMPAIGN[realm-1][0]} · território ${target}…`);
 // Transição teste: nunca mostrar a tela de seleção durante F6/F7/F8.
 // A iframe continua renderizando; apenas seu conteúdo fica invisível
 // até que a batalha esteja inicializada e desenhada.
 frame.style.opacity=direct?'0':'1';
 frame.style.pointerEvents=direct?'none':'auto';
 frame.src=`reinos/${String(realm).padStart(2,'0')}/index.html?cm25=${loadId}&direct=${direct?'1':'0'}`;
}
// READY confirma o código do iframe, mas não o carregamento das imagens.
// Aguardar o cenário antes de iniciar uma área nos testes rápidos.
const backgroundCache=new Map();
function preloadScene(realmNumber,areaNumber){
 // O quinto território do Reino 2 é a arena original da V2.4,
 // sem um cenario_5.jpg local. Não bloquear essa luta.
 if(realmNumber===2&&areaNumber===5)return Promise.resolve();
 const url=new URL(`reinos/${String(realmNumber).padStart(2,'0')}/assets_v25/cenarios/cenario_${areaNumber}.jpg`,location.href).href;
 if(backgroundCache.has(url))return backgroundCache.get(url);
 const job=new Promise((resolve,reject)=>{
  const image=new Image();let done=false;
  const timeout=setTimeout(()=>finish(new Error('Tempo excedido ao carregar o cenário')),30000);
  const finish=error=>{if(done)return;done=true;clearTimeout(timeout);image.onload=null;image.onerror=null;error?reject(error):resolve()};
  image.onload=()=>image.naturalWidth>0?finish():finish(new Error('Imagem vazia'));
  image.onerror=()=>finish(new Error('Não foi possível baixar o cenário'));
  image.src=url;
  if(image.complete&&image.naturalWidth>0)finish();
 });
 backgroundCache.set(url,job);
 job.catch(()=>backgroundCache.delete(url));
 return job;
}
async function area(n){
 const maximum=CAMPAIGN[realm-1][1];n=Math.max(1,Math.min(maximum,n));
 if(!ready){pendingArea=n;territory=n;info();report('Carregando recursos antes de abrir território '+n+'…');return;}
 if(entering){report('Território em preparação; aguarde o cenário carregar.');return;}
 entering=true;
 const token=loadId,selectedRealm=realm;
 try{
  report(`Preparando cenário do Reino ${selectedRealm} · território ${n}…`);
  await preloadScene(selectedRealm,n);
  // Um salto novo pode ter invalidado o carregamento anterior.
  if(token!==loadId||selectedRealm!==realm||!ready)return;
  const bridge=frame.contentWindow.CM25RealmBridge;
  if(!bridge||bridge.realm!==realm)throw Error('Ligação do reino não está pronta');
  const confirmed=bridge.selectArea(n-1,identity),status=bridge.status();
  if(confirmed!==n||!status.active||status.territory!==n)throw Error('O jogo não confirmou a entrada no território');
  if(n<maximum&&status.monstersLoaded===0)throw Error('Nenhum monstro foi criado; território interrompido para evitar cenário vazio');
  // Espera pelo primeiro desenho real da fase, não apenas pelo DOMContentLoaded.
  // Opacity 0 não pausa o loop, ao contrário de display:none/visibility:hidden.
  await new Promise(resolve=>{
    let finished=false;
    const done=()=>{if(finished)return;finished=true;clearTimeout(limit);resolve();};
    const limit=setTimeout(done,700);
    try{const win=frame.contentWindow;win.requestAnimationFrame(()=>win.requestAnimationFrame(done));}
    catch(e){done();}
  });
  if(token!==loadId||selectedRealm!==realm)return;
  territory=n;pendingArea=0;campaignStarted=true;info();
  frame.style.opacity='1';frame.style.pointerEvents='auto';
  frame.focus();try{frame.contentWindow.focus()}catch(e){}
  report(`Reino ${realm} · território ${n} · ${n===maximum?'chefão':status.monstersLoaded+' monstros carregados'}`);
 }catch(e){
  if(token===loadId){frame.style.opacity='1';frame.style.pointerEvents='auto';report('ERRO AO ABRIR TERRITÓRIO: '+String(e.message||e));console.error('[ClassMana] Falha ao iniciar',selectedRealm,n,e);}
 }finally{if(token===loadId)entering=false;}
}
function command(key,shift=false){
 if(key==='F8'){if(realm+(shift?-1:1)<1||realm+(shift?-1:1)>10){report('Limite da campanha');return;}switchRealm(realm+(shift?-1:1),1);return;}
 if(key==='F7'){switchRealm(realm,CAMPAIGN[realm-1][1],true);return;}
 if(key==='F6'){
  if(!campaignStarted){switchRealm(realm,Math.min(2,CAMPAIGN[realm-1][1]),true);return;}
  if(!ready){report('Carregamento do reino em andamento; comando ignorado');return;}
  try{const s=frame.contentWindow.CM25RealmBridge?.status();if(s?.active&&s.realm===realm)territory=s.territory;}catch(e){}
  if(territory<CAMPAIGN[realm-1][1])switchRealm(realm,territory+1,true);
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
$('startHere').onclick=()=>switchRealm(realm,1,true);
$('f6').onclick=()=>command('F6');$('f7').onclick=()=>command('F7');$('f8').onclick=()=>command('F8');$('prev').onclick=()=>command('F8',true);
$('musicButton').onclick=()=>{try{const game=frame.contentWindow;const ok=game.ClassManaNucleo?.audio?.play();report(ok?'Música solicitada para o reino atual. Se estiver sem som, confira o botão de áudio no jogo e a conexão.':'Não foi possível iniciar a música. Inicie o território e tente novamente.')}catch(e){report('Áudio indisponível: '+e.message)}};
$('helpButton').onclick=()=>{$('help').hidden=!$('help').hidden};
setInterval(()=>{
 if(!ready)return;try{const s=frame.contentWindow.CM25RealmBridge?.status();if(s&&s.realm===realm&&s.active&&s.territory!==territory){territory=s.territory;info();}}catch(e){}
},900);
// Em cada abertura começar de forma previsível no primeiro reino. Selecionar outro reino inicia automaticamente o seu T1.
switchRealm(1,1,false);
