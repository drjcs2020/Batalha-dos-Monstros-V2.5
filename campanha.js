
'use strict';
/* Campanha V2.5 — entrada completa do jogo e salvamento isolado.
   Os territórios avançam pelo combate, sem atalhos de teste. */
const CAMPAIGN=window.CM25_CONFIG.reinos.map(r=>[r.nome,r.territorios,r.dificuldade]);
const $=id=>document.getElementById(id),frame=$('gameWindow');
let realm=1,territory=1,ready=false,pendingArea=1,identity=null,loadId=0,autoTimer=null,automaticEntry=false,campaignStarted=false,entering=false;
try{identity=JSON.parse(sessionStorage.getItem('cm25TesteIdentidade')||'null')}catch(e){}
let statusTimer=null;
function report(s){
 const status=$('status');status.textContent=s;
 if(statusTimer){clearTimeout(statusTimer);statusTimer=null;}
 const visible=/⚠|ERRO|falha|salvo|encerrada|registrado/i.test(s);
 status.classList.toggle('visible',visible);
 if(visible&&!/⚠|ERRO|falha/i.test(s))
  statusTimer=setTimeout(()=>status.classList.remove('visible'),3500);
}
function info(){const a=CAMPAIGN[realm-1];$('realmTitle').textContent=`Reino ${realm}/10 · ${a[0]} · Terr. ${territory}/${a[1]}`;}
function capture(){try{const s=frame.contentWindow.CM25RealmBridge?.status();if(s&&s.active&&s.realm===realm&&s.id_aluno&&String(s.id_aluno)===String(identity?.id_aluno)){identity={...identity,hero:s.hero,name:s.name,className:s.className,personagem:s.personagem||identity.personagem};sessionStorage.setItem('cm25TesteIdentidade',JSON.stringify(identity))}}catch(e){console.warn('Não foi possível preservar personagem',e)}}
// Placar/continuidade da V2.5, sem nenhuma chamada à implantação da V2.4.
const CM25_SAVE_API="https://script.google.com/macros/s/AKfycbx47UtNCTdpQ4OukNxdzrcsFH2Mf1xCLO5mspGClV6Sn4OelwIZai3ZJn_Q8aVPp2Z-/exec";

// A música da barra inicia no próprio controlador, antes da carga do motor.
// Navegadores que bloqueiam autoplay recebem um botão discreto no 0%.
const cm25LoadingMusic=new Audio(new URL('assets/sons/cm_preparing_for_battle.mp3',location.href).href);
cm25LoadingMusic.preload='auto';
cm25LoadingMusic.loop=true;
cm25LoadingMusic.volume=.36;
let cm25OpeningDone=false;
const cm25SoundButton=$('enableLoadingSound');
function cm25StopLoadingMusic(){
 cm25OpeningDone=true;
 cm25SoundButton.hidden=true;
 try{cm25LoadingMusic.pause();cm25LoadingMusic.currentTime=0;}catch(e){}
}
function cm25StartLoadingMusic(){
 if(cm25OpeningDone)return;
 try{
  const started=cm25LoadingMusic.play();
  if(started&&typeof started.then==='function')
   started.then(()=>{cm25SoundButton.hidden=true;})
    .catch(()=>{if(!cm25OpeningDone)cm25SoundButton.hidden=false;});
 }catch(e){cm25SoundButton.hidden=false;}
}
cm25SoundButton.addEventListener('click',cm25StartLoadingMusic);
cm25LoadingMusic.load();
cm25StartLoadingMusic();

let currentRun=null,revision=0,pendingSnapshot=null,saveChain=Promise.resolve(),lastCheckpoint=0,entryBusy=false,endingRun=false;
let cm25GetSequence=0;
function getV25(params){
 return new Promise((resolve,reject)=>{
  const callback='cmV25Callback_'+(++cm25GetSequence),script=document.createElement('script');
  let finished=false;
  const timer=setTimeout(()=>finish(new Error('Tempo esgotado ao consultar o progresso.')),16000);
  function finish(error,data){
   if(finished)return;finished=true;clearTimeout(timer);script.remove();
   try{delete window[callback]}catch(e){window[callback]=undefined}
   if(error)reject(error);else resolve(data);
  }
  window[callback]=data=>finish(null,data);
  script.onerror=()=>finish(new Error('Falha na consulta ao Apps Script da V2.5.'));
  script.src=CM25_SAVE_API+'?'+new URLSearchParams({...params,callback,_:String(Date.now())});
  document.head.appendChild(script);
 });
}
// Apps Script ContentService normalmente não libera CORS para leitura de POST.
// A gravação é feita como pedido simples, e CONFIRMADA por GET/JSONP da planilha.
// Sem confirmação não anunciamos que uma partida foi salva.
async function postV25(data){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(CM25_SAVE_API,{method:'POST',mode:'no-cors',
   headers:{'Content-Type':'text/plain;charset=utf-8'},
   body:JSON.stringify(data),redirect:'follow',signal:controller.signal});
  // Uma resposta opaque apenas prova o envio, não que o script aceitou.
  // Consultar o estado até confirmar a revisão ou a substituição da partida.
  let lastError=null;
  for(let n=0;n<7;n++){
   if(n)await new Promise(r=>setTimeout(r,850));
   try{
    const confirm=await getV25({acao:'progresso',id_aluno:data.id_aluno,turma:data.turma});
    if(!confirm||confirm.success!==true)throw Error(confirm?.erro||'Falha ao consultar confirmação');
    if(data.acao==='nova_partida'&&confirm.existe&&confirm.partida?.partida_id&&
       confirm.partida.partida_id!==data.partida_anterior)
      return {success:true,partida:confirm.partida};
    if(data.acao==='salvar_progresso'&&confirm.existe&&
       confirm.partida?.partida_id===data.partida_id&&
       Number(confirm.partida.revisao)>=Number(data.revisao))
      return {success:true,salvo:true,revisao:confirm.partida.revisao};
    if(data.acao==='finalizar_partida'&&!confirm.existe)
      return {success:true,resultado_registrado:true};
   }catch(err){lastError=err;}
  }
  throw new Error('O Google Sheets não confirmou a gravação. '+String(lastError?.message||''));
 }finally{clearTimeout(timer);}
}
function currentSnapshot(allowInactive=false){
 if(!currentRun||!identity?.id_aluno||!ready)return null;
 try{
  const status=frame.contentWindow.CM25RealmBridge?.status();
  if(!status||(!allowInactive&&!status.active)||status.realm!==realm)return null;
  if(String(status.id_aluno)!==String(identity.id_aluno))return null;
  return {reino:realm,territorio:status.territory||territory,
   heroi_indice:Number.isInteger(status.hero)?status.hero:identity.hero,
   personagem:String(status.personagem||identity.personagem||''),
   hp:Math.round(Number(status.hp??100)),mana:Math.round(Number(status.mana??100)),
   pontuacao:Math.round(Number(status.score)||0),tempo:Math.round(Number(status.tempo)||0),
   gameEnded:!!status.gameEnded};
 }catch(e){return null;}
}
function queueCheckpoint(snapshot,final=false,resultado='ENCERRADA'){
 if(!currentRun||!identity?.id_aluno||!snapshot||endingRun)return saveChain;
 if(final)endingRun=true;
 const request={acao:final?'finalizar_partida':'salvar_progresso',
  id_aluno:identity.id_aluno,turma:identity.className,partida_id:currentRun.partida_id,
  revisao:++revision,reino:snapshot.reino,territorio:snapshot.territorio,
  heroi_indice:snapshot.heroi_indice,personagem:snapshot.personagem,
  hp:snapshot.hp,mana:snapshot.mana,pontuacao:snapshot.pontuacao,tempo:snapshot.tempo};
 if(final)request.resultado=resultado;
 // Uma fila para evitar que um checkpoint antigo sobreponha o mais recente.
 saveChain=saveChain.catch(()=>{}).then(()=>postV25(request)).then(data=>{
  if(final){report('Partida encerrada e resultado enviado à V2.5.');currentRun=null;}
  else{lastCheckpoint=Date.now();report('Progresso salvo automaticamente · reino '+request.reino+' · território '+request.territorio);}
  return data;
 }).catch(error=>{
  console.error('[ClassMana V2.5] Falha no salvamento',error);
  report('⚠ Progresso não confirmado online: '+String(error.message||error));
  if(final)endingRun=false;
  throw error;
 });
 // O chamador de salvamentos automáticos não deve provocar unhandled rejection.
 saveChain.catch(()=>{});
 return saveChain;
}
function makeElement(tag,css,text){
 const el=document.createElement(tag);
 if(css)el.style.cssText=css;
 if(text)el.textContent=text;
 return el;
}
function chooseJourney(saved){
 return new Promise(resolve=>{
  const base='https://drjcs2020.github.io/classmana-batalha-dos-monstros-V2/assets/';
  const backdrop=makeElement('div');
  backdrop.id='cm25JourneyDialog';
  backdrop.setAttribute('role','dialog');
  backdrop.setAttribute('aria-modal','true');
  backdrop.setAttribute('aria-labelledby','cm25JourneyTitle');
  const panel=makeElement('div');panel.id='cm25JourneyPanel';
  const logo=makeElement('img');logo.id='cm25JourneyLogo';logo.src=base+'logo.png';logo.alt='ClassMana';
  panel.appendChild(logo);
  const decor=makeElement('div');decor.id='cm25JourneyDecor';
  for(const item of ['shield.png','crystal.png','potion.png']){
   const picture=makeElement('img');picture.src=base+'items3d/'+item;picture.alt='';picture.setAttribute('aria-hidden','true');decor.appendChild(picture);
  }
  panel.appendChild(decor);
  const title=makeElement('h2','','SUA JORNADA');
  title.id='cm25JourneyTitle';panel.appendChild(title);
  const status=makeElement('p','',saved
   ?'PARTIDA ANTERIOR ENCONTRADA'
   :'PRONTO PARA COMEÇAR UMA NOVA AVENTURA!');
  status.id='cm25JourneyStatus';panel.appendChild(status);
  const description=makeElement('p','',
   saved?'Reino '+saved.reino+' · Território '+saved.territorio+' · '+Number(saved.pontuacao||0).toLocaleString('pt-BR')+' pontos'+
    (saved.personagem?' · '+saved.personagem:''):
    'Seu herói iniciará no Reino 1, Território 1, com a pontuação zerada.');
  panel.appendChild(description);
  const note=makeElement('p','','Continuar mantém o herói salvo. Nova partida permite trocar de herói, mas reinicia o progresso atual.');
  note.className='cm25JourneyNote';panel.appendChild(note);
  let pending=false,confirmNew=false;
  const actions=makeElement('div');panel.appendChild(actions);
  function choose(value,button){
   if(pending)return;
   if(value==='new'&&saved&&!confirmNew){
    confirmNew=true;
    title.textContent='CONFIRMAR NOVA PARTIDA?';
    status.textContent='ATENÇÃO: SUA JORNADA ATUAL SERÁ SUBSTITUÍDA';
    description.textContent='Você começará no Reino 1 com o herói escolhido na seleção. Os pontos da jornada em andamento serão zerados. Resultados anteriores já finalizados permanecerão no histórico.';
    note.textContent='Se quiser manter seu progresso, escolha Voltar e depois Continuar partida.';
    [...actions.querySelectorAll('button')].forEach(x=>{x.hidden=x!==button&&x.dataset.action!=='cancel';});
    button.textContent='✔ CONFIRMAR NOVA JORNADA';
    const cancel=actions.querySelector('[data-action="cancel"]');
    if(cancel)cancel.textContent='↩ VOLTAR';
    return;
   }
   if(value==='cancel'&&confirmNew){
    confirmNew=false;backdrop.remove();resolve('cancel');return;
   }
   pending=true;button.classList.add('is-selected');
   [...actions.querySelectorAll('button')].forEach(x=>x.disabled=true);
   window.setTimeout(()=>{backdrop.remove();resolve(value);},230);
  }
  function button(label,value,cancel=false){
   const b=makeElement('button','',label);
   b.type='button';b.className='cm25JourneyButton'+(cancel?' cm25JourneyCancel':'');
   b.dataset.action=value;
   b.onclick=()=>choose(value,b);
   actions.appendChild(b);
   return b;
  }
  if(saved)button('▶ CONTINUAR COM O HERÓI SALVO','continue');
  button('✦ COMEÇAR NOVA PARTIDA','new');
  button('↩ CANCELAR','cancel',true);
  backdrop.appendChild(panel);document.body.appendChild(backdrop);
  actions.querySelector('button')?.focus();
 });
}
async function enterRegisteredStudent(profile){
 if(entryBusy)return;
 entryBusy=true;
 const previousRun=currentRun,previousIdentity=identity;
 try{
  if(!profile?.id_aluno||!profile?.name||!profile?.className)throw Error('Selecione seu nome cadastrado e a turma.');
  report('Consultando sua partida na V2.5…');
  const found=await getV25({acao:'progresso',id_aluno:profile.id_aluno,turma:profile.className});
  if(found?.success!==true)throw Error(found?.erro||'Não foi possível consultar seu progresso.');
  const existing=found.existe?found.partida:null;
  const choice=await chooseJourney(existing);
  if(choice==='cancel'){report('Escolha cancelada. Seu progresso está preservado.');return;}
  // Seleção não pode reaparecer enquanto o servidor confirma e prepara a batalha.
  const introMenu=frame.contentWindow.document.getElementById('menu');
  const introMenuState=introMenu?{display:introMenu.style.display,hidden:introMenu.classList.contains('hidden')}:null;
  if(introMenu){introMenu.classList.add('hidden');introMenu.style.display='none';}
  $('transitionLoading').hidden=false;
  $('transitionLabel').textContent=choice==='new'?'Iniciando sua jornada…':'Recuperando sua partida…';
  frame.style.pointerEvents='none';
  let journeyEntered=false;
  try{
  const record=choice==='new'
    ?await postV25({acao:'nova_partida',id_aluno:profile.id_aluno,turma:profile.className,partida_anterior:existing?.partida_id||'',heroi_indice:profile.hero,personagem:profile.personagem||''})
    :{success:true,partida:existing};
  if(record?.success!==true||!record.partida?.partida_id)throw Error(record?.erro||'Partida não foi confirmada pelo servidor.');
  const game=record.partida;
  identity={id_aluno:String(profile.id_aluno),hero:choice==='new'?profile.hero:(Number.isInteger(Number(game.heroi_indice))?Number(game.heroi_indice):profile.hero),
   name:String(profile.name),className:String(profile.className),personagem:game.personagem||''};
  sessionStorage.setItem('cm25TesteIdentidade',JSON.stringify(identity));
  currentRun={partida_id:String(game.partida_id)};
  revision=Number(game.revisao)||0;endingRun=false;lastCheckpoint=0;
  pendingSnapshot={reino:game.reino||1,territorio:game.territorio||1,
   heroi_indice:identity.hero,personagem:game.personagem||'',
   hp:game.hp??100,mana:game.mana??100,pontuacao:game.pontuacao||0,tempo:game.tempo||0,
   id_aluno:identity.id_aluno,showTutorial:choice==='new'};
  // No primeiro reino, reutilizar a tela que já mostrou barra de carregamento,
  // vídeo, narração, seleção de herói e cadastro: sem recarregar o áudio.
  const bridge=ready&&!campaignStarted?frame.contentWindow.CM25RealmBridge:null;
  if(bridge&&bridge.realm===pendingSnapshot.reino){
   automaticEntry=true;pendingArea=pendingSnapshot.territorio;
   if(!await area(pendingArea))throw Error('Não foi possível iniciar o território.');
  }else switchRealm(pendingSnapshot.reino,pendingSnapshot.territorio,true);
  journeyEntered=true;
  }finally{
   // Se o carregamento falhar, permitir nova tentativa sem novo cadastro.
   if(!journeyEntered){
    $('transitionLoading').hidden=true;
    frame.style.pointerEvents='auto';
    if(introMenu&&introMenu.isConnected&&introMenuState){
     if(!introMenuState.hidden)introMenu.classList.remove('hidden');
     introMenu.style.display=introMenuState.display;
    }
   }
  }
 }catch(error){
  currentRun=previousRun;identity=previousIdentity;
  console.error('[ClassMana] Entrada V2.5',error);
  report('⚠ Não foi possível abrir a partida: '+String(error.message||error));
  alert('Falha no acesso ao salvamento V2.5. A partida não foi iniciada. '+String(error.message||error));
 }finally{entryBusy=false;}
}

function switchRealm(next,target=1,direct=true){
 if(next<1||next>10){report('Limite da campanha: Reino '+realm);return;}
 if(direct)cm25StopLoadingMusic();
 // Preservar o personagem também ao mudar de território no mesmo reino.
 if(ready)capture();
 // Antes da primeira batalha, o iframe ainda contém a tela de cadastro;
 // seus valores NÃO podem substituir um progresso recuperado do servidor.
 const before=campaignStarted?(currentSnapshot(true)||pendingSnapshot):pendingSnapshot;
 if(currentRun&&before){
  pendingSnapshot={...before,reino:next,territorio:target};
  if(campaignStarted)queueCheckpoint(pendingSnapshot).catch(()=>{});
 }
 if(autoTimer){clearTimeout(autoTimer);autoTimer=null;}
 realm=next;territory=target;pendingArea=target;ready=false;entering=false;automaticEntry=direct;loadId++;
 info();report(`Carregando ${CAMPAIGN[realm-1][0]} · território ${target}…`);
 // A entrada inicial preserva o carregamento/vídeo originais.
 // Só as mudanças de reino usam a transição discreta, sem recarregar a abertura.
 frame.style.opacity=direct?'0':'1';
 frame.style.pointerEvents=direct?'none':'auto';
 $('transitionLoading').hidden=!direct;
 $('transitionLabel').textContent='Preparando Reino '+next+' · '+CAMPAIGN[next-1][0]+'…';
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
 if(!ready){pendingArea=n;territory=n;info();report('Carregando recursos antes de abrir território '+n+'…');return false;}
 if(entering){report('Território em preparação; aguarde o cenário carregar.');return false;}
 entering=true;
 const token=loadId,selectedRealm=realm;
 try{
  report(`Preparando cenário do Reino ${selectedRealm} · território ${n}…`);
  await preloadScene(selectedRealm,n);
  // Um salto novo pode ter invalidado o carregamento anterior.
  if(token!==loadId||selectedRealm!==realm||!ready)return false;
  const bridge=frame.contentWindow.CM25RealmBridge;
  if(!bridge||bridge.realm!==realm)throw Error('Ligação do reino não está pronta');
  const confirmed=bridge.selectArea(n-1,identity);
  if(pendingSnapshot){
   if(!bridge.restoreProgress?.({...pendingSnapshot,id_aluno:identity?.id_aluno}))
    throw Error('Não foi possível restaurar o herói e a pontuação.');
   if(pendingSnapshot.showTutorial&&realm===1&&n===1)
    bridge.startTutorial?.();
  }
  const status=bridge.status();
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
  if(token!==loadId||selectedRealm!==realm)return false;
  territory=n;pendingArea=0;campaignStarted=true;info();
  pendingSnapshot=null;
  $('transitionLoading').hidden=true;
  frame.style.opacity='1';frame.style.pointerEvents='auto';
  frame.focus();try{frame.contentWindow.focus()}catch(e){}
  report(`Reino ${realm} · território ${n} · ${n===maximum?'chefão':status.monstersLoaded+' monstros carregados'}`);
  return true;
 }catch(e){
  if(token===loadId){$('transitionLoading').hidden=true;frame.style.opacity='1';frame.style.pointerEvents='auto';report('ERRO AO ABRIR TERRITÓRIO: '+String(e.message||e));console.error('[ClassMana] Falha ao iniciar',selectedRealm,n,e);}
  return false;
 }finally{if(token===loadId)entering=false;}
}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.namespace!=='CM25')return;
 const data=e.data;if(String(data.token)!==String(loadId)||data.realm!==realm)return;
 if(data.action==='READY'){
   ready=true;
   if(automaticEntry){report('Reino '+realm+' carregado — iniciando território '+pendingArea);if(pendingArea)area(pendingArea);}
   else report('Aguarde o carregamento, assista ou pule o vídeo e selecione seu herói, turma e nome.');
 }
 else if(data.action==='OPENING_VIDEO'){cm25StopLoadingMusic();}
 else if(data.action==='INTRO_DONE'){cm25StopLoadingMusic();report('Selecione seu herói, sua turma e seu nome cadastrado.');}
 else if(data.action==='START'){
   if(automaticEntry||campaignStarted)return;
   enterRegisteredStudent(data.profile||{});
 }
 else if(data.action==='COMPLETE'){
  const completedRealm=realm,completedToken=loadId;
  report('Chefão derrotado! Preparando o próximo reino…');
  if(realm<10)autoTimer=setTimeout(()=>{if(realm===completedRealm&&loadId===completedToken)switchRealm(realm+1,1);},2300);
  else {const snapshot=currentSnapshot(true)||pendingSnapshot;
   if(snapshot)queueCheckpoint(snapshot,true,'VITORIA').catch(()=>{});
  }
 }
});

let stopSaveOpen=false,stopSaveConfirmed=false,stopPauseState=null;
function openStopAndSave(){
 if(stopSaveOpen||!currentRun||!campaignStarted||!ready||entering)return;
 const snapshot=currentSnapshot();
 if(!snapshot){report('⚠ Ainda não foi possível capturar o progresso desta batalha.');return;}
 let bridge=null;
 try{bridge=frame.contentWindow.CM25RealmBridge;}catch(e){}
 const pauseState=bridge?.pauseForSave?.();
 if(!pauseState){report('⚠ Aguarde o início da batalha para parar e salvar.');return;}
 stopPauseState=pauseState;
 stopSaveOpen=true;stopSaveConfirmed=false;
 $('stopSave').hidden=true;
 $('saveMark').textContent='💾';
 $('saveTitle').textContent='Parar e salvar a jornada?';
 $('saveDescription').textContent='Confirme para guardar seu progresso. Você poderá voltar com Continuar partida.';
 $('saveDetails').textContent='Reino '+snapshot.reino+' · Território '+snapshot.territorio+' · '+snapshot.pontuacao.toLocaleString('pt-BR')+' pontos';
 $('saveNotice').textContent='Sua batalha está pausada. O progresso só será considerado salvo após a confirmação do servidor.';
 $('saveNotice').classList.remove('error');
 $('saveConfirm').hidden=false;
 $('saveConfirm').disabled=false;
 $('saveConfirm').textContent='✔ Confirmar e salvar';
 $('saveCancel').disabled=false;
 $('saveCancel').textContent='Continuar jogando';
 $('saveExit').hidden=true;
 $('saveOverlay').hidden=false;
 $('saveConfirm').focus();
}
function closeStopAndResume(){
 if(!stopSaveOpen)return;
 try{frame.contentWindow.CM25RealmBridge?.resumeAfterSave?.(stopPauseState);}catch(e){console.warn('[V2.5] Retorno do jogo:',e);}
 stopPauseState=null;stopSaveOpen=false;stopSaveConfirmed=false;
 $('saveOverlay').hidden=true;
 $('stopSave').hidden=false;
 $('stopSave').focus();
}
async function confirmStopAndSave(){
 if(!stopSaveOpen||stopSaveConfirmed||$('saveConfirm').disabled)return;
 const confirm=$('saveConfirm'),cancel=$('saveCancel'),notice=$('saveNotice');
 confirm.disabled=true;cancel.disabled=true;
 confirm.textContent='⏳ Salvando e confirmando…';
 notice.textContent='Enviando para o Google Sheets. Não feche esta página durante a confirmação.';
 notice.classList.remove('error');
 try{
  const snapshot=currentSnapshot();
  if(!snapshot)throw Error('Não foi possível recuperar o estado desta batalha.');
  // Mantém a partida em andamento para Continuar; NÃO finaliza nem duplica o ranking.
  await queueCheckpoint(snapshot);
  stopSaveConfirmed=true;
  $('saveMark').textContent='✅';
  $('saveTitle').textContent='Partida salva com sucesso!';
  $('saveDescription').textContent='Seu progresso está confirmado. Você pode voltar mais tarde e escolher Continuar partida.';
  $('saveDetails').textContent='Reino '+snapshot.reino+' · Território '+snapshot.territorio+' · '+snapshot.pontuacao.toLocaleString('pt-BR')+' pontos';
  notice.textContent='Salvamento confirmado no ClassMana V2.5. Agora você pode fechar a aba com segurança.';
  confirm.hidden=true;cancel.disabled=false;cancel.textContent='Retomar batalha';
  $('saveExit').hidden=false;
  $('saveExit').focus();
 }catch(error){
  console.error('[ClassMana V2.5] Parar e salvar:',error);
  notice.textContent='⚠ O salvamento não foi confirmado. Sua batalha está pausada; tente novamente ou continue jogando.';
  notice.classList.add('error');
  confirm.textContent='↻ Tentar salvar novamente';
  confirm.disabled=false;cancel.disabled=false;
 }
}
$('stopSave').addEventListener('click',openStopAndSave);
$('saveCancel').addEventListener('click',closeStopAndResume);
$('saveConfirm').addEventListener('click',confirmStopAndSave);
$('saveExit').addEventListener('click',()=>{
 if(stopSaveConfirmed)location.reload();
});

setInterval(()=>{
 if(!ready)return;
 try{
  const s=frame.contentWindow.CM25RealmBridge?.status();
  if(!s||s.realm!==realm||!s.active){
   $('stopSave').hidden=true;
   return;
  }
  const stopBtn=$('stopSave');
  stopBtn.hidden=!(currentRun&&campaignStarted&&!stopSaveOpen&&!endingRun);
  if(!stopBtn.hidden)stopBtn.disabled=!s.playing||s.paused||entering;
  // Sem atualização de tempo/pontos enquanto a confirmação está aberta.
  if(stopSaveOpen)return;
  if(s.territory!==territory){
   territory=s.territory;info();
   const checkpoint=currentSnapshot();
   if(checkpoint)queueCheckpoint(checkpoint).catch(()=>{});
  }
  if(currentRun&&!endingRun){
   const snapshot=currentSnapshot();
   if(snapshot?.gameEnded)queueCheckpoint(snapshot,true,'DERROTA').catch(()=>{});
   else if(snapshot&&Date.now()-lastCheckpoint>15000&&!entering){
    lastCheckpoint=Date.now();queueCheckpoint(snapshot).catch(()=>{});
   }
  }
 }catch(e){console.error('[ClassMana V2.5] Monitor',e);}
},900);
// Abertura original: barra de carregamento, vídeo, áudio e seleção antes de jogar.
switchRealm(1,1,false);
