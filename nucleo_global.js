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
        visual.textContent="\n/* ClassMana V2.5 — seleção legível, inclusive em paisagem. */\n#menu{overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;place-items:start center!important;align-content:start!important}\n#menu .decorRow{display:none!important} /* Remover os cinco ícones; destacar heróis. */\n#menu>.menuPanel{width:min(960px,96vw)!important;max-height:none!important;overflow:visible!important;padding:clamp(15px,2.4vw,26px)!important;margin:0 auto 16px!important}\n#menu .menuPanel>p:not(#cmAlunoAviso){font-size:clamp(18px,2vw,22px)!important;line-height:1.3!important;margin:12px 0 8px!important}\n#menu .menuPanel>p:not(#cmAlunoAviso)>b{font-size:inherit!important}\n#menu .classPick{margin:10px 0 14px!important;gap:11px!important}\n#menu .classBtn{font-size:clamp(16px,1.8vw,20px)!important;min-height:49px!important;padding:11px 22px!important}\n#menu .heroes{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;margin:8px 0 12px!important}\n#menu .heroPick{min-width:0;min-height:232px!important;padding:8px 8px 10px!important;gap:3px!important}\n#menu .heroPick .heroCanvas{width:clamp(184px,22vw,202px)!important;height:auto!important;aspect-ratio:160/150!important;max-width:93%!important;flex:0 0 auto}\n#menu .heroPick>div{font-size:clamp(16px,1.7vw,19px)!important;line-height:1.22!important;text-align:center!important;overflow-wrap:break-word!important}\n#menu .menuPanel .heroPick>div b{font-size:inherit!important;font-weight:800!important;color:#173653!important;text-shadow:none!important}\n#menu .heroPick>div small{display:block;font-size:clamp(12px,1.3vw,14px)!important;line-height:1.3!important;margin-top:3px!important;color:#284963!important;font-weight:650!important;text-shadow:none!important}\n#menu .heroPick.sel:after{font-size:13px!important;line-height:1.2!important;padding:6px 10px!important;margin-top:5px!important}\n#menu #playerName{width:min(590px,94%)!important;min-height:53px!important;font-size:clamp(17px,1.9vw,21px)!important;line-height:1.25!important;padding:12px 16px!important}\n#menu #playerName::placeholder{font-size:clamp(15px,1.6vw,19px)!important;opacity:.85!important}\n#menu #cmAlunoAviso{font-size:clamp(14px,1.45vw,17px)!important;line-height:1.45!important;margin:8px auto 13px!important}\n#menu #cmAlunoOpcoes{max-width:590px!important;width:94%!important}\n#menu #cmAlunoOpcoes button{font-size:clamp(15px,1.5vw,18px)!important;min-height:43px!important;padding:10px 14px!important}\n#menu .menuActions{gap:12px!important;margin:11px auto 3px!important}\n#menu .menuActions .start,#menu .menuActions .rankBtn{font-size:clamp(16px,1.8vw,20px)!important;min-height:51px!important;padding:12px 20px!important}\n@media(max-width:700px){\n #menu>.menuPanel{width:97vw!important;padding:15px 11px!important}\n #menu .heroes{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}\n #menu .heroPick{min-height:220px!important;padding:7px 5px 9px!important}\n #menu .heroPick .heroCanvas{width:min(170px,93%)!important}\n #menu .heroPick>div{font-size:16px!important}\n #menu .heroPick>div small{font-size:12px!important}\n #menu .menuPanel>p:not(#cmAlunoAviso){font-size:18px!important}\n}\n@media(max-height:580px){\n #menu .heroes{row-gap:10px!important}\n /* Tela curta: rolar o menu, não encolher o texto. */\n #menu{place-items:start center!important}\n #menu>.menuPanel{margin:0 auto 16px!important;max-height:none!important}\n #menu .heroPick>div{font-size:16px!important}\n #menu .heroPick>div small{font-size:12px!important}\n #menu #cmAlunoAviso{font-size:14px!important}\n}\n@media(max-width:380px){\n #menu .heroPick>div{font-size:15px!important}\n #menu .heroPick>div small{font-size:12px!important}\n #menu .classBtn{padding:10px 14px!important}\n}\n\n/* CM25 HERO CAROUSEL — somente menu de turma, herói e cadastro. */\n#menu{overflow-y:auto!important;overflow-x:hidden!important;scrollbar-gutter:stable}\n#menu>.menuPanel{\n width:min(910px,96vw)!important;padding:clamp(8px,1.6vh,15px) clamp(12px,2vw,23px)!important;\n margin:0 auto 8px!important;box-sizing:border-box\n}\n#menu .battleTitleImg{\n width:min(790px,98%)!important;max-height:clamp(90px,16vh,130px)!important;\n object-fit:contain!important;margin:0 auto -15px!important;\n filter:drop-shadow(0 5px 9px #07142b88)!important\n}\n#menu .logo{\n width:auto!important;max-width:clamp(190px,31vw,282px)!important;\n max-height:clamp(48px,10vh,75px)!important;\n object-fit:contain!important;margin:0 auto 2px!important\n}\n#menu .menuPanel>p:not(#cmAlunoAviso){\n font-size:clamp(17px,1.7vw,20px)!important;\n line-height:1.17!important;margin:6px 0 5px!important\n}\n#menu .classPick{\n display:flex!important;justify-content:center!important;gap:10px!important;\n margin:4px 0 8px!important\n}\n#menu .classBtn{min-height:41px!important;padding:8px 19px!important;font-size:17px!important}\n#menu #cm25HeroCarousel{\n display:grid!important;grid-template-columns:clamp(49px,7vw,72px) minmax(0,1fr) clamp(49px,7vw,72px);\n align-items:center!important;justify-content:center!important;\n gap:clamp(7px,1.6vw,19px)!important;\n width:min(690px,100%)!important;margin:1px auto 0!important;\n position:relative;min-height:213px\n}\n#menu #cm25HeroCarousel #heroes{\n display:flex!important;align-items:center!important;justify-content:center!important;\n min-width:0!important;width:100%!important;margin:0!important;gap:0!important;\n grid-template-columns:none!important\n}\n#menu #cm25HeroCarousel #heroes .heroPick{\n display:none!important;width:min(360px,100%)!important;\n min-width:0!important;min-height:211px!important;max-height:250px!important;\n flex-direction:column!important;align-items:center!important;justify-content:center!important;\n padding:4px 10px 12px!important;gap:0!important;\n border:2px solid #ffe6a2!important;border-radius:19px!important;\n background:linear-gradient(145deg,#d9fbff,#84e5ee 55%,#b8a9ef)!important;\n box-shadow:0 6px 20px #071a5080,inset 0 2px 10px #ffffffa3!important;\n transform:none!important;position:relative!important;cursor:pointer!important\n}\n#menu #cm25HeroCarousel #heroes .heroPick.cm25HeroCurrent{\n display:flex!important;animation:cm25HeroReveal .18s ease-out both\n}\n/* Cartão do herói escolhido: destaque ouro/laranja sem alterar o tamanho. */\n#menu #cm25HeroCarousel #heroes .heroPick.cm25HeroCurrent.sel{\n box-sizing:border-box!important;\n border:3px solid #ffd45b!important;\n outline:2px solid #f2a42a!important;\n outline-offset:1px!important;\n background:linear-gradient(145deg,#fff3c9 0%,#b9edf5 52%,#e8b4e5 100%)!important;\n box-shadow:0 0 0 3px #5d3d13a8,0 0 19px #ffd34cb0,0 8px 20px #24163a70,inset 0 0 14px #fff3b8a0!important\n}\n#menu #cm25HeroCarousel #heroes .heroPick .heroCanvas{\n display:block!important;width:clamp(172px,24vw,210px)!important;\n max-width:90%!important;height:auto!important;aspect-ratio:160/150!important;\n object-fit:contain!important;margin:0 auto!important;flex:0 0 auto!important;\n filter:drop-shadow(0 5px 7px #16417b55)\n}\n#menu #cm25HeroCarousel #heroes .heroPick>div{\n font-size:clamp(17px,1.7vw,20px)!important;line-height:1.12!important;\n text-align:center!important\n}\n#menu #cm25HeroCarousel #heroes .heroPick>div small{\n font-size:clamp(12px,1.3vw,14px)!important;margin-top:2px!important;\n line-height:1.12!important\n}\n#menu #cm25HeroCarousel #heroes .heroPick.sel:after{\n content:'✓ SELECIONADO'!important;position:absolute!important;\n top:7px!important;right:8px!important;margin:0!important;padding:4px 7px!important;\n font-size:10px!important;letter-spacing:.02em!important;transform:none!important;\n color:#472904!important;background:linear-gradient(#ffe9a2,#eca92b)!important;\n border:1px solid #fff0ba!important;\n box-shadow:0 2px 7px #6e430b70!important\n}\n#menu .cm25HeroArrow{\n width:clamp(49px,7vw,72px)!important;height:clamp(55px,8vw,78px)!important;\n padding:0!important;display:flex!important;align-items:center!important;justify-content:center!important;\n background:linear-gradient(160deg,#fff1b3,#e8b346 57%,#ba761e)!important;\n border:2px solid #fff1b9!important;border-radius:17px!important;\n color:#fffaf0!important;font:900 clamp(35px,4.3vw,49px)/1 Arial,sans-serif!important;\n text-shadow:0 0 8px #ffefb5,0 0 15px #ffd56d!important;\n box-shadow:0 0 11px #ffce5b8c,inset 0 0 12px #fff3ba88,0 5px 7px #5f3b168a;\n cursor:pointer!important;touch-action:manipulation;animation:cm25ArrowGlow 2.4s ease-in-out infinite\n}\n#menu .cm25HeroArrow:active{transform:scale(.95)!important}\n#menu .cm25HeroArrow:focus-visible,#menu .cm25HeroDot:focus-visible{\n outline:3px solid #ffe49b!important;outline-offset:3px!important\n}\n#menu .cm25HeroArrow.cm25Next{animation-delay:1.2s}\n#menu #cm25HeroDots{\n display:flex!important;align-items:center!important;justify-content:center!important;\n gap:6px!important;margin:5px auto 0!important;min-height:16px\n}\n#menu .cm25HeroDot{\n width:12px!important;height:12px!important;border:2px solid #d1f6ff!important;\n padding:0!important;border-radius:50%!important;background:#4d729f!important;\n box-shadow:0 2px 5px #07153094!important;cursor:pointer!important;touch-action:manipulation\n}\n#menu .cm25HeroDot[aria-current=\"true\"]{\n width:22px!important;border-radius:12px!important;background:#ffd260!important;\n border-color:#fff6cb!important;box-shadow:0 0 10px #ffd56f!important\n}\n#menu #cm25HeroPosition{\n text-align:center!important;color:#ecf8ff!important;font-size:12px!important;\n font-weight:800!important;line-height:1.12!important;margin:1px 0 0!important;\n text-shadow:0 1px 4px #061f4d\n}\n#menu #cm25NameInputWrap{position:relative!important;z-index:12!important;margin:1px auto 0!important;max-width:560px!important;width:94%!important}\n#menu #playerName{\n display:block!important;margin:0 auto!important;width:100%!important;\n min-height:44px!important;font-size:17px!important;padding:9px 12px!important;\n box-sizing:border-box!important\n}\n#menu #cmAlunoOpcoes{\n position:absolute!important;top:calc(100% + 3px)!important;left:0!important;\n width:100%!important;max-width:none!important;max-height:min(220px,37vh)!important;\n margin:0!important;overflow-y:auto!important;z-index:90!important;\n border-radius:10px!important;box-shadow:0 8px 24px #001530a8!important;\n background:#e4f3ff!important\n}\n#menu #cmAlunoOpcoes:empty{display:none!important}\n#menu #cmAlunoOpcoes button{\n display:block!important;width:100%!important;text-align:left!important;min-height:44px!important;\n font-size:clamp(14px,1.5vw,17px)!important\n}\n#menu #cmAlunoAviso{\n font-size:clamp(12px,1.3vw,15px)!important;margin:3px auto 5px!important;\n line-height:1.25!important\n}\n#menu .menuActions{gap:10px!important;margin:5px auto 0!important}\n#menu .menuActions .start,#menu .menuActions .rankBtn{\n min-height:47px!important;padding:10px 17px!important;font-size:clamp(16px,1.8vw,19px)!important\n}\n@keyframes cm25ArrowGlow{\n 0%,100%{box-shadow:0 0 8px #ffce5f80,inset 0 0 10px #fff7d077,0 5px 7px #5f3b168a}\n 50%{box-shadow:0 0 23px #ffd659e3,0 0 35px #ffbf3b80,inset 0 0 17px #fff2b8bb,0 5px 7px #5f3b168a}\n}\n@keyframes cm25HeroReveal{from{opacity:.65;transform:translateX(5px)}to{opacity:1;transform:translateX(0)}}\n@media(max-height:760px){\n #menu>.menuPanel{padding:7px 14px!important;margin-bottom:4px!important}\n #menu .battleTitleImg{max-height:clamp(72px,13vh,102px)!important;margin-bottom:-16px!important}\n #menu .logo{max-height:clamp(41px,8vh,57px)!important}\n #menu .menuPanel>p:not(#cmAlunoAviso){font-size:17px!important;margin:4px 0 3px!important}\n #menu .classPick{margin:3px 0 5px!important}\n #menu .classBtn{min-height:37px!important;padding:6px 16px!important}\n #menu #cm25HeroCarousel{min-height:184px!important}\n #menu #cm25HeroCarousel #heroes .heroPick{min-height:183px!important;max-height:197px!important;padding:3px 8px 8px!important}\n #menu #cm25HeroCarousel #heroes .heroPick .heroCanvas{width:clamp(150px,19vw,161px)!important}\n #menu #cm25HeroCarousel #heroes .heroPick>div{font-size:17px!important}\n #menu .cm25HeroArrow{height:62px!important}\n #menu #cm25HeroDots{margin-top:3px!important}\n #menu #playerName{min-height:41px!important}\n #menu .menuActions .start,#menu .menuActions .rankBtn{min-height:43px!important}\n}\n@media(max-height:620px){\n #menu .battleTitleImg{max-height:65px!important;margin-bottom:-15px!important}\n #menu .logo{max-height:43px!important}\n #menu #cm25HeroCarousel{min-height:162px!important}\n #menu #cm25HeroCarousel #heroes .heroPick{min-height:160px!important;max-height:175px!important}\n #menu #cm25HeroCarousel #heroes .heroPick .heroCanvas{width:135px!important}\n #menu .cm25HeroArrow{height:53px!important}\n #menu .classPick{margin:2px 0 4px!important}\n #menu .menuPanel>p:not(#cmAlunoAviso){margin:3px 0!important;font-size:16px!important}\n #menu #cm25HeroDots{margin-top:2px!important}\n #menu #cmAlunoAviso{margin:2px auto!important}\n #menu .menuActions{margin-top:3px!important}\n}\n@media(max-height:760px){\n #menu #cmAlunoOpcoes{top:auto!important;bottom:calc(100% + 3px)!important}\n}\n@media(max-width:620px){\n #menu #cm25HeroCarousel{\n  grid-template-columns:49px minmax(0,1fr) 49px!important;\n  gap:5px!important;min-height:0!important\n }\n #menu .cm25HeroArrow{width:49px!important;height:58px!important;font-size:35px!important}\n #menu #cm25HeroCarousel #heroes .heroPick{width:100%!important}\n #menu #cm25HeroCarousel #heroes .heroPick .heroCanvas{width:min(165px,91%)!important}\n #menu>.menuPanel{padding:8px 9px!important}\n #menu .classBtn{padding:8px 12px!important}\n}\n@media(max-width:620px) and (max-height:620px){\n #menu #cm25HeroCarousel #heroes .heroPick .heroCanvas{width:135px!important}\n #menu .cm25HeroArrow{height:52px!important}\n}\n@media(prefers-reduced-motion:reduce){\n #menu .cm25HeroArrow,#menu #cm25HeroCarousel #heroes .heroPick.cm25HeroCurrent{\n  animation:none!important;transition:none!important\n }\n}\n";
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

      // Carrossel visual: preserva os 6 cartões originais e seus handlers.
      // Setas, indicadores e swipe apenas acionam o clique original.
      if(!document.getElementById('cm25HeroCarousel')){
        const heroesBox=document.getElementById('heroes');
        const cards=heroesBox?[...heroesBox.querySelectorAll('.heroPick')]:[];
        if(heroesBox&&cards.length===6){
          const stage=document.createElement('div');stage.id='cm25HeroCarousel';
          stage.setAttribute('role','group');stage.setAttribute('aria-label','Seleção de herói; use setas para alternar');
          const makeArrow=(dir,label,glyph)=>{
            const btn=document.createElement('button');btn.type='button';
            btn.className='cm25HeroArrow '+(dir>0?'cm25Next':'cm25Prev');
            btn.textContent=glyph;btn.setAttribute('aria-label',label);
            return btn;
          };
          const previous=makeArrow(-1,'Herói anterior','❮');
          const next=makeArrow(1,'Próximo herói','❯');
          heroesBox.parentNode.insertBefore(stage,heroesBox);
          stage.append(previous,heroesBox,next);
          const dots=document.createElement('div');dots.id='cm25HeroDots';
          const position=document.createElement('div');position.id='cm25HeroPosition';
          position.setAttribute('aria-live','polite');position.setAttribute('aria-atomic','true');
          stage.insertAdjacentElement('afterend',position);
          stage.insertAdjacentElement('afterend',dots);
          const labels=cards.map(card=>card.querySelector('b')?.textContent?.trim()||'Herói');
          const indicators=cards.map((card,i)=>{
            const dot=document.createElement('button');dot.type='button';dot.className='cm25HeroDot';
            dot.setAttribute('aria-label','Selecionar '+labels[i]);
            dot.addEventListener('click',()=>choose(i));
            dots.appendChild(dot);return dot;
          });
          let selected=Math.max(0,cards.findIndex(c=>c.classList.contains('sel')));
          function render(){
            cards.forEach((card,i)=>{
              const current=i===selected;
              card.classList.toggle('cm25HeroCurrent',current);
              card.setAttribute('aria-hidden',current?'false':'true');
              card.tabIndex=current?0:-1;
              indicators[i].setAttribute('aria-current',current?'true':'false');
            });
            position.textContent='Herói '+(selected+1)+' de '+cards.length+' • '+labels[selected];
          }
          function choose(index,focus=false){
            selected=(index+cards.length)%cards.length;
            cards[selected].click(); // Atualiza heroIdx e .sel da V2.4/V2.5.
            render();
            if(focus)previous.focus();
          }
          cards.forEach((card,i)=>card.addEventListener('click',()=>{selected=i;render()}));
          previous.addEventListener('click',()=>choose(selected-1));
          next.addEventListener('click',()=>choose(selected+1));
          stage.addEventListener('keydown',event=>{
            if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
              event.preventDefault();choose(selected+(event.key==='ArrowRight'?1:-1));
            }
          });
          let touchX=null,touchY=null;
          heroesBox.addEventListener('pointerdown',event=>{
            if(event.pointerType==='mouse')return;
            touchX=event.clientX;touchY=event.clientY;
          },{passive:true});
          heroesBox.addEventListener('pointerup',event=>{
            if(touchX===null||event.pointerType==='mouse')return;
            const dx=event.clientX-touchX,dy=event.clientY-touchY;
            touchX=null;touchY=null;
            if(Math.abs(dx)>=45&&Math.abs(dx)>Math.abs(dy)*1.25)choose(selected+(dx<0?1:-1));
          });
          render();
        }
      }
      // Lista suspensa de alunos: os resultados não empurram o botão Iniciar.
      if(!document.getElementById('cm25NameInputWrap')){
        const studentInput=document.getElementById('playerName');
        const studentOptions=document.getElementById('cmAlunoOpcoes');
        if(studentInput&&studentOptions){
          const holder=document.createElement('div');holder.id='cm25NameInputWrap';
          studentInput.parentNode.insertBefore(holder,studentInput);
          holder.append(studentInput,studentOptions);
        }
      }
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
