
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
document.addEventListener('pointerdown',()=>{if(!cm25OpeningDone&&cm25LoadingMusic.paused)cm25StartLoadingMusic();},{passive:true});
document.addEventListener('keydown',()=>{if(!cm25OpeningDone&&cm25LoadingMusic.paused)cm25StartLoadingMusic();});
cm25LoadingMusic.load();
cm25StartLoadingMusic();

let currentRun=null,revision=0,pendingSnapshot=null,checkpointInFlight=null,pendingAutoSnapshot=null,manualCheckpointPending=false,lastCheckpoint=0,entryBusy=false,endingRun=false,finalSnapshot=null,bonusExitBusy=false;
let cm25GetSequence=0;
function getV25(params,timeoutMs=16000){
 return new Promise((resolve,reject)=>{
  const callback='cmV25Callback_'+(++cm25GetSequence),script=document.createElement('script');
  let finished=false;
  const timer=setTimeout(()=>finish(new Error('Tempo esgotado ao consultar o progresso.')),timeoutMs);
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
async function postV25(data,deadlineMs=18000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.min(10000,deadlineMs));
 const deadline=Date.now()+deadlineMs;
 try{
  const response=await fetch(CM25_SAVE_API,{method:'POST',mode:'no-cors',
   headers:{'Content-Type':'text/plain;charset=utf-8'},
   body:JSON.stringify(data),redirect:'follow',signal:controller.signal});
  // Uma resposta opaque apenas prova o envio, não que o script aceitou.
  // Consultar o estado até confirmar a revisão ou a substituição da partida.
  let lastError=null;
  for(let n=0;n<7&&Date.now()<deadline;n++){
   if(n)await new Promise(r=>setTimeout(r,Math.min(650,Math.max(0,deadline-Date.now()-1200))));
   const remaining=deadline-Date.now();if(remaining<1150)break;
   try{
    const confirm=await getV25({acao:'progresso',id_aluno:data.id_aluno,turma:data.turma},Math.min(2700,remaining));
    if(!confirm||confirm.success!==true)throw Error(confirm?.erro||'Falha ao consultar confirmação');
    if(data.acao==='nova_partida'&&confirm.existe&&confirm.partida?.partida_id&&
       confirm.partida.partida_id!==data.partida_anterior)
      return {success:true,partida:confirm.partida};
    if(data.acao==='salvar_progresso'&&confirm.existe&&
       confirm.partida?.partida_id===data.partida_id&&
       Number(confirm.partida.revisao)>=Number(data.revisao))
      return {success:true,salvo:true,revisao:confirm.partida.revisao};
    if(data.acao==='finalizar_partida'){
      // Uma finalização é válida se o progresso desapareceu OU se o servidor
      // confirmou status terminal para a MESMA PARTIDA_ID.
      if(!confirm.existe)return {success:true,resultado_registrado:true};
      const state=String(confirm.partida?.status||confirm.partida?.STATUS||'').toUpperCase();
      if(String(confirm.partida?.partida_id||'')===String(data.partida_id)&&
         ['FINALIZADA','ENCERRADA','VITORIA','DERROTA','CONCLUIDA'].includes(state))
        return {success:true,resultado_registrado:true};
    }
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
// Gravação sequencial com fila de tamanho máximo 1: checkpoints automáticos
// não se acumulam; o clique manual fica na frente dos próximos automáticos.
function queueCheckpoint(snapshot,final=false,resultado='ENCERRADA',manual=false){
 if(!currentRun||!identity?.id_aluno||!snapshot)
  return Promise.reject(Error('Nenhuma partida válida para salvar.'));
 if(endingRun&&!final)return checkpointInFlight||Promise.resolve({ignorado:true});
 const priority=manual||final;
 if(!priority&&(checkpointInFlight||manualCheckpointPending)){
  // Um único checkpoint pendente, atualizado para o estado mais recente.
  pendingAutoSnapshot={...snapshot};
  lastCheckpoint=Date.now();
  return Promise.resolve({adiado:true});
 }
 if(priority&&manualCheckpointPending)
  return checkpointInFlight||Promise.reject(Error('Salvamento manual já em andamento.'));
 if(priority){manualCheckpointPending=true;pendingAutoSnapshot=null;}
 if(final)endingRun=true;
 const runId=String(currentRun.partida_id),studentId=String(identity.id_aluno),turma=identity.className;
 const previous=checkpointInFlight;
 lastCheckpoint=Date.now();
 const job=Promise.resolve().then(async()=>{
  if(previous)await previous.catch(()=>{});
  if(!currentRun||String(currentRun.partida_id)!==runId)
   throw Error('A partida mudou antes do registro.');
  const request={acao:final?'finalizar_partida':'salvar_progresso',
   id_aluno:studentId,turma,partida_id:runId,revisao:++revision,
   reino:snapshot.reino,territorio:snapshot.territorio,
   heroi_indice:snapshot.heroi_indice,personagem:snapshot.personagem,
   hp:snapshot.hp,mana:snapshot.mana,pontuacao:snapshot.pontuacao,tempo:snapshot.tempo};
  if(final)request.resultado=resultado;
  const result=await postV25(request,priority?19000:14000);
  if(final){report('Partida encerrada e confirmada na V2.5.');currentRun=null;}
  else if(priority)report('Progresso confirmado no Google Sheets.');
  lastCheckpoint=Date.now();
  return result;
 }).catch(error=>{
  console.error('[ClassMana V2.5] Falha no salvamento',error);
  report('⚠ O servidor não confirmou o progresso: '+String(error.message||error));
  if(final)endingRun=false;
  throw error;
 }).finally(()=>{
  if(checkpointInFlight===job)checkpointInFlight=null;
  if(priority)manualCheckpointPending=false;
  if(!checkpointInFlight&&!manualCheckpointPending&&!endingRun&&pendingAutoSnapshot&&
     currentRun&&String(currentRun.partida_id)===runId){
   const newest=pendingAutoSnapshot;
   pendingAutoSnapshot=null;
   queueCheckpoint(newest).catch(()=>{});
  }
 });
 checkpointInFlight=job;
 job.catch(()=>{});
 return job;
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
  const overlay=makeElement('div');overlay.id='cm25JourneyDialog';
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','cm25JourneyTitle');
  const panel=makeElement('div');panel.id='cm25JourneyPanel';
  const logo=makeElement('img');logo.id='cm25JourneyLogo';logo.src=base+'logo.png';logo.alt='ClassMana';panel.append(logo);
  const eyebrow=makeElement('div','','⚔ CLASSMANA • BATALHA DOS MONSTROS');eyebrow.className='cm25JourneyEyebrow';panel.append(eyebrow);
  const deco=makeElement('div');deco.id='cm25JourneyDecor';
  for(const name of ['shield.png','crystal.png','potion.png']){
    const img=makeElement('img');img.src=base+'items3d/'+name;img.alt='';img.setAttribute('aria-hidden','true');deco.append(img);
  }
  panel.append(deco);
  const title=makeElement('h2','','ESCOLHA SUA JORNADA');title.id='cm25JourneyTitle';panel.append(title);
  const status=makeElement('div','',saved?'✦ UMA AVENTURA SALVA ESPERA POR VOCÊ':'✦ SUA AVENTURA COMEÇA AQUI');status.id='cm25JourneyStatus';panel.append(status);
  const stats=makeElement('div');stats.className='cm25JourneyStats';panel.append(stats);
  function stat(label,value){const el=makeElement('div');el.className='cm25JourneyStat';el.append(makeElement('strong','',value),makeElement('small','',label));stats.append(el);}
  if(saved){
   const re=Math.max(1,Math.min(10,Number(saved.reino)||1));
   stat('REINO',re+' / 10');stat('TERRITÓRIO',(Number(saved.territorio)||1)+' / '+CAMPAIGN[re-1][1]);stat('PONTOS',Number(saved.pontuacao||0).toLocaleString('pt-BR'));
  }else{stat('REINOS','10');stat('TERRITÓRIOS','49');stat('HERÓIS','6');}
  const description=makeElement('p');description.className='cm25JourneyDescription';panel.append(description);
  const actions=makeElement('div');actions.className='cm25JourneyActions';panel.append(actions);
  const note=makeElement('p');note.className='cm25JourneyNote';panel.append(note);
  const heroFiles=['hero_fada.png','hero_chama.png','hero_lobo.png','hero_cavaleiro.png','hero_maga.png','hero_dragao.png'];
  const heroLabels=['Fada Guerreira','Chama Congelante','Lobo Gatuno','Cavaleiro Guardião','Maga Engenheira','Dragão de Combate'];
  const selected=[...frame.contentWindow.document.querySelectorAll('#heroes .heroPick')].findIndex(x=>x.classList.contains('sel'));
  const stored=Number(saved?.heroi_indice);
  const byName=heroLabels.findIndex(x=>x.toLowerCase()===String(saved?.personagem||'').toLowerCase());
  const hero=saved&&Number.isInteger(stored)&&stored>=0&&stored<6?stored:(byName>=0?byName:Math.max(0,selected));
  const layout=makeElement('div');layout.id='cm25JourneyLayout';
  const portrait=makeElement('div');portrait.id='cm25JourneyHero';
  const image=makeElement('img');image.src=base+heroFiles[hero];image.alt=heroLabels[hero];image.className='cm25JourneyHeroImage';
  portrait.append(makeElement('span','','🛡 HERÓI DA JORNADA'),image,makeElement('strong','',heroLabels[hero]));
  const details=makeElement('div');details.id='cm25JourneyDetails';
  details.append(status,stats,description,actions,note);
  layout.append(portrait,details);panel.append(layout);
  let pending=false,confirmNew=false;
  function finish(value,button){
    if(pending)return;pending=true;button?.classList.add('is-selected');
    actions.querySelectorAll('button').forEach(x=>x.disabled=true);
    overlay.remove();resolve(value);
  }
  function button(label,subtitle,value,kind=''){
    const b=makeElement('button');b.type='button';b.className='cm25JourneyButton '+kind;b.dataset.action=value;
    b.append(document.createTextNode(label));
    if(subtitle){const small=makeElement('span','',subtitle);small.className='cm25ButtonSub';b.append(small);}
    b.onclick=()=>{
      if(pending)return;
      if(value==='cancel'&&confirmNew){confirmNew=false;render();return;}
      if(value==='new'&&saved&&!confirmNew){confirmNew=true;render();return;}
      finish(value,b);
    };
    actions.append(b);return b;
  }
  function render(){
    actions.replaceChildren();
    if(confirmNew){
      title.textContent='REINICIAR AVENTURA?';
      status.textContent='⚠ SUA PARTIDA SALVA SERÁ SUBSTITUÍDA';
      stats.hidden=true;
      description.textContent='Começar do zero reinicia o Reino 1 com zero pontos. O histórico de partidas finalizadas será mantido.';
      note.textContent='Para não perder a aventura atual, volte às opções e escolha CONTINUAR PARTIDA.';
      button('✔ SIM, COMEÇAR DO ZERO','Confirmar a nova jornada','new','cm25JourneyPrimary');
      button('↩ VOLTAR ÀS OPÇÕES','Não reiniciar a partida','cancel','cm25JourneyCancel');
    }else{
      title.textContent='ESCOLHA SUA JORNADA';
      status.textContent=saved?'✦ UMA AVENTURA SALVA ESPERA POR VOCÊ':'✦ SUA AVENTURA COMEÇA AQUI';
      stats.hidden=false;
      description.textContent=saved
       ?'Seu herói '+String(saved.personagem||'')+' e seu progresso estão preservados. Continue do território salvo.'
       :'Selecione seu herói e comece a aventura no Reino 1.';
      note.textContent='Continuar preserva a jornada. Nova partida reinicia o progresso atual somente após confirmação.';
      if(saved)button('▶ CONTINUAR PARTIDA','Reino '+saved.reino+' · Território '+saved.territorio+' · '+Number(saved.pontuacao||0).toLocaleString('pt-BR')+' pontos','continue','cm25JourneyPrimary');
      button('✦ COMEÇAR NOVA PARTIDA','Iniciar no primeiro território','new',saved?'':'cm25JourneyPrimary');
      button('↩ VOLTAR À SELEÇÃO','','cancel','cm25JourneyCancel');
    }
    actions.querySelector('button')?.focus();
  }
  render();overlay.append(panel);document.body.append(overlay);
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
  // Só partidas em andamento podem oferecer a opção CONTINUAR.
  const storedStatus=String(found.partida?.status||found.partida?.STATUS||'EM_ANDAMENTO').toUpperCase();
  const existing=found.existe&&storedStatus==='EM_ANDAMENTO'?found.partida:null;
  const choice=await chooseJourney(existing);
  if(choice==='cancel'){report('Escolha cancelada. Seu progresso está preservado.');return;}
  // Seleção não pode reaparecer enquanto o servidor confirma e prepara a batalha.
  const introMenu=frame.contentWindow.document.getElementById('menu');
  const introMenuState=introMenu?{display:introMenu.style.display,hidden:introMenu.classList.contains('hidden')}:null;
  if(introMenu){introMenu.classList.add('hidden');introMenu.style.display='none';}
  $('transitionLoading').hidden=false;
  $('transitionLabel').textContent=choice==='new'?'O portal está se abrindo…':'Reunindo suas conquistas…';
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
  pendingAutoSnapshot=null;finalSnapshot=null;bonusExitBusy=false;
  pendingSnapshot={reino:Math.max(1,Math.min(10,Number(game.reino)||1)),territorio:Math.max(1,Number(game.territorio)||1),
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
 // A próxima fase é uma intenção de navegação, não uma fase alcançada.
 // Só registrar reino/território depois de confirmar a abertura em area().
 const before=campaignStarted?(currentSnapshot(true)||pendingSnapshot):pendingSnapshot;
 if(currentRun&&before)pendingSnapshot={...before,reino:next,territorio:target};
 if(autoTimer){clearTimeout(autoTimer);autoTimer=null;}
 realm=next;territory=target;pendingArea=target;ready=false;entering=false;automaticEntry=direct;loadId++;
 info();report(`Carregando ${CAMPAIGN[realm-1][0]} · território ${target}…`);
 // A entrada inicial preserva o carregamento/vídeo originais.
 // Só as mudanças de reino usam a transição discreta, sem recarregar a abertura.
 frame.style.opacity=direct?'0':'1';
 frame.style.pointerEvents=direct?'none':'auto';
 $('transitionLoading').hidden=!direct;
 $('transitionLabel').textContent='Portal para '+CAMPAIGN[next-1][0]+'…';
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
  // A entrada no território é um checkpoint oficial, mesmo que o aluno ainda não tenha terminado a fase.
  if(currentRun&&!endingRun){
   const entered=currentSnapshot(true);if(entered)queueCheckpoint(entered).catch(()=>{});
  }
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
async function returnFromBonus(fromDefeat){
 if(bonusExitBusy)return;
 bonusExitBusy=true;
 const loading=$('transitionLoading'),label=$('transitionLabel');
 loading.hidden=false;label.textContent='Confirmando suas conquistas na V2.5…';
 frame.style.pointerEvents='none';
 try{
  // Não duplicar a finalização enquanto o primeiro pedido está em andamento.
  if(checkpointInFlight)await checkpointInFlight.catch(()=>{});
  if(currentRun){
   const snapshot=currentSnapshot(true)||finalSnapshot;
   if(!snapshot)throw Error('Resultado indisponível para confirmar.');
   await queueCheckpoint(snapshot,true,fromDefeat?'DERROTA':'VITORIA',true);
  }
  if(currentRun)throw Error('A finalização ainda não foi confirmada.');
  sessionStorage.removeItem('cm25TesteIdentidade');
  location.reload();
 }catch(error){
  console.error('[ClassMana V2.5] Saída dos bônus:',error);
  report('⚠ Resultado não confirmado: '+String(error.message||error));
  loading.hidden=true;frame.style.pointerEvents='auto';
  try{
   const btn=frame.contentWindow.document.getElementById('bonusViewRanking');
   if(btn){btn.disabled=false;btn.textContent='↻ TENTAR CONFIRMAR E VOLTAR';}
  }catch(e){}
  alert('O resultado ainda não foi confirmado no Google Sheets. Verifique a conexão e clique em TENTAR CONFIRMAR E VOLTAR. A partida será preservada.');
 }finally{bonusExitBusy=false;}
}
window.addEventListener('message',e=>{
 if(e.origin!==location.origin||e.source!==frame.contentWindow||e.data?.namespace!=='CM25')return;
 const data=e.data;if(String(data.token)!==String(loadId)||data.realm!==realm)return;
 if(data.action==='READY'){
   ready=true;
   if(automaticEntry){report('Reino '+realm+' carregado — iniciando território '+pendingArea);if(pendingArea)area(pendingArea);}
   else report('Aguarde o carregamento, assista ou pule o vídeo e selecione seu herói, turma e nome.');
 }
 else if(data.action==='AREA_ADVANCED'){
  if(!campaignStarted||!currentRun||endingRun||entering)return;
  const reached=Number(data.territory)||territory;
  if(reached>territory){
   territory=reached;pendingArea=0;info();
   const snap=currentSnapshot(true);
   if(snap){snap.territorio=reached;queueCheckpoint(snap).catch(()=>{});}
  }
 }
 else if(data.action==='OPENING_VIDEO'){cm25StopLoadingMusic();}
 else if(data.action==='INTRO_DONE'){cm25StopLoadingMusic();report('Selecione seu herói, sua turma e seu nome cadastrado.');}
 else if(data.action==='BONUS_EXIT'){
  returnFromBonus(data.fromDefeat===true);
 }
 else if(data.action==='START'){
   if(automaticEntry||campaignStarted)return;
   enterRegisteredStudent(data.profile||{});
 }
 else if(data.action==='COMPLETE'){
  if(!currentRun||endingRun||stopSaveOpen||autoTimer)return;
  const completedRealm=realm,completedToken=loadId;
  // Gravar somente o reino que foi vencido, jamais antecipar o próximo.
  const completed=currentSnapshot(true);
  if(completed){
   finalSnapshot={...completed};
   completed.reino=realm;
   completed.territorio=CAMPAIGN[realm-1][1];
   if(realm<10)queueCheckpoint(completed).catch(()=>{});
   else queueCheckpoint(completed,true,'VITORIA').then(()=>{
    report('🏆 Campanha concluída! Resultado confirmado no ClassMana.');
   }).catch(()=>{});
  }
  if(realm<10)report('Chefão derrotado! Preparando o próximo reino…');
  else report('🏆 Último chefão derrotado! Confirmando a vitória no servidor…');
  if(realm<10)autoTimer=setTimeout(()=>{
   autoTimer=null;
   if(realm===completedRealm&&loadId===completedToken&&currentRun&&!endingRun)
    switchRealm(realm+1,1);
  },2300);
 }
});

let stopSaveOpen=false,stopSaveConfirmed=false,stopPauseState=null,stopSaveMode='save';
// Apresentação do progresso: imagens 3D do acervo original ClassMana.
const CM25_ITEM_ART='https://drjcs2020.github.io/classmana-batalha-dos-monstros-V2/assets/items3d/';
function cm25SaveVisual(state){
 const panel=$('savePanel'),mark=$('saveMark'),gem=$('saveMarkGem'),glyph=$('saveMarkGlyph');
 panel.dataset.visual=state;mark.dataset.state=state;
 const icons={save:['crystal.png','✦'],finish:['dagger.png','⚔'],working:['crystal.png','✧'],success:['potion.png','✓'],error:['shield.png','!']};
 const [image,symbol]=icons[state]||icons.save;
 gem.src=CM25_ITEM_ART+image;glyph.textContent=symbol;
 $('saveSyncTrack').hidden=state!=='working';
 const badge={save:'✦ CLASSMANA · JORNADA DO HERÓI ✦',
  finish:'✦ CLASSMANA · FIM DE JORNADA ✦',
  working:'✦ CLASSMANA · PROTEGENDO CONQUISTAS ✦',
  success:'✦ CLASSMANA · PROGRESSO PROTEGIDO ✦',
  error:'✦ CLASSMANA · ATENÇÃO AO REGISTRO ✦'};
 $('saveEyebrow').textContent=badge[state]||badge.save;
}
function cm25SaveStats(snapshot){
 $('saveRealm').textContent=String(snapshot.reino);
 $('saveTerritory').textContent=String(snapshot.territorio);
 $('saveScore').textContent=Number(snapshot.pontuacao||0).toLocaleString('pt-BR');
}

function openStopAndSave(mode='save'){
 if(stopSaveOpen||!currentRun||!campaignStarted||!ready||entering||endingRun)return;
 const snapshot=currentSnapshot();
 if(!snapshot){report('⚠ Não foi possível capturar o progresso desta batalha.');return;}
 let bridge=null;
 try{bridge=frame.contentWindow.CM25RealmBridge;}catch(e){}
 const pauseState=bridge?.pauseForSave?.();
 if(!pauseState){report('⚠ Aguarde o início da batalha para utilizar este botão.');return;}
 stopPauseState=pauseState;stopSaveMode=mode==='finish'?'finish':'save';
 stopSaveOpen=true;stopSaveConfirmed=false;
 const finishing=stopSaveMode==='finish';
 $('stopSave').hidden=true;$('finishRun').hidden=true;
 cm25SaveVisual(finishing?'finish':'save');cm25SaveStats(snapshot);
 $('saveTitle').textContent=finishing?'Encerrar minha aventura?':'Guardar minha jornada?';
 $('saveDescription').textContent=finishing
   ?'Sua pontuação será registrada e esta partida será encerrada. Depois, você poderá começar uma nova aventura!'
   :'Proteja tudo o que conquistou! Seus pontos e seu território ficarão guardados para continuar depois.';
 $('saveDetails').textContent='Reino '+snapshot.reino+' · Território '+snapshot.territorio+' · '+snapshot.pontuacao.toLocaleString('pt-BR')+' pontos';
 $('saveNotice').textContent=finishing
   ?'⚠ Encerrar é diferente de guardar: esta aventura não poderá ser retomada.'
   :'Seu herói está esperando. O progresso será guardado somente após a confirmação online.';
 $('saveNotice').classList.remove('error');
 $('saveConfirm').hidden=false;$('saveConfirm').disabled=false;
 $('saveConfirm').textContent=finishing?'⚔ Encerrar aventura':'✦ Guardar conquistas';
 $('saveCancel').hidden=false;$('saveCancel').disabled=false;$('saveCancel').textContent='▶ Voltar à batalha';
 $('saveExit').hidden=true;$('saveOverlay').hidden=false;$('saveConfirm').focus();
}
function closeStopAndResume(){
 if(!stopSaveOpen||stopSaveMode==='finish'&&stopSaveConfirmed)return;
 try{frame.contentWindow.CM25RealmBridge?.resumeAfterSave?.(stopPauseState);}catch(e){console.warn('[V2.5] Retorno do jogo:',e);}
 stopPauseState=null;stopSaveOpen=false;stopSaveConfirmed=false;
 $('saveOverlay').hidden=true;
 $('stopSave').hidden=false;$('finishRun').hidden=false;$('stopSave').focus();
}
async function confirmStopAndSave(){
 if(!stopSaveOpen||stopSaveConfirmed||$('saveConfirm').disabled)return;
 const confirm=$('saveConfirm'),cancel=$('saveCancel'),notice=$('saveNotice');
 confirm.disabled=true;cancel.disabled=true;
 const finishing=stopSaveMode==='finish';
 cm25SaveVisual('working');
 $('saveTitle').textContent=finishing?'Registrando o resultado…':'Protegendo suas conquistas…';
 confirm.textContent=finishing?'✦ Registrando…':'✦ Guardando…';
 notice.textContent='Enviando ao ClassMana e conferindo o registro online. Mantenha a janela aberta.';
 notice.classList.remove('error');
 try{
  const snapshot=currentSnapshot();
  if(!snapshot)throw Error('Não foi possível recuperar o estado da batalha.');
  if(finishing)await queueCheckpoint(snapshot,true,'ENCERRADA',true);
  else await queueCheckpoint(snapshot,false,'ENCERRADA',true);
  stopSaveConfirmed=true;
  cm25SaveVisual('success');
  $('saveTitle').textContent=finishing?'Aventura encerrada!':'Conquistas protegidas!';
  $('saveDescription').textContent=finishing
   ?'O resultado foi confirmado. Sua partida terminou e você poderá iniciar uma nova jornada.'
   :'Seu progresso foi confirmado. Use Continuar partida quando voltar.';
  $('saveDetails').textContent='Reino '+snapshot.reino+' · Território '+snapshot.territorio+' · '+snapshot.pontuacao.toLocaleString('pt-BR')+' pontos';
  notice.textContent=finishing?'Resultado confirmado no ClassMana V2.5.':'Tudo certo! O ClassMana confirmou seu progresso.';
  confirm.hidden=true;cancel.disabled=false;cancel.hidden=finishing;
  if(!finishing)cancel.textContent='▶ Retomar batalha';
  $('saveExit').hidden=false;$('saveExit').focus();
 }catch(error){
  console.error('[ClassMana V2.5] Registro da partida:',error);
  cm25SaveVisual('error');
  $('saveTitle').textContent='Ainda não foi possível registrar';
  notice.textContent='⚠ O servidor não confirmou esta tentativa. Seu herói continua nesta página. Tente novamente antes de sair.';
  notice.classList.add('error');
  confirm.textContent=finishing?'↻ Tentar encerrar novamente':'↻ Tentar guardar novamente';
  confirm.disabled=false;cancel.disabled=false;
 }
}
$('stopSave').addEventListener('click',()=>openStopAndSave('save'));
$('finishRun').addEventListener('click',()=>openStopAndSave('finish'));
$('saveCancel').addEventListener('click',closeStopAndResume);
$('saveConfirm').addEventListener('click',confirmStopAndSave);
$('saveExit').addEventListener('click',()=>{if(stopSaveConfirmed)location.reload();});

setInterval(()=>{
 if(!ready)return;
 try{
  const s=frame.contentWindow.CM25RealmBridge?.status();
  if(!s||s.realm!==realm||!s.active){
   $('stopSave').hidden=true;$('finishRun').hidden=true;
   return;
  }
  const stopBtn=$('stopSave'),finishBtn=$('finishRun');
  stopBtn.hidden=finishBtn.hidden=!(currentRun&&campaignStarted&&!stopSaveOpen&&!endingRun);
  if(!stopBtn.hidden)stopBtn.disabled=finishBtn.disabled=!s.playing||s.paused||entering;
  // Sem atualização de tempo/pontos enquanto a confirmação está aberta.
  if(stopSaveOpen)return;
  if(s.territory!==territory){
   territory=s.territory;info();
   const checkpoint=currentSnapshot();
   if(checkpoint)queueCheckpoint(checkpoint).catch(()=>{});
  }
  if(currentRun&&!endingRun){
   const snapshot=currentSnapshot();
   if(snapshot?.gameEnded){
    finalSnapshot={...snapshot};
    // Contabilizar os pontos bônus antes de finalizar a derrota na planilha.
    if(s.bonusApplied)queueCheckpoint(snapshot,true,'DERROTA').catch(()=>{});
   }else if(snapshot&&Date.now()-lastCheckpoint>15000&&!entering){
    lastCheckpoint=Date.now();queueCheckpoint(snapshot).catch(()=>{});
   }
  }
 }catch(e){console.error('[ClassMana V2.5] Monitor',e);}
},900);
// Abertura original: barra de carregamento, vídeo, áudio e seleção antes de jogar.
switchRealm(1,1,false);
