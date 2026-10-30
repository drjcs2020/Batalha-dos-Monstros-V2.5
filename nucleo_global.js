/* CLASSMANA V2.5 — NÚCLEO GLOBAL DA CAMPANHA DE TESTE
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
    criarEntradaDeTeste(){
      const menu=document.getElementById('menu'),main=document.getElementById('start');
      if(!menu||!main)return;
      // Reaproveita o seletor de turma e busca de alunos cadastrados da V2.4,
      // mas as consultas são feitas SOMENTE no novo Apps Script da V2.5.
      if(typeof cmConsultarAPI==='function')cmConsultarAPI=params=>core.consultarV25(params);
      const input=document.getElementById('playerName');
      if(input)input.style.display='';
      const note=document.getElementById('cm25-start-test');
      if(note)note.remove();
      main.style.display='';
      main.textContent='⚔ ENTRAR NA CAMPANHA V2.5';
      main.title='Escolha sua turma, selecione seu nome cadastrado e continue ou inicie uma partida';
      main.onclick=()=>{
        if(!playerId){alert('Selecione sua turma e escolha seu nome completo na lista de alunos cadastrados.');input?.focus();return;}
        const profile={id_aluno:String(playerId),hero:Number.isInteger(heroIdx)?heroIdx:0,
          name:String(playerName||input?.value||'').trim(),
          className:String(playerClass||'')};
        if(!profile.name||!profile.className){alert('Confirme seu nome e sua turma.');return;}
        core.send('START',{profile});
      };
      const movie=document.getElementById('openingMovie');
      const skipped=document.getElementById('openingSkip');
      const complete=()=>{core.introCompleted=true;core.send('INTRO_DONE')};
      movie?.addEventListener('ended',complete);
      skipped?.addEventListener('click',complete);
    },
    integrarProgresso(){
      const bridge=window.CM25RealmBridge;
      if(!bridge||bridge.cm25ProgressInstalled)return;
      bridge.cm25ProgressInstalled=true;
      const status=bridge.status.bind(bridge),select=bridge.selectArea.bind(bridge);
      bridge.status=()=>({
        ...status(),id_aluno:String(playerId||''),
        hp:Number(p.hp)||0,mana:Number(p.mana)||0,
        tempo:Math.max(0,Math.round(Number(elapsedMs||0)/1000)),
        gameEnded:!!gameEnded
      });
      bridge.selectArea=(target,profile)=>{
        if(profile?.id_aluno)playerId=String(profile.id_aluno);
        return select(target,profile);
      };
      bridge.restoreProgress=snapshot=>{
        if(!snapshot||!bridge.status().active)return false;
        if(snapshot.id_aluno&&String(snapshot.id_aluno)!==String(playerId))return false;
        if(Number.isInteger(snapshot.heroi_indice))heroIdx=snapshot.heroi_indice;
        score=Math.max(0,Number(snapshot.pontuacao)||0);
        p.hp=Math.max(0,Math.min(100,Number(snapshot.hp??100)));
        p.mana=Math.max(0,Math.min(100,Number(snapshot.mana??100)));
        elapsedMs=Math.max(0,(Number(snapshot.tempo)||0)*1000);
        try{setHud()}catch(e){}
        try{updateHUD()}catch(e){}
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
      this.integrarProgresso();
      this.criarEntradaDeTeste();
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
  window.addEventListener('keydown',e=>{
    if (!['F6','F7','F8'].includes(e.code) && !(e.code==='F8'&&e.shiftKey)) return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(e.repeat)return;
    core.send('KEY',{key:e.code,shift:!!e.shiftKey});
  },true);
})();
