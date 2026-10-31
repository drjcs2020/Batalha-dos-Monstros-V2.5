/* CLASSMANA V2.5 — NÚCLEO GLOBAL DA CAMPANHA
 * Este arquivo é carregado por TODOS os reinos. Comandos compartilhados e
 * futuros hooks globais ficam aqui. Módulos de chefões permanecem individuais.
 * Ranking da V2.4 é bloqueado em modo de teste.
 */
(function () {
  'use strict';
  window.ClassManaV25TestMode = true;
  window.CM25TestDirectBoot = new URLSearchParams(location.search).get('direct') === '1';
  const buildToken=new URLSearchParams(location.search).get('cm25');
  const core = {
    version: '2.5-teste-revisao-03',
    difficulty: (window.parent?.CM25_CONFIG?.reinos||[]).map(r=>r.dificuldade),
    settings: {testMode:true, automaticAdaptiveDifficulty:false, rankingV24:false},
    hooks: {beforeUpdate:null,afterUpdate:null,afterDraw:null},
    introCompleted:false,
    // Referência visual compartilhada para pisos. Separada da física/colisão
    // para corrigir o contato das patas visíveis sem modificar a trajetória
    // dos saltos, projéteis, animações ou valores de dano.
    grounding:{
      // Ajuste final de contato pedido em 27/10: ~2–3 mm = 9 px CSS
      // (referência aproximada de 96 dpi). Aplicar igualmente aos
      // 3 reinos com cenários/sprites de aranhas compartilhados.
      spiderFinalDropPx:9,
      spiderHeroInset(territory,height){
        // Preserva o ajuste anterior e adiciona somente 9px ao pouso.
        return (territory<4?Math.max(2,Math.min(6,height*.009)):0)+this.spiderFinalDropPx;
      },
      spiderInset(territory,height){
        // Áreas 1–4 reutilizadas integralmente nos Reinos 3, 6 e 9.
        const ratios=[.023,.026,.023,.021,.009];
        const i=Math.max(0,Math.min(4,territory|0));
        return Math.max(3,Math.min(i===4?7:16,height*ratios[i]))+this.spiderFinalDropPx;
      },
      golemInset(territory,height){
        // Apenas Vale Vulcânico, Rios de Magma e Planície de Basalto.
        return territory>=0&&territory<3?Math.max(3,Math.min(9,height*.012)):0;
      }
    },
    // REGRAS CENTRAIS V2.5: os reinos só informam qual alvo foi atingido.
    fullRestoration(){return {hp:100,mana:100};},
    weapon:{
      // A arma é um volume no sprite, NUNCA todo o corpo do personagem.
      // Offset sobre a arte já reduzida a 142px de altura.
      profiles:[
        {name:'Rubi do cajado',x:.32,y:-.17,r:.155,damage:8},
        {name:'Arma glacial',x:.31,y:-.08,r:.16,damage:7},
        {name:'Adaga',x:.33,y:.00,r:.155,damage:9},
        {name:'Escudo e espada',x:.34,y:.01,r:.17,damage:10},
        {name:'Cajado arcano',x:.29,y:-.13,r:.17,damage:8},
        {name:'Arma dracônica',x:.34,y:-.05,r:.18,damage:9}
      ],
      interval:.74,
      hitbox({heroIdx,p,H,facing=1}){
        const h=Math.min(142,H*.225),cfg=this.profiles[heroIdx]||this.profiles[0];
        return {x:p.x+(facing===-1?-1:1)*h*cfg.x,
                y:p.y-45+h*cfg.y,radius:Math.max(13,h*cfg.r),
                damage:cfg.damage,weapon:cfg.name};
      }
    },
    flight:{
      // ↑/W: sobe continuamente; ao soltar, plana. ↓/S: perde altura.
      // Qualquer outro herói usa a física terrestre aprovada.
      apply({dt,heroIdx,p,keys,joy,groundY,ceilingY,state,velocityKey}){
        if(heroIdx!==0&&heroIdx!==5)return false;
        const rise=!!(keys.ArrowUp||keys.w||joy.y<-.55);
        const dive=!!(keys.ArrowDown||keys.s||joy.y>.55);
        let speed=Number(state[velocityKey])||0;
        if(rise)speed=Math.max(-195,speed-800*dt);
        else if(dive)speed=Math.min(300,speed+950*dt);
        else {speed=Math.min(75,speed+160*dt);if(speed<0)speed=Math.min(0,speed+250*dt);}
        state[velocityKey]=speed;
        p.y=Math.max(ceilingY,Math.min(groundY,p.y+speed*dt));
        if(p.y===groundY&&speed>0)state[velocityKey]=0;
        if(p.y===ceilingY&&speed<0)state[velocityKey]=0;
        return true;
      }
    },
    audio:{
      // Audio local confirmado por usuario — Revisao 10.
      // Reino 6 usa uma copia identica da Mega-Aranha, renomeada cm_duquesa_aranha.mp3.
      // cm_dragao.mp3 permanece arquivado SEM atribuicao; a trilha antiga da Rainha foi retirada.
      local(file){return new URL('../../assets/sons/'+file,location.href).href;},
      originalTrack(){
        const realm=window.CM25RealmBridge?.realm;
        if(!(realm>=1&&realm<=10))return null;
        const local={
          1:'cm_fantasma.mp3',2:'cm_golem.mp3',3:'cm_mega_aranha.mp3',
          4:'cm_flor.mp3',5:'cm_colmeia.mp3',
          7:'cm_morcego.mp3',8:'cm_hidra.mp3',
          9:'cm_peaks_pass.mp3',10:'cm_dracarys_pass.mp3'
        };
        // Alteracao exclusivamente do Reino 6; demais mapeamentos preservados.
        return realm===6?this.local('cm_duquesa_aranha.mp3'):this.local(local[realm]);
      },
      configure(){
        try{
          const track=this.originalTrack(),realm=window.CM25RealmBridge?.realm;
          if(!track||!Array.isArray(trilhaFases))return false;
          // Cada reino V2.5 executa o motor base em stage 0.
          trilhaFases[0]=track;
          // Evita regressao nos indices usados em cenas especificas.
          trilhaFases[realm-1]=track;
          if(realm===6&&typeof mediaAudio!=='undefined')mediaAudio.spider=track;
          return true;
        }catch(e){console.warn('[V2.5] Erro na trilha do reino',e);return false;}
      },
      configureKnownEffects(){
        try{
          // Menus, tutorial, game over e recarga em arquivos locais.
          const menus={inicio:'cm_como_comecar.mp3',
            selecao:'cm_selecao_herois.mp3',tutorial:'cm_como_jogar.mp3',
            placar:'cm_placar.mp3',gameover:'cm_gameover.mp3',
            recarga:'cm_recarga.mp3'};
          if(typeof cmAudio!=='undefined')for(const [k,file] of Object.entries(menus))
            cmAudio[k]=this.local(file);
          if(typeof mediaAudio!=='undefined')mediaAudio.avatar=this.local('cm_selecao_herois.mp3');
          // Mesmo motor de efeitos da V2.4; somente substituimos URLs do cache.
          if(typeof cacheEfeitos!=='undefined'){
            const fx={raio_supremo:'cm_raio_supremo.mp3',
              golpe_monstro:'cm_golpe_monstro.mp3',
              especial:'ataque_especial.mp3',
              selecao:'selecao.mp3',confirmar:'confirmar.mp3',
              acerto:'acerto.mp3',erro:'erro.mp3',moedas:'moedas.mp3',
              derrota:'derrota.mp3',vitoria:'vitoria.mp3'};
            for(const [k,file] of Object.entries(fx)){
              const priority=k==='raio_supremo'||k==='golpe_monstro'||k==='especial';
              const url=this.local(file);
              let audio=cacheEfeitos[k];
              if(!audio){audio=new Audio();cacheEfeitos[k]=audio;}
              if(audio.src!==url){audio.pause();audio.src=url;}
              audio.preload=priority?'auto':'metadata';
              if(priority&&audio.readyState===0)audio.load();
            }
          }
        }catch(e){console.warn('[V2.5] Erro na configuracao local de efeitos',e);}
      },
      play(){
        try{
          if(!soundOn)return false;
          const track=this.originalTrack();
          if(!track)return false;
          this.configure();
          playMediaAudio(track,true,.75);
          return true;
        }catch(e){console.warn('[V2.5] Trilha indisponivel',e);return false;}
      }
    },
    sairDaAbertura(){
      // Um salto de teste é explícito: interromper o vídeo antes de iniciar a partida.
      window.CM25TestDirectBoot=true;
      const movie=document.getElementById('openingMovie');
      if(movie){try{movie.pause();movie.muted=true;movie.volume=0;movie.currentTime=0;}catch(e){}}
      const wrap=document.getElementById('openingVideo');
      if(wrap){wrap.hidden=true;wrap.classList.remove('playing');wrap.style.display='none';}
      // A trilha de carregamento é controlada por um script posterior da V2.4.
      try{window.cm25StopLoadingMusic?.();}catch(e){}
    },
    // Só a V2.5 consulta esta API. O endpoint antigo da V2.4 fica intocado.
    rankingApiV25:"https://script.google.com/macros/s/AKfycbx47UtNCTdpQ4OukNxdzrcsFH2Mf1xCLO5mspGClV6Sn4OelwIZai3ZJn_Q8aVPp2Z-/exec",
    consultarV25(params){
      return new Promise((resolve,reject)=>{
        const callback='cmApiCallback_'+(++window.cm25ApiSequence||1);
        window.cm25ApiSequence=Number(callback.split('_')[1]);
        const script=document.createElement('script');
        let finished=false;
        const timer=setTimeout(()=>finish(new Error('O cadastro da V2.5 não respondeu.')),15000);
        const finish=(error,data)=>{
          if(finished)return;finished=true;clearTimeout(timer);script.remove();
          try{delete window[callback]}catch(e){window[callback]=undefined}
          if(error)reject(error);else resolve(data);
        };
        window[callback]=data=>finish(null,data);
        script.onerror=()=>finish(new Error('Não foi possível consultar o cadastro V2.5.'));
        script.src=this.rankingApiV25+'?'+new URLSearchParams({...params,callback,_:Date.now()});
        document.head.appendChild(script);
      });
    },
    criarEntradaCampanha(){
      const menu=document.getElementById('menu'),main=document.getElementById('start');
      if(!menu||!main)return;
      // Exibir o título existente no topo quando a seleção iniciar.
      menu.scrollTop=0;
      // V2.5: eliminar a fileira de cinco objetos decorativos do menu.
      // O espaço liberado passa a ser usado pelos retratos dos seis heróis.
      const unusedDecor=menu.querySelector('.decorRow');
      if(unusedDecor)unusedDecor.remove();
      // Ajuste visual isolado da V2.5: nomes e subtítulos legíveis.
      if(!document.getElementById('cm25-selection-readable')){
        const visual=document.createElement('style');
        visual.id='cm25-selection-readable';
        visual.textContent="\n/* ClassMana V2.5 — seleção legível, inclusive em paisagem. */\n#menu{overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;place-items:start center!important;align-content:start!important}\n#menu .decorRow{display:none!important} /* Remover os cinco ícones; destacar heróis. */\n#menu>.menuPanel{width:min(960px,96vw)!important;max-height:none!important;overflow:visible!important;padding:clamp(15px,2.4vw,26px)!important;margin:0 auto 16px!important}\n#menu .menuPanel>p:not(#cmAlunoAviso){font-size:clamp(18px,2vw,22px)!important;line-height:1.3!important;margin:12px 0 8px!important}\n#menu .menuPanel>p:not(#cmAlunoAviso)>b{font-size:inherit!important}\n#menu .classPick{margin:10px 0 14px!important;gap:11px!important}\n#menu .classBtn{font-size:clamp(16px,1.8vw,20px)!important;min-height:49px!important;padding:11px 22px!important}\n#menu .heroes{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;margin:8px 0 12px!important}\n#menu .heroPick{min-width:0;min-height:232px!important;padding:8px 8px 10px!important;gap:3px!important}\n#menu .heroPick .heroCanvas{width:clamp(184px,22vw,202px)!important;height:auto!important;aspect-ratio:160/150!important;max-width:93%!important;flex:0 0 auto}\n#menu .heroPick>div{font-size:clamp(16px,1.7vw,19px)!important;line-height:1.22!important;text-align:center!important;overflow-wrap:break-word!important}\n#menu .menuPanel .heroPick>div b{font-size:inherit!important;font-weight:800!important;color:#173653!important;text-shadow:none!important}\n#menu .heroPick>div small{display:block;font-size:clamp(12px,1.3vw,14px)!important;line-height:1.3!important;margin-top:3px!important;color:#284963!important;font-weight:650!important;text-shadow:none!important}\n#menu .heroPick.sel:after{font-size:13px!important;line-height:1.2!important;padding:6px 10px!important;margin-top:5px!important}\n#menu #playerName{width:min(590px,94%)!important;min-height:53px!important;font-size:clamp(17px,1.9vw,21px)!important;line-height:1.25!important;padding:12px 16px!important}\n#menu #playerName::placeholder{font-size:clamp(15px,1.6vw,19px)!important;opacity:.85!important}\n#menu #cmAlunoAviso{font-size:clamp(14px,1.45vw,17px)!important;line-height:1.45!important;margin:8px auto 13px!important}\n#menu #cmAlunoOpcoes{max-width:590px!important;width:94%!important}\n#menu #cmAlunoOpcoes button{font-size:clamp(15px,1.5vw,18px)!important;min-height:43px!important;padding:10px 14px!important}\n#menu .menuActions{gap:12px!important;margin:11px auto 3px!important}\n#menu .menuActions .start,#menu .menuActions .rankBtn{font-size:clamp(16px,1.8vw,20px)!important;min-height:51px!important;padding:12px 20px!important}\n@media(max-width:700px){\n #menu>.menuPanel{width:97vw!important;padding:15px 11px!important}\n #menu .heroes{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}\n #menu .heroPick{min-height:220px!important;padding:7px 5px 9px!important}\n #menu .heroPick .heroCanvas{width:min(170px,93%)!important}\n #menu .heroPick>div{font-size:16px!important}\n #menu .heroPick>div small{font-size:12px!important}\n #menu .menuPanel>p:not(#cmAlunoAviso){font-size:18px!important}\n}\n@media(max-height:580px){\n #menu .heroes{row-gap:10px!important}\n /* Tela curta: rolar o menu, não encolher o texto. */\n #menu{place-items:start center!important}\n #menu>.menuPanel{margin:0 auto 16px!important;max-height:none!important}\n #menu .heroPick>div{font-size:16px!important}\n #menu .heroPick>div small{font-size:12px!important}\n #menu #cmAlunoAviso{font-size:14px!important}\n}\n@media(max-width:380px){\n #menu .heroPick>div{font-size:15px!important}\n #menu .heroPick>div small{font-size:12px!important}\n #menu .classBtn{padding:10px 14px!important}\n}\n";
        document.head.appendChild(visual);
      }
      // Reaproveita o seletor de turma e busca de alunos cadastrados da V2.4,
      // mas as consultas são feitas SOMENTE no novo Apps Script da V2.5.
      if(typeof cmConsultarAPI==='function')cmConsultarAPI=params=>core.consultarV25(params);
      const input=document.getElementById('playerName');
      if(input)input.style.display='';
      const note=document.getElementById('cm25-start-test');
      if(note)note.remove();
      main.style.display='';
      main.textContent='⚔ INICIAR JORNADA';
      main.title='Escolha sua turma, selecione seu nome cadastrado e continue ou inicie uma partida';
      // RESTAURAR acesso livre ao PLACAR: nunca exigir cadastro ou início de partida.
      // O botão original era ocultado por módulos dos reinos; a V2.5 deve consultar
      // exclusivamente a API da V2.5 e não mostrar placares locais da V2.4.
      const placarButton=document.getElementById('openRanking');
      if(placarButton){
        const markerId='cm25-placar-livre';
        if(!document.getElementById(markerId)){
          const style=document.createElement('style');
          style.id=markerId;
          style.textContent=`/* Placar no local original: ao lado de INICIAR JORNADA, no fim da seleção. */
#menu .menuActions{
 display:flex!important;flex-direction:row!important;align-items:center!important;
 justify-content:center!important;gap:12px!important;flex-wrap:wrap!important;
}
#menu .menuActions #openRanking{
 position:static!important;inset:auto!important;top:auto!important;right:auto!important;
 bottom:auto!important;left:auto!important;z-index:auto!important;
 display:inline-flex!important;align-items:center!important;justify-content:center!important;
 visibility:visible!important;opacity:1!important;pointer-events:auto!important;
 min-height:51px!important;margin:0!important;padding:12px 20px!important;
 border:2px solid #e9b650!important;border-radius:13px!important;
 background:linear-gradient(#7be9f7,#438fd1 55%,#7659b6)!important;
 box-shadow:0 5px 0 #29386d,0 0 15px #66e8ff66!important;
 font:900 clamp(17px,1.85vw,21px)/1.2 "Trebuchet MS",Arial,sans-serif!important;
 color:#fff!important;text-shadow:0 2px 3px #15366b!important;cursor:pointer!important;
}
`;
          document.head.appendChild(style);
        }
        placarButton.removeAttribute('hidden');
        placarButton.textContent='🏆 PLACAR';
        placarButton.title='Consultar o placar ClassMana V2.5 sem iniciar uma partida';
        placarButton.onclick=async()=>{
          const overlay=document.getElementById('rankingOverlay');
          const tableContainer=document.getElementById('rankingTable');
          const summary=document.getElementById('rankSummary');
          const close=document.getElementById('closeRanking');
          if(!overlay||!tableContainer||!summary||!close)return;
          const requestId=core.placarRequestId=(core.placarRequestId||0)+1;
          overlay.dataset.final='0';overlay.dataset.defeat='0';
          close.textContent='↩ VOLTAR À SELEÇÃO';
          summary.textContent='Ranking ClassMana V2.5 • Maior pontuação, maior fase e menor tempo.';
          tableContainer.textContent='🌐 Consultando classificação da V2.5…';
          overlay.classList.remove('hidden');
          try{
            const response=await core.consultarV25({acao:'ranking'});
            if(response?.success!==true&&response?.sucesso!==true)
              throw Error(response?.erro||'Resposta inválida do servidor.');
            if(!Array.isArray(response.ranking))
              throw Error('O servidor não retornou a lista de classificação.');
            if(requestId!==core.placarRequestId||overlay.classList.contains('hidden'))return;
            const players=response.ranking.map((r,i)=>({
              name:String(r.nome||r.name||'').trim(),
              turma:String(r.turma||'').trim(),
              hero:String(r.personagem||r.hero||'').trim(),
              fase:Number(r.fase??r.territorio??r.stage??0)||0,
              pontos:Number(r.pontuacao??r.score??0)||0,
              tempo:Number(r.tempo??r.tempo_seg??r.time??0)||0,
              id:String(r.id_aluno||i)
            })).filter(r=>r.name);
            players.sort((a,b)=>b.pontos-a.pontos||b.fase-a.fase||a.tempo-b.tempo||a.name.localeCompare(b.name,'pt-BR'));
            // Dar destaque à posição do aluno quando o ranking online a informar.
            const myRank=playerId?players.findIndex(p=>p.id===String(playerId)):-1;
            if(myRank>=0)
              summary.textContent='Ranking ClassMana V2.5 • Sua posição: '+(myRank+1)+'º • '+players[myRank].pontos.toLocaleString('pt-BR')+' pontos.';
            tableContainer.replaceChildren();
            if(!players.length){
              const empty=document.createElement('p');
              empty.textContent='Ainda não há pontuações registradas na V2.5.';
              tableContainer.appendChild(empty);
              return;
            }
            const wrap=document.createElement('div');wrap.className='rankingScroll';
            const table=document.createElement('table');table.className='ranking';
            const thead=document.createElement('thead'),header=document.createElement('tr');
            for(const heading of ['#','Aluno','Turma','Herói','Fase','Pontos','Tempo']){
              const th=document.createElement('th');th.textContent=heading;header.appendChild(th);
            }
            thead.appendChild(header);table.appendChild(thead);
            const tbody=document.createElement('tbody');
            for(const [index,p] of players.slice(0,50).entries()){
              const tr=document.createElement('tr');
              if(p.id===String(playerId||''))tr.classList.add('rankMe');
              const seconds=Math.max(0,Math.round(p.tempo));
              const values=[index<3?['🥇','🥈','🥉'][index]:String(index+1),p.name,p.turma||'—',
                p.hero||'—',String(p.fase),p.pontos.toLocaleString('pt-BR'),
                '⏳ '+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')];
              for(const value of values){
                const td=document.createElement('td');td.textContent=value;tr.appendChild(td);
              }
              tbody.appendChild(tr);
            }
            table.appendChild(tbody);wrap.appendChild(table);tableContainer.appendChild(wrap);
            const note=document.createElement('p');note.style.margin='10px 0 0';
            note.textContent='TOP 50 • Classificação online V2.5';
            tableContainer.appendChild(note);
          }catch(error){
            if(requestId!==core.placarRequestId||overlay.classList.contains('hidden'))return;
            console.error('[ClassMana V2.5] Consulta do placar',error);
            tableContainer.replaceChildren();
            const notice=document.createElement('p');
            notice.textContent='⚠ Não foi possível consultar o placar online: '+String(error.message||error);
            const retry=document.createElement('button');
            retry.type='button';retry.className='rankBtn';
            retry.textContent='🔄 TENTAR NOVAMENTE';
            retry.onclick=()=>placarButton.click();
            tableContainer.append(notice,retry);
          }
        };
      }

      main.onclick=()=>{
        if(!cmBankReady){alert('O banco de questões ainda não terminou de carregar.');return;}
        if(!playerId){alert('Selecione sua turma e escolha seu nome completo na lista de alunos cadastrados.');input?.focus();return;}
        // A confirmação e o áudio são desbloqueados pelo gesto real do aluno.
        try{
          audio=audio||new (window.AudioContext||window.webkitAudioContext)();
          audio.resume();
          efeitoClassMana('confirmar',.28);
        }catch(e){console.warn('[ClassMana V2.5] Áudio aguardando interação',e);}
        const profile={id_aluno:String(playerId),hero:Number.isInteger(heroIdx)?heroIdx:0,
          name:String(playerName||input?.value||'').trim(),
          className:String(playerClass||''),
          personagem:String(heroes[heroIdx]?.name||'')};
        if(!profile.name||!profile.className){alert('Confirme seu nome e sua turma.');return;}
        core.send('START',{profile});
      };
      const movie=document.getElementById('openingMovie');
      const skipped=document.getElementById('openingSkip');
      const complete=()=>{core.introCompleted=true;core.send('INTRO_DONE')};
      // A trilha de preparação deve parar no início real do vídeo.
      movie?.addEventListener('playing',()=>core.send('OPENING_VIDEO'),{once:true});
      movie?.addEventListener('ended',complete);
      skipped?.addEventListener('click',complete);
    },
    estilizarHud(){
      if(document.getElementById('cm25-hud-legibilidade'))return;
      const style=document.createElement('style');
      style.id='cm25-hud-legibilidade';
      style.textContent=`
/* A posição do título do território não muda: apenas o cronômetro sobe. */
#timerHud,.timerHud{
 top:10px!important;left:50%!important;right:auto!important;
 transform:translateX(-50%)!important;
 padding:7px 17px!important;font-size:clamp(13px,1.25vw,17px)!important;
 min-height:35px!important;white-space:nowrap!important;z-index:6!important;
 background:linear-gradient(135deg,#fdf5d4,#e9c977)!important;
 border:2px solid #b27b24!important;box-shadow:0 4px 18px #0008!important
}
/* Informações do monstro: mais área, mais contraste e tipografia legível. */
.hud>.card:last-child{
 width:min(450px,38vw)!important;max-width:450px!important;
 padding:12px 16px 13px!important;
 border:2px solid #edc871!important;
 background:linear-gradient(145deg,#0c2b4cf5,#051226f5)!important;
 box-shadow:0 6px 24px #000b,0 0 14px #29b6f633!important;
}
.hud>.card:last-child .title,
.hud>.card:last-child #round{
 font-size:clamp(12px,1.1vw,16px)!important;letter-spacing:.55px!important;
 line-height:1.3!important;font-weight:900!important;color:#ffe19a!important;
}
.hud>.card:last-child .name,
.hud>.card:last-child #ename{
 font-size:clamp(17px,1.8vw,24px)!important;line-height:1.25!important;
 text-shadow:0 2px 6px #000!important;overflow-wrap:anywhere!important;
}
.hud>.card:last-child .stats{font-size:clamp(12px,1.06vw,15px)!important;margin:8px 0!important;}
.hud>.card:last-child #difficulty{font-size:inherit!important;line-height:1.3!important;overflow-wrap:anywhere!important;}
.hud>.card:last-child .bar{height:15px!important;border:1px solid #c4ddf7aa!important;}
@media(max-width:700px){
 .hud>.card:last-child{width:min(51vw,300px)!important;padding:8px 10px!important;}
 .hud>.card:last-child .title,.hud>.card:last-child #round{font-size:clamp(10px,2.3vw,13px)!important;}
 .hud>.card:last-child .name,.hud>.card:last-child #ename{font-size:clamp(14px,3.4vw,19px)!important;}
 .hud>.card:last-child .stats{font-size:clamp(10px,2.2vw,12px)!important;margin:4px 0!important;}
 .hud>.card:last-child .bar{height:12px!important;}
 #timerHud,.timerHud{top:5px!important;font-size:12px!important;padding:5px 10px!important;min-height:28px!important;}
}
@media(max-width:400px){
 #timerHud,.timerHud{top:5px!important;font-size:11px!important;}
}
`;
      document.head.appendChild(style);
    },
    integrarProgresso(){
      const bridge=window.CM25RealmBridge;
      if(!bridge||bridge.cm25ProgressInstalled)return;
      bridge.cm25ProgressInstalled=true;
      const status=bridge.status.bind(bridge),select=bridge.selectArea.bind(bridge);
      let lastReportedTerritory=Number(status()?.territory)||1;
      bridge.status=()=>{
        const actual=status(),reached=Number(actual.territory)||1;
        // Avanço real é informado ao controlador para que Continuar retome a área correta.
        if(actual.active&&reached>lastReportedTerritory){
          lastReportedTerritory=reached;
          core.send('AREA_ADVANCED',{territory:reached});
        }else if(!actual.active){lastReportedTerritory=reached;}
        return {
          ...actual,id_aluno:String(playerId||''),
          personagem:String(heroes[heroIdx]?.name||''),
          hp:Number(p.hp)||0,mana:Number(p.mana)||0,
          tempo:Math.max(0,Math.round(Number(elapsedMs||0)/1000)),
          gameEnded:!!gameEnded,
          // A derrota é finalizada no Sheets SOMENTE após incluir os pontos bônus.
          bonusApplied:!!cmBonusApplied,
          // Apenas consulta o cálculo original de pontos bônus, sem aplicar ou alterar o placar.
          bonusPreview:cmBonusApplied?0:Math.max(0,Number(cmBonusValue())||0)
        };
      };
      bridge.selectArea=(target,profile)=>{
        if(profile?.id_aluno)playerId=String(profile.id_aluno);
        const selected=select(target,profile);
        lastReportedTerritory=Number(selected)||Number(target)+1||1;
        return selected;
      };
      bridge.restoreProgress=snapshot=>{
        if(!snapshot||!bridge.status().active)return false;
        if(snapshot.id_aluno&&String(snapshot.id_aluno)!==String(playerId))return false;
        if(Number.isInteger(snapshot.heroi_indice))heroIdx=snapshot.heroi_indice;
        score=Math.max(0,Number(snapshot.pontuacao)||0);
        p.hp=Math.max(0,Math.min(100,Number(snapshot.hp??100)));
        // Na retomada, garantir reserva mínima de mana sem alterar pontos.
        p.mana=Math.max(50,Math.min(100,Number(snapshot.mana??100)));
        elapsedMs=Math.max(0,(Number(snapshot.tempo)||0)*1000);
        try{setHud()}catch(e){}
        try{updateHUD()}catch(e){}
        const heroName=heroes[heroIdx]?.name||'Herói';
        const nameHud=document.getElementById('hname');
        if(nameHud)nameHud.textContent=playerName+' • '+playerClass+' • '+heroName;
        const elapsed=Math.floor(Math.max(0,elapsedMs)/1000);
        const timer=document.getElementById('timerHud');
        if(timer)timer.textContent='⏳ '+String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(elapsed%60).padStart(2,'0');
        return true;
      };
      bridge.startTutorial=()=>{
        // A abertura e a seleção já foram exibidas na entrada normal.
        // O tutorial pertence só à primeira tentativa de uma nova jornada.
        if(typeof showTutorial!=='function')return false;
        playing=false;paused=true;
        showTutorial();
        return true;
      };
      bridge.pauseForSave=()=>{
        if(!bridge.status().active||gameEnded)return null;
        const wasPlaying=playing,wasPaused=paused;
        // Congela a atualização física e suspende a música até a decisão.
        paused=true;
        try{if(typeof mediaTrack!=='undefined'&&mediaTrack)mediaTrack.pause();}catch(e){}
        return {wasPlaying,wasPaused};
      };
      bridge.resumeAfterSave=state=>{
        if(!state)return false;
        playing=!!state.wasPlaying;
        paused=!!state.wasPaused;
        if(playing&&!paused){
          try{core.audio.play();}catch(e){console.warn('[ClassMana V2.5] Áudio:',e);}
        }
        return true;
      };

    },
    send(action, extras) {
      if (window.parent !== window) window.parent.postMessage({namespace:'CM25',action,realm:window.CM25RealmBridge?.realm||null,token:buildToken,...(extras||{})},location.origin);
    },
    instalar(){
      if (this.installed)return;
      this.installed=true;
      // O reino ja foi criado pela extensao; configurar audio ANTES do primeiro reset.
      this.audio.configure();
      this.audio.configureKnownEffects();
      // Pré-carregar a trilha sem iniciar reprodução automática no iframe.
      try{
        const track=this.audio.originalTrack();
        if(track){
          const warmed=new Audio(track);
          warmed.preload='auto';
          warmed.load();
          this.audio._warmedTrack=warmed;
        }
      }catch(e){console.warn('[V2.5] Pré-carga da trilha falhou',e);}
      const oldUpdate=update,oldDraw=draw;
      update=function(dt){
        try{core.hooks.beforeUpdate?.(dt)}catch(e){console.error('Hook global de física',e)}
        const r=oldUpdate(dt);
        try{core.hooks.afterUpdate?.(dt)}catch(e){console.error('Hook global de atualização',e)}
        return r;
      };
      draw=function(){const r=oldDraw();try{core.hooks.afterDraw?.()}catch(e){console.error('Hook global visual',e)}return r};
      this.estilizarHud();
      this.integrarProgresso();
      this.criarEntradaCampanha();
      // A V2.4 escondia o botão de pontos bônus nos reinos e enviava a
      // classificação ao placar antigo. Na V2.5 ele volta a ser a saída.
      const bonusButton=document.getElementById('bonusViewRanking');
      const bonusOverlay=document.getElementById('bonusOverlay');
      if(bonusButton&&bonusOverlay){
        bonusButton.style.setProperty('display','block','important');
        bonusButton.style.setProperty('visibility','visible','important');
        // Captura antes do onclick legado, evitando consultar ou salvar na V2.4.
        bonusButton.addEventListener('click',event=>{
          event.preventDefault();event.stopImmediatePropagation();
          if(bonusButton.disabled)return;
          bonusButton.disabled=true;
          bonusButton.textContent='⏳ CONFIRMANDO RESULTADO NA V2.5...';
          this.send('BONUS_EXIT',{fromDefeat:bonusOverlay.dataset.fromDefeat==='1'});
        },true);
        // Segundo comando solicitado: consultar o ranking V2.5 nesta mesma
        // tela de pontos bônus, sem passar pelo cadastro.
        // Já está no HTML original da tela Pontos Bônus, DEPOIS dos pontos.
        // Não criar botões no cabeçalho nem na seleção.
        const rankingFromBonus=document.getElementById('cm25BonusRanking');
        if(!rankingFromBonus)throw Error('Botão Consultar Placar ausente na tela Pontos Bônus');
        let rankingOpenedFromBonus=false;
        rankingFromBonus.addEventListener('click',()=>{
          if(rankingFromBonus.disabled)return;
          rankingFromBonus.disabled=true;
          rankingFromBonus.textContent='⏳ CONFIRMANDO PONTOS…';
          this.send('BONUS_RANKING',{fromDefeat:bonusOverlay.dataset.fromDefeat==='1'});
        });
        // Depois da confirmação, abrir o ranking já existente da V2.5.
        window.addEventListener('message',event=>{
          const d=event.data;
          if(event.origin!==location.origin||event.source!==window.parent||
             d?.namespace!=='CM25'||d.action!=='BONUS_RANKING_READY'||
             String(d.token)!==String(buildToken)||d.realm!==window.CM25RealmBridge?.realm)return;
          rankingOpenedFromBonus=true;
          bonusOverlay.classList.add('hidden');
          const placar=document.getElementById('openRanking');
          if(placar)placar.click();
        });
        document.getElementById('closeRanking')?.addEventListener('click',event=>{
          if(!rankingOpenedFromBonus)return;
          event.preventDefault();event.stopImmediatePropagation();
          rankingOpenedFromBonus=false;
          this.send('BONUS_EXIT',{fromDefeat:bonusOverlay.dataset.fromDefeat==='1'});
        },true);
        const oldShowBonus=cmShowBonus;
        cmShowBonus=function(...args){
          rankingOpenedFromBonus=false;
          rankingFromBonus.disabled=true;
          rankingFromBonus.textContent='🏆 CONSULTAR PLACAR';
          const result=oldShowBonus(...args);
          // A contagem original usa animação de 6 segundos; não mostrar
          // pontuação parcial nem liberar ação durante essa animação.
          setTimeout(()=>{
            if(bonusOverlay.classList.contains('hidden'))return;
            bonusButton.disabled=false;
            bonusButton.textContent='🏠 VOLTAR À SELEÇÃO';
            rankingFromBonus.disabled=false;
            rankingFromBonus.textContent='🏆 CONSULTAR PLACAR';
          },6500);
          return result;
        };
      }
      // Quando a campanha já começou, nunca reabrir o menu de cadastro
      // no curto intervalo entre a derrota de um chefão e o próximo reino.
      if(!document.getElementById('cm25-campaign-visuals')){
        const style=document.createElement('style');
        style.id='cm25-campaign-visuals';
        style.textContent='body.cm25-test-direct #menu{display:none!important;}';
        document.head.appendChild(style);
      }
      // Navegadores bloqueiam autoplay no carregamento do iframe.
      // O primeiro comando/gesto durante uma batalha reativa a trilha correta.
      const unlock=()=>{try{if(playing&&!paused&&window.CM25RealmBridge?.status?.().active){
        if(!mediaTrack||mediaTrack.paused)this.audio.play();
      }}catch(e){}};
      document.addEventListener('pointerdown',unlock,true);
      document.addEventListener('keydown',unlock,true);

      const announce=()=>this.send('READY',{realm:window.CM25RealmBridge?.realm||null});
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',announce,{once:true});
      else announce();
      console.info('[ClassMana V2.5] Núcleo global instalado. Ranking V2.4 desativado.');
    }
  };
  window.ClassManaNucleo = core;
})();
