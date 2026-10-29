/* ClassMana V2.5 — modo de teste direto do Reino 8: Hidra.
   EXTENSÃO da V2.4: preserva seu menu, vídeos, acesso, 6 heróis, recarga e chefão.
   Teste isolado: nenhum salvamento e nenhuma submissão ao ranking.
*/
(function(){
'use strict';
// Dificuldade unificada mais acessível: -20% de HP e de dano inimigo.
// Mantem numero, velocidade, intervalos, hordas, tecnicas e sprites inalterados.
const CM25_BALANCE=Object.freeze({hp:.80,damage:.80,bossHPReference:3654});
const cm25EnemyDamage=original=>Math.round(original*CM25_BALANCE.damage*10)/10;
// Usa o chefão Hidra original da V2.4, com dano reescalado no motor.
stages[0]={...stages[7],atk:cm25EnemyDamage(stages[7].atk)};
const S={area:0,active:false,transition:false,mobs:[],fx:[],camera:0,lastCamera:0,world:0,
 names:['PORTAL DAS ESCAMAS','LAGOA DO VENENO','TEMPLO DAS SERPENTES','FORTALEZA TÓXICA','SANTUÁRIO DA HIDRA · ARENA FINAL'],
 // Seis modelos aprovados de serpentes rastejantes; um PNG por tipo.
 // Horda encorpada: 40 adversarios distribuidos em 8 setores, sem alterar sprites.
 waves:Array.from({length:4},(_,area)=>Array.from({length:40},(_,i)=>(i+area)%6)),
 files:['serpente_01.png','serpente_02.png','serpente_03.png','serpente_04.png','serpente_05.png','serpente_06.png'],
 spriteFrames:Array.from({length:6},(_,i)=>['serpente_'+String(i+1).padStart(2,'0')+'.png']),
 bg:[],imgs:[],facing:1,total:0,clock:0,advanceReady:false,idleSeconds:0,arrowPulse:0,vy:0,jumpWasDown:false,shotDirection:1,shotHits:0,loot:null,lootClock:0,lootNext:14,lootCount:0,lootHeartUsed:false,lootChestUsed:false,lootPhaseChest:false,lootBuffs:{},lootNotice:"",lootNoticeTime:0,lootMapUntil:0,bossMovement:0,bossFace:1,bossHealthAtStart:0,previousBossHP:0,lootGuarantees:{},spriteFeet:0
};
// Revisao 13: volume de subordinados deste reino, distribuido pelo percurso.
// Nao altera hordas do chefe, dano, sprites ou posicoes verticais.
S.waves=S.waves.map(base=>Array.from({length:36},(_,i)=>base[i%base.length]));
const getAsset=f=>new URL('assets_v25/'+f,location.href).href;
// Conservar os seis frames da V2.4 e acrescentar apenas quatro novos arquivos.
// Mega-Aranha usa as artes e animações oficiais da V2.4.
window.cm25ExtraGolemFrames=false;
window.cm25GolemBossEnlarged=false;

for(let i=1;i<=5;i++){const im=new Image();im.src=getAsset('cenarios/cenario_'+i+'.jpg');S.bg.push(im)}
for(const frames of S.spriteFrames){S.imgs.push(frames.map(f=>{const im=new Image();im.src=getAsset('inimigos/'+f);return im}))}
const orig={reset:resetStage,update,draw,fire,defeat:finishBossDefeat,hero:drawHero,bg:drawBackgroundCached};
window.cm25Facing=1;
window.addEventListener('keydown',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')window.cm25Facing=-1;if(e.code==='ArrowRight'||e.code==='KeyD')window.cm25Facing=1},true);
let css=document.createElement('style');css.textContent=`
 #openRanking,#bonusViewRanking{display:none!important}
 #cm25stage-transition{position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 42%,rgba(20,91,61,.88),rgba(8,24,31,.96));color:#f3f4ff;font-family:Georgia,'Trebuchet MS',sans-serif;text-align:center;pointer-events:none}
 #cm25stage-transition .frame{width:min(88vw,720px);padding:24px 25px 30px;border:2px solid #9ce5f5;border-radius:18px;background:linear-gradient(145deg,rgba(27,52,88,.91),rgba(47,36,85,.92));box-shadow:0 0 0 5px #8a61a42d,0 18px 65px #000b, inset 0 0 55px #75a6ff24}
 #cm25stage-transition .eyebrow{font-size:clamp(12px,1.5vw,17px);color:#ffdfb2;letter-spacing:.2em;margin-bottom:14px}
 #cm25stage-transition .heading{font-size:clamp(23px,4vw,43px);font-weight:900;color:#ffe8aa;text-shadow:0 4px 0 #52387a,0 0 20px #96cbec66;margin:8px 0}
 #cm25stage-transition .desc{font-size:clamp(15px,1.7vw,22px);color:#dcf5ff;margin-top:10px}
 #cm25stage-transition .meter{height:7px;border-radius:8px;background:#101d45;margin-top:24px;overflow:hidden}.meter span{display:block;height:100%;width:0%;background:linear-gradient(90deg,#ff6f38,#f9d484);transition:width 1.65s linear}
 .controls{right:7px!important;bottom:9px!important;gap:5px!important;grid-template-columns:repeat(2,minmax(98px,135px))!important}
 .controls .btn{font-size:11px!important;padding:8px 6px!important;border-radius:11px!important;min-height:39px!important;box-shadow:0 3px 0 #030914!important}
 .hud .card{width:min(295px,32vw)!important;padding:5px 8px!important;border-radius:10px!important}
 .hud .name{font-size:clamp(12px,1.3vw,16px)!important}
 .hud .stats{font-size:11px!important;margin:2px 0!important}
 .hud .bar{height:8px!important;margin-top:3px!important}
 .hud .title{font-size:10px!important}
 .hud .card:last-child{width:min(215px,26vw)!important;min-height:0!important;align-self:flex-start;padding:4px 7px!important}
 .hud .card:last-child .name{font-size:clamp(11px,1.1vw,14px)!important;line-height:1.1!important}
 .hud .card:last-child .stats{font-size:10px!important;line-height:1.15!important}
 .hud .card:last-child .bar{height:6px!important;margin-top:3px!important}
 .controls{grid-template-columns:repeat(2,minmax(105px,137px))!important;gap:7px!important;bottom:27px!important;right:24px!important}
 .controls .btn{min-height:40px!important;font-size:11px!important;line-height:1.18!important;padding:7px 6px!important}
 #ultimate{font-size:10px!important;min-height:36px!important}
 @media(max-width:660px){.controls{right:11px!important;bottom:17px!important;grid-template-columns:repeat(2,minmax(82px,106px))!important;gap:4px!important}.controls .btn{font-size:9px!important;min-height:32px!important;padding:4px!important}}
 #cm25stage-transition{background:rgba(8,12,33,.50)!important}
 #cm25stage-transition .frame{position:relative;overflow:hidden;isolation:isolate;background:rgba(14,26,53,.55)!important;max-width:760px!important;border:2px solid #b3eaff!important;box-shadow:0 0 45px #6ac7e944,0 25px 60px #020918!important}
 #cm25stage-transition .scene-art{position:absolute;inset:0;z-index:-2;background-position:center;background-size:cover;filter:brightness(.52) saturate(1.1)}
 #cm25stage-transition .frame::before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,#07152dba,#1a1b4c89,#07152dba)}
 #cm25stage-transition .defeated{display:flex;justify-content:center;align-items:end;gap:10px;margin:13px auto;min-height:90px}
 #cm25stage-transition .defeated img{height:clamp(70px,12vh,114px);max-width:27%;object-fit:contain;filter:drop-shadow(0 0 10px #78dafa)}


 `;document.head.appendChild(css);
const overlay=document.createElement('div');overlay.id='cm25stage-transition';overlay.innerHTML='<div class="frame"><div class="scene-art"></div><div class="eyebrow">✦ CLASSMANA · ABISMO DA HIDRA ✦</div><div class="heading"></div><div class="defeated"></div><div class="desc"></div><div class="meter"><span></span></div></div>';
(document.body||document.documentElement).appendChild(overlay);
const say25=(s,t=2)=>say(s,t);
const clamp=(a,l,r)=>Math.max(l,Math.min(r,a));
// Alturas de piso calibradas individualmente de acordo com a área pavimentada de cada imagem.
// Corrigir nesta tabela, sem voltar a alterar a gravidade dos personagens.
// Pontos de contato do piso medidos na arte original após escala de 112%.
// Todos os personagens terrestres usam exatamente ESTA tabela, nunca um ao outro.
// Ajuste fino do piso: valores intermediarios para corrigir o excesso de elevacao anterior.
// Mantem cada cenario e a fisica originais; corrige apenas a ancora vertical.
const platformRatios=[.82,.82,.82,.82,.82];
const platformY=()=>H*platformRatios[S.area];
// Pequena correcao optica do rodape de cada PNG das serpentes; nao mexe no piso ou nos herois.
const serpentSoleY=()=>platformY()+Math.max(6,Math.min(12,H*.014));
const heroHeight=()=>Math.min(142,H*.225);
const bossHeight=()=>Math.min(320,H*.46);
// O desenho dos heróis usa centro y-45; o limite é calculado pelos pés VISÍVEIS.
// Ajuste apenas da margem transparente inferior de cada sprite (em fração da altura).
const heroFootTrim=()=>[.015,.018,.018,.020,.016,.020][heroIdx]??.018;
// A arena original da V2.4 tem margens transparentes diferentes dos novos cenários.
// Compensações restritas ao território final; Física continua ancorada pelo limite inferior.
// Reino 8: o usuario apontou o heroi ~2–3 mm acima do piso nos cinco
// territorios. Ajuste local de 9 CSS px; nao muda as serpentes.
const heroVisualFootPad=()=>9;
const bossVisualFootPad=()=>0;
const ground=()=>platformY()+45-heroHeight()/2+heroHeight()*heroFootTrim()+heroVisualFootPad();
const gravity=()=>heroIdx===0||heroIdx===5?380:570; // salto amplo; fada flutua um pouco mais
const heroCeiling=()=>Math.max(125,H*.24); // limite superior da faixa de voo/salto
const worldLen=()=>W*4.25; // Permite rolagem longa e pelo menos uma repetição do cenário.

// ITENS DE APOIO — somente assets existentes da V2.4; os PNGs são carregados uma vez.
const lootDefs={
 heart:{label:'CORAÇÃO',file:'heart.png',ttl:11},
 chest:{label:'BAÚ DA MAGIA',file:'chest.png',ttl:12},
 crystal:{label:'CRISTAL DE MANA',file:'crystal.png',ttl:10},
 clock:{label:'TEMPO LENTO',file:null,emoji:'⏱️',ttl:9},
 shield:{label:'ESCUDO',file:'shield.png',ttl:9},
 sword:{label:'ESPADA',file:'dagger.png',ttl:9},
 map:{label:'MAPA',file:'compass.png',ttl:11}
};
const lootImgs={};
for(const [key,def] of Object.entries(lootDefs)){
 if(def.file){const img=new Image();img.src=AS+'items3d/'+def.file;lootImgs[key]=img}
}
const cm25OrigSuperLimit=superLimit;
superLimit=function(){const base=cm25OrigSuperLimit();return stage===0&&S.active&&S.lootPhaseChest?base*2:base};
function lootMessage(message){S.lootNotice=message;S.lootNoticeTime=2.7;say25(message,2.7)}
function lootResetTerritory(){
 S.loot=null;S.lootClock=0;S.lootCount=0;S.lootNext=8+Math.random()*3;
 S.lootHeartUsed=false;S.lootGuarantees={shield:false,chest:false};S.lootBuffs={};S.lootNotice='';S.lootNoticeTime=0;S.lootMapUntil=0;
 // O baú dobra o número de usos do SUPER até terminar a fase, se foi coletado.
}
function lootPickType(){
 // Preferências determinísticas em risco de vida: não permitir que cronômetros
 // consumam todas as oportunidades de coração ou escudo.
 if(p.hp<=40&&!S.lootHeartUsed)return 'heart';
 if(!S.lootGuarantees.shield&&(p.hp<=70||S.lootCount>=1)){S.lootGuarantees.shield=true;return 'shield'}
 if(!S.lootChestUsed&&!S.lootGuarantees.chest&&S.area>=1){S.lootGuarantees.chest=true;return 'chest'}
 if(p.mana<=35)return 'crystal';
 const choices=['shield','crystal','sword','map','clock'];
 return choices[Math.floor(Math.random()*choices.length)];
}
function lootSpawn(key){
 if(S.loot||!playing||paused||S.transition)return;
 const def=lootDefs[key];if(!def)return;
 const maxX=S.area===4?W*.52:S.world-W*.12;
 const nearX=Math.max(W*.18,Math.min(maxX,p.x+W*(.17+Math.random()*.10)));
 S.loot={key,x:nearX,y:platformY()-8,age:0,life:def.ttl};
 S.lootCount++;if(key==='heart')S.lootHeartUsed=true;
 lootMessage('✨ '+def.label+' APARECEU! ALCANCE A TEMPO!');
}
function lootCollect(){
 if(!S.loot)return;
 const key=S.loot.key;
 S.loot=null;S.lootNext=12+Math.random()*5;S.lootClock=0;
 if(key==='heart')p.hp=Math.min(100,p.hp+20);
 if(key==='crystal')p.mana=Math.min(100,p.mana+25);
 if(key==='chest'){S.lootChestUsed=true;S.lootPhaseChest=true;}
 if(key==='clock')S.lootBuffs.clock=6;
 if(key==='shield'){S.lootBuffs.shield=5;p.shield=Math.max(p.shield,5)}
 if(key==='sword')S.lootBuffs.sword=8;
 if(key==='map')S.lootMapUntil=8;
 burst(p.x,p.y-75,key==='heart'?'#ff6189':'#83dfff',19);
 const description={heart:'+1 CORAÇÃO',crystal:'+25 MANA',chest:'LIMITE DE SUPER x2 ATÉ O FIM DA FASE',clock:'INIMIGOS LENTOS POR 6s',shield:'PROTEÇÃO POR 5s',sword:'DANO AUMENTADO POR 8s',map:'PRÓXIMO ITEM SINALIZADO'}[key];
 lootMessage('🎁 '+description);
}
function lootStep(dt){
 if(!playing||paused||S.transition||gameEnded)return;
 if(S.lootNoticeTime>0)S.lootNoticeTime=Math.max(0,S.lootNoticeTime-dt);
 for(const key of Object.keys(S.lootBuffs))S.lootBuffs[key]=Math.max(0,S.lootBuffs[key]-dt);
 S.lootMapUntil=Math.max(0,S.lootMapUntil-dt);
 if(S.loot){
  S.loot.age+=dt;S.loot.life-=dt;
  const a=S.loot;
  // Pegar por aproximação ou pulando sobre o objeto; não permite coleta à distância.
  if(Math.abs(p.x-a.x)<Math.max(35,W*.033)&&Math.abs((p.y-45)- (a.y-33))<105){lootCollect()}
  else if(a.life<=0){S.loot=null;S.lootClock=0;S.lootNext=13+Math.random()*9}
  return;
 }
 if(S.lootCount>=3)return;
 S.lootClock+=dt;
 const critical=p.hp<=40&&!S.lootHeartUsed;
 if(critical&&S.lootClock>2.0){lootSpawn('heart');return}
 if(S.lootClock>=S.lootNext){lootSpawn(lootPickType())}
}
function lootDraw(worldSpace){
 if(!S.loot)return;
 const a=S.loot,def=lootDefs[a.key],img=lootImgs[a.key],size=Math.min(82,H*.12);
 const y=a.y-38+Math.sin(a.age*4)*5;
 ctx.save();
 if(worldSpace)ctx.translate(-S.camera,0);
 ctx.globalAlpha=Math.min(1,a.life/1.1);
 ctx.shadowColor=a.key==='heart'?'#ff6e93':'#83edff';ctx.shadowBlur=18;
 ctx.fillStyle='#b9eaff';ctx.beginPath();ctx.ellipse(a.x,a.y-5,31,7,0,0,Math.PI*2);ctx.fill();
 if(img&&img.complete&&img.naturalWidth){
  const w=size*img.naturalWidth/img.naturalHeight;
  ctx.drawImage(img,a.x-w/2,y-size/2,w,size);
 }else{ctx.font=Math.round(size*.85)+'px sans-serif';ctx.textAlign='center';ctx.fillText(def.emoji||'✦',a.x,y+19)}
 ctx.shadowBlur=0;ctx.globalAlpha=1;
 const seconds=Math.ceil(a.life);
 ctx.font='bold 13px Trebuchet MS,Arial';ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.strokeStyle='#102445';ctx.lineWidth=3;
 ctx.strokeText(seconds+'s',a.x,y-size*.55-5);ctx.fillText(seconds+'s',a.x,y-size*.55-5);
 ctx.restore();
}
function lootHud(){
 if(!S.lootNoticeTime&&!S.lootMapUntil&&!S.lootPhaseChest)return;
 const labels=[];
 if(S.lootNoticeTime>0)labels.push(S.lootNotice);
 if(S.lootMapUntil>0)labels.push('🧭 PRÓXIMO ITEM EM '+Math.max(0,Math.ceil(S.lootNext-S.lootClock))+'s');
 if(S.lootPhaseChest)labels.push('✨ SUPER x2');
 ctx.save();ctx.textAlign='center';ctx.font='bold '+Math.round(Math.min(14,W*.012))+'px Trebuchet MS,Arial';
 const text=labels.join('    ·    '),x=W*.50,y=H*.15;
 ctx.fillStyle='rgba(8,22,52,.72)';ctx.fillRect(x-Math.min(W*.38,text.length*4),y-18,Math.min(W*.76,text.length*8),26);
 ctx.fillStyle='#ffe4a0';ctx.fillText(text,x,y);ctx.restore();
}

// Efeitos visuais do território: emoji emitido PELO monstro em coordenadas de mundo.
const mobEmojis=['🐍','☣️','💥','🧪','🐍','☣️'];
const mobFxColors=['#ff8649','#ffcf73','#a5ecff','#b6a0ff','#ffe36e','#8ff2ff'];
function emitMobEffect(m,count=2,forced=-1){
 if(S.fx.length>95)S.fx.splice(0,S.fx.length-75);
 for(let i=0;i<count;i++){
  const ix=forced>=0?forced:(m.id+i+Math.floor(Math.random()*mobEmojis.length))%mobEmojis.length;
  S.fx.push({x:m.x+(Math.random()-.5)*m.size*.30,
   y:m.y-m.size*(.45+Math.random()*.27),vx:(Math.random()-.5)*65,
   vy:-42-Math.random()*80,life:.68+Math.random()*.42,max:1.10,
   symbol:mobEmojis[ix],color:mobFxColors[ix],size:19+Math.random()*14});
 }
}
function stepMobEffects(dt){
 for(const fx of S.fx){fx.x+=fx.vx*dt;fx.y+=fx.vy*dt;fx.vy+=34*dt;fx.life-=dt;}
 S.fx=S.fx.filter(fx=>fx.life>0);
}
function drawMobEffects(){
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
 for(const fx of S.fx){ctx.globalAlpha=Math.min(1,fx.life/.35);ctx.shadowColor=fx.color;
  ctx.shadowBlur=13;ctx.font=`${Math.round(fx.size)}px 'Segoe UI Emoji','Apple Color Emoji',sans-serif`;
  ctx.fillStyle=fx.color;ctx.fillText(fx.symbol,fx.x,fx.y);
 }
 ctx.restore();
}

function changedArea(name,desc,cb,stayPaused=false,delay=1850){
 S.transition=true;playing=false;paused=true;overlay.style.display='flex';
 // Reaproveita as artes aprovadas do território derrotado; nenhuma geração nova.
 overlay.querySelector('.scene-art').style.backgroundImage=`url('${S.bg[S.area]?.src||''}')`;
 const used=[...new Set(S.waves[S.area]||[])].slice(0,3);
 overlay.querySelector('.defeated').replaceChildren(...used.map(id=>{const im=document.createElement('img');im.src=S.imgs[id]?.[0]?.src||'';im.alt='Subordinado derrotado';return im}));
 overlay.querySelector('.heading').textContent=name;
 overlay.querySelector('.desc').textContent=desc;
 const bar=overlay.querySelector('.meter span');bar.style.transition='none';bar.style.width='0%';
 requestAnimationFrame(()=>{bar.style.transition='width 1.65s linear';bar.style.width='100%'});
 setTimeout(()=>{overlay.style.display='none';cb();S.transition=false;if(!stayPaused){playing=true;paused=false}},delay);
}
function createMob(id,i,n){
 // Oito pontos de emboscada ao longo da travessia. Cada bando nasce
 // DISTRIBUÍDO dos dois lados da futura zona de cerco, sem teleporte.
 const pack=Math.floor(i/5), member=i%5;
 const center=W*(.49+pack*.47);
 const offsets=pack===0?[-.40,-.28,-.02,.12,.27]:[-.23,-.12,.015,.13,.27];
 const x=clamp(center+W*offsets[member],W*.085,S.world-W*.065);
 // Três portes preservados: 12 pequenas, 16 médias, 12 grandes por território.
 const sizeTier=i%10<3?0:i%10<7?1:2;
 const size=[Math.min(110,H*.165),Math.min(150,H*.220),Math.min(190,H*.285)][sizeTier];
 const max=Math.max(1,Math.round((3+Math.floor((S.area+id)/3))*22*CM25_BALANCE.hp));
 const floor=serpentSoleY();
 // Cobra rasteja abaixo da velocidade do herói (265 px/s), acelerando aos poucos.
 const speed=[128,108,92][sizeTier]+(id%3)*6+S.area*5;
 return {id,x,stationX:x,y:floor-size*.50,baseY:floor-size*.50,max,hp:max,size,phase:i*.73,
   speed,vx:0,cool:.50+(i%5)*.22,contact:0,age:0,hit:0,
   behavior:'cerco',sizeTier,dive:0,diveCooldown:2.5+(i%5)*.75,attacks:0,bites:0,
   batch:pack,engaged:false,flank:0,facing:-1,chaseTravel:0,alertAt:-1};
}

function setHud(){
 $('#ename').textContent=S.area===4?'HIDRA':S.names[S.area];
 $('#round').textContent='HIDRA · TERRITÓRIO '+(S.area+1)+'/5';
 $('#stageText').textContent=S.area===4?'SANTUÁRIO DA HIDRA · CONFRONTO FINAL':'ABISMO DA HIDRA · '+S.names[S.area];
 $('#difficulty').textContent=S.area===4?'BATALHA FINAL':'SERPENTES · '+S.total+' RESTANTES';
 $('#ehp').style.width=S.area===4?'100%':(S.mobs.length?S.total/S.mobs.length*100:100)+'%';
}

function startTerritory(){
 stages[0]={...stages[7],atk:cm25EnemyDamage(stages[7].atk)};
 window.cm25HydraBoss=S.area===4;
 lootResetTerritory();cm25MeleeCooldown=0;
 S.mobs=[];S.fx=[];S.camera=0;S.lastCamera=0;S.advanceReady=false;
 S.world=worldLen();S.clock=0;S.localUltimateUses=0;S.idleSeconds=0;S.arrowPulse=0;
 S.vy=0;S.jumpWasDown=false;S.packAlerts=new Set();S.packHunts=0;
 p.x=W*.32;p.y=ground();window.cm25HeroFeetOffset=0;
 p.hp=100;p.mana=100;p.inv=1.5;
 shots=[];bad=[];parts=[];superCooldown=0;superUses=0;bossDefeated=false;
 if(S.area<4){
  const ids=S.waves[S.area];S.mobs=ids.map((id,i)=>createMob(id,i,ids.length));S.total=S.mobs.length;
 }else{
  boss.max=Math.round(CM25_BALANCE.bossHPReference*CM25_BALANCE.hp);boss.hp=boss.max;boss.x=W*.79;boss.y=platformY()-bossHeight()/2;
  boss.cool=2.8;S.total=0;S.bossIntroTime=1.85;S.bossPhase=1;S.bossPhaseNotice=0;
  S.camera=0;S.bossMovement=0;S.bossSuperClock=10;S.bossBiteCool=1.2;S.bossFace=-1;
  S.bossHealthAtStart=boss.hp;S.previousBossHP=boss.hp;
  S.bossJetClock=7.4;S.bossJetLeft=0;S.bossJetGap=0;S.bossJetCount=0;
  S.defenderQueue=Array.from({length:15},(_,i)=>i%6);
  S.guardianSpawnCooldown=1.2;S.mobs=[];S.total=15;
 }
 if(soundOn){try{playMediaAudio(trilhaFases[7],true,.75)}catch(e){console.warn('Trilha da Hidra indisponível',e)}}
 setHud();say25('🐍 '+S.names[S.area]+' — '+(S.area===4?'CHEFONA!':'avance e vença as serpentes!'),3);
}

resetStage=function(){orig.reset();if(stage!==0)return;S.area=0;S.active=true;S.lootChestUsed=false;S.lootPhaseChest=false;startTerritory()};
function updateFacing(dx){
 if(dx>0.08)window.cm25Facing=1;
 else if(dx<-.08)window.cm25Facing=-1;
}
// Mira assistida: considera o corpo real e a direção física de cada alvo.
function mobAimPoint(m){return {x:m.x,y:m.y}}
function closestMob(){
 let best=null,score=Infinity;
 // Só prioriza o lado do jogador quando há alvos dos dois lados.
 // Nunca usa o ângulo da animação como origem do disparo.
 const facing=window.cm25Facing||1;
 for(const m of S.mobs){
  if(m.hp<=0)continue;
  const point=mobAimPoint(m),dx=point.x-p.x,dy=point.y-(p.y-65);
  const d=Math.hypot(dx,dy);
  if(d>W*.76)continue;
  const cost=d+(dx*facing<0?W*.50:0);
  if(cost<score){best=m;score=cost}
 }
 return best;
}
function currentAim(){
 const target=S.area===4?boss:closestMob(),facing=window.cm25Facing||1;
 const tx=target?(S.area===4?boss.x:mobAimPoint(target).x):p.x+facing*350;
 const ty=target?(S.area===4?boss.y:mobAimPoint(target).y):p.y-65;
 const sign=tx>=p.x?1:-1;
 const sx=p.x+sign*23,sy=p.y-65;
 return {target,x:tx,y:ty,sx,sy,angle:Math.atan2(ty-sy,tx-sx),sign};
}
function retargetShots(first,power=false){
 const qlist=shots.slice(first),a=currentAim();
 if(a.target){window.cm25Facing=a.sign;S.shotDirection=a.sign}
 for(let i=0;i<qlist.length;i++){
  const q=qlist[i],speed=Math.max(180,Math.hypot(q.vx,q.vy));
  // A rajada SUPER é convergente: todos os projéteis chegam ao corpo,
  // mas com pequeno deslocamento inicial, sem subir aleatoriamente.
  const n=qlist.length,offset=n>1?(i-(n-1)/2)*7:0;
  q.x=a.sx;q.y=a.sy+offset;
  const theta=Math.atan2(a.y-q.y,a.x-q.x);
  q.vx=Math.cos(theta)*speed;q.vy=Math.sin(theta)*speed;
  q.cmTarget=a.target;q.cmFromHero=true;
 }
}
fire=function(power=false){
 if(stage!==0||!S.active)return orig.fire(power);
 if(S.area===4&&S.bossIntroTime>0)return;
 if(!playing||paused||S.transition||defeatPending)return;
 const first=shots.length;
 // O motor original mantém gastos de mana, sons e recarga do SUPER.
 // Apontamos o proxy do chefe apenas para que o disparo original exista.
 const a=currentAim(),oldX=boss.x,oldY=boss.y;
 if(S.area<4){boss.x=a.x;boss.y=a.y}
 try{orig.fire(power)}finally{boss.x=oldX;boss.y=oldY}
 retargetShots(first,power);
};
// Intercepta C e clique ANTES do módulo externo: V2.5 usa a vida do chefe real.
// Custo original mantido (500 pontos + 20% da vida); não depende do estado 'usedHero'
// de outra fase, que vinha deixando o botão inativo na batalha final.
function cm25CastUltimate(){
 if(!S.active||stage!==0||!playing||paused||defeatPending||bossDefeated)return;
 const limit=S.area===4?3:1;
 if((S.localUltimateUses||0)>=limit){say25('⚡ MAGIA SUPREMA: usos esgotados neste território!',1.6);return}
 if(score<500){say25('⚡ MAGIA SUPREMA: são necessários 500 pontos!',1.8);return}
 if(p.hp<=20){say25('⚡ MAGIA SUPREMA: vida muito baixa!',1.8);return}
 const target=S.area===4?boss:closestMob();
 if(!target){say25('⚡ MAGIA SUPREMA: nenhum alvo próximo!',1.8);return}
 S.localUltimateUses=(S.localUltimateUses||0)+1;
 score-=500;p.hp=Math.max(1,p.hp*.80);
 $('#php').style.width=p.hp+'%';
 const x=S.area===4?boss.x:target.x, y=S.area===4?boss.y:target.y-target.size*.52;
 const damage=S.area===4?Math.max(1,Math.ceil(boss.max*.21)):Math.max(1,Math.ceil(target.max*.84));
 target.hp=Math.max(0,target.hp-damage);
 burst(x,y,'#f6ddff',55);shake=13;try{tone(760,.42,'sine',.08)}catch(_e){}
 if(S.area===4){$('#ehp').style.width=(boss.hp/boss.max*100)+'%';
   if(boss.hp<=0){defeatPending=true;finishBossDefeat();}
 }else if(target.hp<=0){S.total=Math.max(0,S.total-1);setHud()}
 say25('⚡ MAGIA SUPREMA! -500 PONTOS • -20% VIDA',2.2);
}
function cm25UltimateShortcut(e){
 if(!S.active||stage!==0||!playing||paused)return;
 if(e.code!=='KeyC'||e.repeat||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
 e.preventDefault();e.stopImmediatePropagation();cm25CastUltimate();
}
window.addEventListener('keydown',cm25UltimateShortcut,true);
const cm25UltimateButton=document.getElementById('ultimate');
if(cm25UltimateButton){cm25UltimateButton.addEventListener('click',e=>{
 if(!S.active||stage!==0||!playing||paused)return;
 e.preventDefault();e.stopImmediatePropagation();cm25CastUltimate();
},true);
 // A UI original pode manter o botão desabilitado após atravessar fases.
 cm25UltimateButton.disabled=false;
}
// A Magia Suprema da V2.4 afeta o chefe original. Nesta arena de hordas,
// redirecionamos o dano ao subordinado selecionado, sem matar alvos invisíveis.
const cm25OriginalUltimate=window.ClassManaUltimateAPI&&window.ClassManaUltimateAPI.heroUltimate;
if(cm25OriginalUltimate){
 window.ClassManaUltimateAPI.heroUltimate=function(pointCost,hpCostPct,bossDamagePct){
  if(stage!==0||!S.active||S.area===4)return cm25OriginalUltimate(pointCost,hpCostPct,bossDamagePct);
  if(!playing||paused||defeatPending||!S.active)return {ok:false,reason:'indisponivel'};
  const target=closestMob();if(!target){say25('⚡ Nenhum monstro ao alcance!',1.4);return {ok:false,reason:'sem alvo'}}
  if(score<pointCost){say25('⚡ Pontos insuficientes!',1.4);return {ok:false,reason:'pontos'}}
  if(p.hp<=20){say25('⚡ Vida muito baixa!',1.4);return {ok:false,reason:'vida'}}
  score=Math.max(0,score-pointCost);p.hp=Math.max(1,p.hp*(1-hpCostPct));
  $('#php').style.width=p.hp+'%';
  const aim=mobAimPoint(target);S.ultimateAimX=aim.x;S.ultimateAimY=aim.y;S.ultimateScreenX=aim.x-S.camera;
  const damage=Math.max(1,Math.ceil(target.max*.84));
  // O alvo mantém colisão e visibilidade: não há dano em monstros já derrotados.
  setTimeout(()=>{if(!S.active||S.area>=4||target.hp<=0||!playing)return;
   target.hp=Math.max(0,target.hp-damage);target.hit=.22;burst(aim.x,aim.y,'#a8f0ff',55);
   if(target.hp===0){S.total--;setHud()}},420);
  say25('⚡ MAGIA SUPREMA NO ALVO!',2);return {ok:true};
 };
}
// Utilizada pela animação externa da Magia Suprema: centro real do alvo na tela.
window.cm25UltimateTargetScreen=function(){
 if(!S.active||stage!==0)return null;
 if(S.area===4)return boss.x;
 const m=closestMob();return m?m.x-S.camera:null;
};
// COMBATE DE CURTA DISTANCIA — regra UNICA para os 6 herois no Reino 5.
// Somente colisao REAL do corpo/arma na frente do heroi; intervalo por golpe,
// para impedir dano multiplicado a cada frame quando os sprites se sobrepoem.
const cm25HeroContactDamage=[6,6,8,9,7,8]; // fada, chama, lobo, cavaleiro, maga, dragao
let cm25MeleeCooldown=0;
const cm25ContactInterval=.74;
function cm25HeroContactCenter(){
 return window.ClassManaNucleo.weapon.hitbox({heroIdx,p,H,facing:window.cm25Facing||1});
}
function cm25ApplyHeroContact(dt,includeBoss=false){
 if(!S.active||stage!==0||!playing||paused||S.transition||defeatPending||bossDefeated)return;
 cm25MeleeCooldown=Math.max(0,cm25MeleeCooldown-dt);
 if(cm25MeleeCooldown>0)return;
 const h=cm25HeroContactCenter();
 const damage=h.damage;
 for(const m of S.mobs){
  if(m.hp<=0)continue;
  const targetY=m.y;
  const radius=Math.max(12,m.size*.29);
  const deltaX=m.x-h.x,deltaY=targetY-h.y;
  if(deltaX*deltaX+deltaY*deltaY>(radius+h.radius)**2)continue;
  m.hp=Math.max(0,m.hp-damage);m.hit=.22;
  burst(m.x,targetY,'#ffeaa7',9);
  cm25MeleeCooldown=cm25ContactInterval;
  if(m.hp<=0){S.total=Math.max(0,S.total-1);burst(m.x,targetY,'#d2f5ff',20);setHud()}
  return;
 }
 if(includeBoss&&boss.hp>0){
  // O chefao recebe dano proporcionalmente MENOR que os subordinados.
  const radius=bossHeight()*.30;
  const dx=boss.x-h.x,dy=boss.y-h.y;
  if(dx*dx+dy*dy<=(radius+h.radius)**2){
   const dmg=Math.min(14,Math.max(3,Math.round(boss.max*.007)));
   boss.hp=Math.max(0,boss.hp-dmg);
   $('#ehp').style.width=(boss.hp/boss.max*100)+'%';
   burst(boss.x,boss.y,'#ffecab',8);
   cm25MeleeCooldown=cm25ContactInterval;
   if(boss.hp<=0){defeatPending=true;finishBossDefeat();}
  }
 }
}
function hurtHero(points,x,y){if(p.shield>0||p.inv>0)return;p.hp=Math.max(0,p.hp-cm25EnemyDamage(points));p.inv=.7;burst(x,y,'#e7a9fb',15);shake=5}
// Todos os seis tipos de subordinado têm arma própria: o limite de projéteis não
// cancela para sempre o turno de nenhum inimigo. Cada um reage à distância.
const attackEmojiById=Array(16).fill('🐍');
const attackColorById=Array.from({length:16},(_,i)=>['#d6b9ff','#a474fb','#ff7db5','#e9eaff'][i%4]);
const cmAcidAtlases=[
 ['acido_verde_frame_01.png','acido_verde_frame_02.png','acido_verde_frame_03.png','acido_verde_frame_04.png'],
 ['acido_cor_0_frame_01.png','acido_cor_0_frame_02.png','acido_cor_0_frame_03.png','acido_cor_0_frame_04.png'],
 ['acido_cor_1_frame_01.png','acido_cor_1_frame_02.png','acido_cor_1_frame_03.png','acido_cor_1_frame_04.png'],
 ['acido_cor_2_frame_01.png','acido_cor_2_frame_02.png']
].map(frames=>frames.map(file=>{const im=new Image();im.src=getAsset('projeteis/'+file);return im}));
function drawHostileMissile(q){
 const id=q.acidColor===undefined?(q.ownerId||0)%4:q.acidColor%4;
 const frames=cmAcidAtlases[id]||cmAcidAtlases[0];
 const im=frames[Math.floor((T+(q.ageOffset||0))*10)%frames.length];
 const dx=q.vx||-1,dy=q.vy||0,angle=Math.atan2(dy,dx);
 // As artes de acido sao panoramicas (ate ~3:1). Limitar pela LARGURA
 // real evita um projetil maior do que a cobra que o disparou.
 const width=q.cmSerpentAcid?Math.max(28,Math.min(44,q.visualWidth||36)):(q.isBossAcid?92:70);
 ctx.save();ctx.translate(q.x,q.y);ctx.rotate(angle-Math.PI);
 ctx.shadowColor=q.col||'#7bff48';ctx.shadowBlur=q.cmSerpentAcid?6:11;
 if(im&&im.complete&&im.naturalWidth){const ratio=im.naturalWidth/im.naturalHeight;const height=width/ratio;ctx.drawImage(im,-width/2,-height/2,width,height)}
 else {ctx.fillStyle='#82ff2d';ctx.beginPath();ctx.arc(0,0,q.cmSerpentAcid?10:16,0,Math.PI*2);ctx.fill()}
 ctx.restore();
}

// REINO 8 · CERCO TÁTICO COM REVEZAMENTO — sem ataque em fila nem acúmulo.
// Cada bando tem 5 serpentes, mas libera inicialmente 4 (2 de cada lado).
// A quinta permanece na área e entra quando uma das quatro é derrotada.
// No máximo 6 caçadoras cercam o herói (3 por lado); demais ficam à espreita.
function updateMobs(dt){
 const f=Math.min(dt*((S.lootBuffs.clock||0)>0?.48:1),.055);
 const alive=S.mobs.filter(m=>m.hp>0);
 for(const m of alive){
  m.age+=f;m.phase+=f*(m.engaged?5.2:2.4);
  m.hit=Math.max(0,m.hit-dt);
  m.contact=Math.max(0,m.contact-dt);
  m.cool-=f;
  m.y=serpentSoleY()-m.size*.5;
 }
 const maxChasers=S.area===4?3:6;
 // Chefona: preserva o número e a lógica próprios das guardiãs.
 if(S.area===4){
  for(const m of alive){if(m.engaged&&!m.flank)m.flank=m.x<p.x?-1:1;}
 }else{
  for(let pack=0;pack<8;pack++){
   const members=alive.filter(m=>m.batch===pack);
   const waiting=members.filter(m=>!m.engaged);
   if(!waiting.length)continue;
   const center=W*(.49+pack*.47);
   const alertAt=center-W*(pack===0?.36:.06);
   // Ativar ao entrar no setor por qualquer lado; depois manter o cerco.
   if(p.x<alertAt&&Math.abs(p.x-center)>W*.70&&!S.packAlerts.has(pack))continue;
   if(!S.packAlerts.has(pack)){S.packAlerts.add(pack);S.packHunts++;}
   // Quatro por bando + uma reserva: substituição efetiva ao abater uma.
   let inPack=members.filter(m=>m.engaged).length;
   while(inPack<4&&alive.filter(m=>m.engaged).length<maxChasers){
    const hunting=alive.filter(m=>m.engaged);
    const countLeft=hunting.filter(m=>m.flank===-1).length;
    const countRight=hunting.filter(m=>m.flank===1).length;
    const choices=waiting.filter(m=>!m.engaged).filter(m=>{
     const side=m.x<p.x?-1:1;
     return side===-1?countLeft<3:countRight<3;
    });
    if(!choices.length)break;
    // Prioridade ao lado menos ocupado e ao inimigo mais próximo.
    choices.sort((a,b)=>{
     const sa=a.x<p.x?-1:1,sb=b.x<p.x?-1:1;
     const ca=sa===-1?countLeft:countRight,cb=sb===-1?countLeft:countRight;
     return ca-cb||Math.abs(a.x-p.x)-Math.abs(b.x-p.x);
    });
    const m=choices[0];
    m.engaged=true;m.flank=m.x<p.x?-1:1;m.facing=-m.flank;
    m.alertAt=S.clock;m.vx=0;m.chaseTravel=0;
    m.cool=Math.max(.3,Math.min(m.cool,1.1)+(m.id%3)*.19);
    inPack++;
   }
  }
 }
 const hunting=alive.filter(m=>m.engaged);
 // Se o jogador ultrapassou uma serpente, ela muda fisicamente para a ala de trás;
 // não é teleportada para o lado oposto nem reiniciada no spawn.
 for(const m of hunting){
  if(m.x<p.x-m.size*.22)m.flank=-1;
  else if(m.x>p.x+m.size*.22)m.flank=1;
  m.facing=-m.flank;
 }
 // Alvos do cerco: duas ou três posições separadas à esquerda e à direita.
 // A serpente mais próxima pode morder; as outras aguardam atrás, cuspindo ácido.
 for(const flank of [-1,1]){
  const group=hunting.filter(m=>m.flank===flank)
   .sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));
  let prev=null,dist=0;
  for(const m of group){
   if(!prev)dist=Math.max(99,m.size*.57+heroHeight()*.22+8);
   else dist+=(prev.size+m.size)*.54+27;
   const goal=clamp(p.x+flank*dist,W*.075,S.world-W*.07);
   const error=goal-m.x;
   const desiredV=Math.abs(error)<5?0:Math.sign(error)*Math.min(m.speed,Math.abs(error)*1.32);
   const accel=205+(m.sizeTier===0?50:0);
   m.vx+=clamp(desiredV-m.vx,-accel*f,accel*f);
   if(Math.abs(error)<3&&Math.abs(m.vx)<8)m.vx=0;
   const delta=m.vx*f;
   // Freio ao chegar no lugar de cerco — não ultrapassar por inércia.
   m.x=clamp(Math.abs(delta)>Math.abs(error)?goal:m.x+delta,W*.075,S.world-W*.07);
   m.chaseTravel+=Math.abs(delta);
   prev=m;
  }
 }
 // Em espera, cada serpente fica no próprio ponto: sem convergir para o herói.
 for(const m of alive){
  if(m.engaged)continue;
  m.vx=0;m.x=m.stationX+Math.sin(m.phase*.48+m.id)*1.6;
  m.facing=m.x<p.x?1:-1;
 }
 // Ataques independentes: mordida apenas pela cabeça e veneno na boca.
 // As reservas NÃO mordem até ocuparem uma vaga no cerco.
 const heroY=p.y-45;
 let acidsInFlight=bad.filter(q=>q.cmSerpentAcid&&q.life>0).length;
 for(const m of hunting){
  const visible=m.x-S.camera>-m.size&&m.x-S.camera<W+m.size;
  if(!visible)continue;
  const front=m.facing||-1;
  const mouthX=m.x+front*m.size*.30;
  const mouthY=serpentSoleY()-m.size*.70;
  const biteR=Math.max(19,m.size*.25),heroR=Math.max(20,heroHeight()*.22);
  if(Math.hypot(mouthX-p.x,mouthY-heroY)<biteR+heroR&&m.contact<=0){
   hurtHero(4+Math.floor(S.area/2),p.x,heroY);
   m.contact=1.35;m.bites++;
   burst(mouthX,mouthY,'#d9ff69',8);
  }
  if(m.cool<=0){
   const dx=p.x-mouthX,dy=heroY-mouthY,dist=Math.hypot(dx,dy);
   if(dist<W*.95&&dist>42&&acidsInFlight<12){
    const speed=610+S.area*23;
    const ux=dx/(dist||1),uy=dy/(dist||1);
    // O disparo nasce na boca; antigo afastamento (22 + tamanho*.12)
    // fazia o efeito aparecer solto no ar.
    const launch=6;
    bad.push({x:mouthX+ux*launch,y:mouthY+uy*launch,
     vx:ux*speed,vy:uy*speed,
     life:Math.max(.75,dist/speed+.55),r:10,kind:'hydra',
     visualWidth:Math.max(28,Math.min(44,m.size*.28)),
     col:['#80ff3d','#fc536b','#ff8c31','#ffcb34'][m.id%4],
     emoji:'☣️',ownerId:m.id,acidColor:m.id%4,ageOffset:(m.id%4)*.21,
     special:false,cmSerpentAcid:true});
    m.attacks++;acidsInFlight++;
    m.cool=2.7+(m.id%4)*.26+(m.batch%3)*.12;
   }else m.cool=.30+(m.id%3)*.13;
  }
 }
}

function collision(dt){
 for(const q of shots){const ox=q.x,oy=q.y;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;if(q.life<=0)continue;
  for(const m of S.mobs){if(m.hp<=0)continue;
   if((()=>{const cx=m.x,cy=m.y,vx=q.x-ox,vy=q.y-oy,t=clamp(((cx-ox)*vx+(cy-oy)*vy)/(vx*vx+vy*vy||1),0,1);return Math.hypot(ox+vx*t-cx,oy+vy*t-cy)<m.size*.30+q.r*.55})()){q.life=0;m.hp=Math.max(0,m.hp-q.dmg*((S.lootBuffs.sword||0)>0?1.35:1));m.hit=.14;burst(m.x,m.y,q.col,9);
    if(m.hp===0){burst(m.x,m.y,'#d2f5ff',25);S.total--;setHud()}break;
   }
  }
 }
 shots=shots.filter(q=>q.life>0&&q.x<S.world+90&&q.x>-90);
 for(const q of bad){q.x+=q.vx*dt*((S.lootBuffs.clock||0)>0?.48:1);q.y+=q.vy*dt*((S.lootBuffs.clock||0)>0?.48:1);q.life-=dt;if(q.life>0&&Math.hypot(q.x-p.x,q.y-p.y+45)<42){hurtHero(2+Math.floor(S.area/2),p.x,p.y);q.life=0}}
 bad=bad.filter(q=>q.life>0);
 for(const q of parts){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=60*dt;q.life-=dt}
 parts=parts.filter(q=>q.life>0);
}
function applyVerticalPhysics(dt){
 if(window.ClassManaNucleo.flight.apply({dt,heroIdx,p,keys,joy,groundY:ground(),ceilingY:heroCeiling(),state:S,velocityKey:'vy'})){
  S.jumpWasDown=!!(keys.ArrowUp||keys.w||joy.y<-.55);return;
 }
 const up=!!(keys.ArrowUp||keys.w||joy.y<-.55);
 const down=!!(keys.ArrowDown||keys.s||joy.y>.55);
 if(up&&!S.jumpWasDown&&(p.y>=ground()-2 || heroIdx===0 || heroIdx===5))S.vy=(heroIdx===0||heroIdx===5)?-425:-480;
 S.jumpWasDown=up;
 S.vy+=gravity()*dt*(down?2.0:1);
 S.vy=clamp(S.vy,-550,700);
 p.y=clamp(p.y+S.vy*dt,heroCeiling(),ground());
 window.cm25HeroFeetOffset=0;
 if(p.y>=ground()&&S.vy>0)S.vy=0;
 if(p.y<=heroCeiling()&&S.vy<0)S.vy=0;
}

// Derrota nos territorios 1-4: o progresso anterior permanece conquistado.
const defeatOverlay=document.createElement('div');
defeatOverlay.id='cm25defeat';
defeatOverlay.style.cssText='position:fixed;inset:0;z-index:1000001;display:none;align-items:center;justify-content:center;background:rgba(5,9,28,.88);padding:20px;color:#fff;font-family:Trebuchet MS,Arial,sans-serif;text-align:center';
defeatOverlay.innerHTML='<div style="width:min(520px,94vw);border:3px solid #ffca70;border-radius:22px;padding:30px 22px;background:linear-gradient(150deg,#2a183b,#102d51);box-shadow:0 20px 60px #000c"><div style="font-size:52px">💔</div><h2 style="font-size:clamp(24px,4vw,35px);margin:10px 0;color:#ffd795">VOCÊ FOI DERROTADO!</h2><p id="cm25defeat-area" style="font-size:19px;margin:12px 0"></p><p style="opacity:.9;line-height:1.5">Você mantém os territórios já conquistados.<br>Deseja tentar novamente este território?</p><button id="cm25defeat-retry" type="button" style="margin-top:13px;border:2px solid #fff0af;border-radius:13px;background:linear-gradient(#ffdc6e,#d98b2b);color:#302011;font:bold 16px Trebuchet MS,Arial;padding:15px 24px;cursor:pointer">TENTAR NOVAMENTE ESTE TERRITÓRIO</button></div>';
(document.body||document.documentElement).appendChild(defeatOverlay);
function showTerritoryDefeat(){
 if(defeatOverlay.style.display==='flex')return;
 playing=false;paused=true;shots=[];bad=[];
 defeatOverlay.querySelector('#cm25defeat-area').textContent='Território '+(S.area+1)+' — '+S.names[S.area];
 defeatOverlay.style.display='flex';
}
defeatOverlay.querySelector('#cm25defeat-retry').addEventListener('click',()=>{
 defeatOverlay.style.display='none';
 p.hp=100;p.mana=100;
 startTerritory();
 paused=false;playing=true;
 say25('💖 Nova tentativa no território '+(S.area+1)+'!',3);
});


// Defesa da mãe: um exemplar de cada um dos 16 sprites, em levas de até 3.
// Todos têm hitbox, HP, podem ser derrotados e surgem visivelmente no piso.
function updateMotherGuardians(dt){
 if(bossDefeated||defeatPending){S.mobs=[];S.defenderQueue=[];return}
 S.guardianSpawnCooldown=Math.max(0,(S.guardianSpawnCooldown||0)-dt);
 const alive=S.mobs.filter(m=>m.hp>0);
 S.mobs=alive;
 if(S.guardianSpawnCooldown<=0&&alive.length<3&&S.defenderQueue.length){
  const id=S.defenderQueue.shift(),m=createMob(id,16-S.defenderQueue.length,16);
  m.x=clamp(W*(.66+alive.length*.12),W*.47,W*.88);
  m.stationX=m.x;m.engaged=true;m.activationX=0;
  m.size=Math.min(m.size*.82,H*.24);
  m.baseY=serpentSoleY()-m.size*.5;m.y=m.baseY;
  m.cool=1.5+alive.length*.6;m.behavior='slither';
  S.mobs.push(m);S.guardianSpawnCooldown=2.3;
 }
 updateMobs(dt);
 // A atualização padrão do chefe movimenta as balas do herói antes daqui.
 // Resolver colisões dos defensores sem movimentar os tiros duas vezes.
 for(const q of shots){if(q.life<=0)continue;
  for(const m of S.mobs){if(m.hp<=0)continue;
   const cx=m.x,cy=m.y;
   const d=Math.hypot(q.x-cx,q.y-cy);
   const ox=q.x-q.vx*dt,oy=q.y-q.vy*dt,vx=q.x-ox,vy=q.y-oy;
   const t=clamp(((cx-ox)*vx+(cy-oy)*vy)/(vx*vx+vy*vy||1),0,1);
   if(Math.min(d,Math.hypot(ox+vx*t-cx,oy+vy*t-cy))<m.size*.32+(q.r||8)*.5){
    q.life=0;m.hp=Math.max(0,m.hp-q.dmg);m.hit=.18;
    burst(cx,cy,q.col||'#bb8cff',11);
    if(m.hp===0){S.total=Math.max(0,S.total-1);burst(cx,cy,'#d2f5ff',25)}
    break;
   }
  }
 }
}
function drawMotherSilk(){
 // Âncora fixa no teto + fio curvado pela posição pendular da Mega-Aranha.
 // O fio termina no dorso, sem criar patas extras nem alterar seu sprite.
 const fromX=S.bossAnchorX||W*.67,fromY=-8;
 const endX=boss.x,endY=boss.y-bossHeight()*.32;
 ctx.save();ctx.lineCap='round';ctx.lineWidth=3.1;
 ctx.shadowColor='#b87cff';ctx.shadowBlur=13;
 ctx.strokeStyle='rgba(241,227,255,.97)';ctx.beginPath();ctx.moveTo(fromX,fromY);
 ctx.quadraticCurveTo(fromX+(endX-fromX)*.16,endY*.58,endX,endY);ctx.stroke();
 ctx.shadowBlur=0;ctx.lineWidth=1.0;ctx.strokeStyle='#a260d7';
 ctx.beginPath();ctx.moveTo(fromX-3,fromY);ctx.quadraticCurveTo(fromX+(endX-fromX)*.14-3,endY*.58,endX-3,endY);ctx.stroke();ctx.restore();
}
function drawMotherGuardians(){
 for(const m of S.mobs){if(m.hp>0)drawMob(m)}
 ctx.save();ctx.textAlign='center';ctx.font='bold 12px Trebuchet MS,Arial';
 ctx.fillStyle='#fff4cd';ctx.strokeStyle='#1e1437';ctx.lineWidth=3;
 const txt='🐍 SERPENTES GUARDIÃS: '+S.total+'/15';
 ctx.strokeText(txt,W*.50,H*.17);ctx.fillText(txt,W*.50,H*.17);ctx.restore();
}

function moveHorde(dt){
 if(!playing||paused||S.transition)return;
 S.clock+=dt;elapsedMs+=dt*1000;$('#timerHud').textContent='⏳ '+fmtTime(elapsedMs);
 const dx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0)+joy.x;
 updateFacing(dx);
 const beforeX=p.x;
 p.x=clamp(p.x+dx*265*dt,W*.09,S.world-W*.08);
 // Indicador de direção apenas quando o herói fica sem avançar.
 if(Math.abs(p.x-beforeX)>0.45){S.idleSeconds=0;S.arrowPulse=0}
 else {S.idleSeconds+=dt;S.arrowPulse+=dt}
 applyVerticalPhysics(dt);
 p.inv=Math.max(0,p.inv-dt);p.shield=Math.max(0,p.shield-dt);p.shieldCd=Math.max(0,p.shieldCd-dt);
 superCooldown=Math.max(0,superCooldown-dt);
 if(manaAutoCountdown!==null){manaAutoCountdown-=dt;if(manaAutoCountdown<=0){manaAutoCountdown=null;askQuestion();return}}
 updateMobs(dt);cm25ApplyHeroContact(dt,false);collision(dt);stepMobEffects(dt);lootStep(dt);
 if(cm25UltimateButton&&S.localUltimateUses<1)cm25UltimateButton.disabled=false;
 const wanted=clamp(p.x-W*.36,0,S.world-W);S.lastCamera=S.camera;S.camera+=(wanted-S.camera)*Math.min(1,dt*12);
 if(p.hp<=0){showTerritoryDefeat();return}
 if(S.total===0){if(!S.advanceReady){S.advanceReady=true;say25('✨ Horda derrotada! Avance até o fim do caminho →',4)}
 if(p.x>S.world-W*.16&&!S.transition){
  const next=S.area+1;changedArea('TERRITÓRIO '+(S.area+1)+' CONCLUÍDO',
   next===4?'⚠ O GUARDIÃO ESTÁ DESPERTANDO…':'Seguindo para '+S.names[next]+'…',
   ()=>{S.area=next;startTerritory();if(next===4)playBossSignal()},false,next===4?2600:1850);
 }}
}
update=function(dt){
 if(stage===0&&S.active&&S.area<4)return moveHorde(dt);
 if(stage===0&&S.active&&S.area===4){
  if(S.bossIntroTime>0){
   if(playing&&!paused){S.bossIntroTime=Math.max(0,S.bossIntroTime-dt);elapsedMs+=dt*1000;
    if(S.bossIntroTime===0){say25('⚔ A BATALHA COMEÇOU! ENFRENTE A HIDRA!',3);S.bossPhase=1;boss.cool=3.2}
   }
   return;
  }
  updateFacing((keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0)+joy.x);
  // Mantém o ataque original e os danos do motor, mas fixa o chefe no piso.
  const old=[keys.ArrowUp,keys.w,keys.ArrowDown,keys.s,joy.y];
  keys.ArrowUp=keys.w=keys.ArrowDown=keys.s=false;joy.y=0;
  try{orig.update(dt)}finally{[keys.ArrowUp,keys.w,keys.ArrowDown,keys.s,joy.y]=old}
  if(playing&&!paused){
   applyVerticalPhysics(dt);lootStep(dt);
   if(cm25UltimateButton&&S.localUltimateUses<3)cm25UltimateButton.disabled=false;
   S.bossMovement+=dt;
   const speed=36+S.bossPhase*14;
   // Não reaproveitar o pêndulo da aranha: hidra fica no solo da arena.
   boss.x=clamp(boss.x+Math.sign(p.x-boss.x)*speed*dt,W*.48,W*.88);
   boss.y=platformY()-bossHeight()/2;
   const next=boss.hp<=boss.max*.35?3:boss.hp<=boss.max*.70?2:1;
   if(next>S.bossPhase){S.bossPhase=next;S.bossPhaseNotice=2.4;
    say25(next===2?'🐲 A HIDRA ESTÁ ENFURECIDA!':'☣️ A HIDRA ENTRA EM DESESPERO!',2.6);shake=9}
   S.bossPhaseNotice=Math.max(0,(S.bossPhaseNotice||0)-dt);
   // Projeteis originais da Hidra passam a usar as artes de acido aprovadas.
   for(const q of bad){if(q.kind==='hydra'&&!q.isBossAcid){q.acidColor=q.acidColor??((q.special?1:0)+(Math.round(q.x*17)%3))%4;q.col=['#80ff3d','#fc536b','#ff8c31','#ffcb34'][q.acidColor];}}
   updateMotherGuardians(dt);cm25ApplyHeroContact(dt,true);
   // Mordida física das cabeças na zona frontal, com invulnerabilidade temporal.
   S.bossBiteCool=Math.max(0,(S.bossBiteCool||0)-dt);
   const mouthX=boss.x-bossHeight()*.29, mouthY=boss.y-bossHeight()*.06;
   if(S.bossBiteCool<=0&&Math.hypot(mouthX-p.x,mouthY-(p.y-45))<bossHeight()*.20+heroHeight()*.21){
    hurtHero(10+S.bossPhase*2,p.x,p.y-45);S.bossBiteCool=1.25;
    burst(mouthX,mouthY,'#a7ff40',16);
   }
   // Jato adicional: o poder de ácido vem da Hidra, sem remover ataques originais.
   updateHydraAcidJet(dt);
   // As tres cabecas disparam rajadas de veneno nas fases mais dificeis.
   S.bossSuperClock-=dt;
   if(S.bossSuperClock<=0&&!bossDefeated&&bad.length<9){
    const count=S.bossPhase===1?3:S.bossPhase===2?4:5;
    for(let j=0;j<count&&bad.length<12;j++){
     const sx=boss.x-bossHeight()*.23,sy=boss.y-bossHeight()*(.25-j*.11);
     const angle=Math.atan2((p.y-45)-sy,p.x-sx)+(j-(count-1)/2)*.10;
     const sp=225+S.bossPhase*13;
     bad.push({x:sx,y:sy,vx:Math.cos(angle)*sp,vy:Math.sin(angle)*sp,
      life:4.8,r:15,kind:'hydra',col:['#7dfb43','#ff516c','#ff9e28'][j%3],
      ownerId:j%6,acidColor:j%4,isBossAcid:true,special:true,ageOffset:j*.1});
    }
    say25('⚠ SUPER DA HIDRA • CHUVA DE ÁCIDO!',2.3);
    S.bossSuperClock=S.bossPhase===3?11.5:14;
   }
  }

  return;
 }
 orig.update(dt);
};
// JATO DE ÁCIDO DA CHEFONA: ataque extra, telegráfico, de uma cabeça por vez.
// Não substitui o ataque básico, os supers, a mordida nem as 15 guardiãs.
function updateHydraAcidJet(dt){
 if(!playing||paused||bossDefeated||defeatPending)return;
 S.bossJetClock-=dt;
 if(S.bossJetLeft<=0&&S.bossJetClock<=0){
  S.bossJetLeft=S.bossPhase===3?7:S.bossPhase===2?6:5;
  S.bossJetGap=.42; // reação visível antes da primeira cuspida
  S.bossJetClock=S.bossPhase===3?9:S.bossPhase===2?10.5:12;
  say25('☣️ HIDRA — JATO DE ÁCIDO! ESQUIVE-SE!',1.8);
  shake=Math.max(shake,4);
 }
 if(S.bossJetLeft>0){
  S.bossJetGap-=dt;
  if(S.bossJetGap<=0){
   const j=S.bossJetCount++,head=j%3;
   const h=bossHeight();
   const sx=boss.x-h*.28,sy=boss.y-h*(.30-head*.11);
   const a=Math.atan2(p.y-45-sy,p.x-sx)+(head-1)*.035;
   const speed=670+S.bossPhase*28;
   if(bad.filter(q=>q.life>0&&q.cmBossJet).length<7){
    bad.push({x:sx-17,y:sy,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
     life:3,r:12,kind:'hydra',col:['#90f944','#ffc331','#ff8841'][head],
     acidColor:head===0?0:head===1?3:2,ownerId:head,
     isBossAcid:true,cmBossJet:true,special:false,ageOffset:j*.11});
    burst(sx,sy,'#9afa57',5);
   }
   S.bossJetLeft--;
   S.bossJetGap=.16;
  }
 }
}
function drawBG(){
 const im=S.bg[S.area];
 if(!im||!im.complete||!im.naturalWidth){const fb=S.bg[Math.min(S.area,3)]||S.bg[3]||S.bg[0];if(fb&&fb.complete&&fb.naturalWidth){ctx.drawImage(fb,0,0,W,H);return}orig.bg(stages[0],bgs['bg_mega.png']||Object.values(bgs||{})[0]);return}
 const ih=im.naturalHeight,iw=im.naturalWidth;
 const targetHeight=H*(S.area===4?1.20:1.28),period=iw*(targetHeight/ih),scroll=S.camera;
 const imageTop=H*.82-targetHeight*[.697,.646,.657,.688,.842][S.area]; // Fundo se move 1:1 com câmera, com repetição contínua da textura.
 let left=-(scroll%period);
 while(left<W){ctx.drawImage(im,left,imageTop,period,targetHeight);left+=period}
 ctx.fillStyle='rgba(5,15,38,.07)';ctx.fillRect(0,0,W,H);
 // Neblina simples em camadas, deslocando-se bem mais lentamente do que o piso.
 ctx.save();ctx.globalAlpha=.12;
 const fog=ctx.createLinearGradient(0,H*.50,0,H*.93);fog.addColorStop(0,'rgba(130,185,255,0)');fog.addColorStop(.7,'#9dd5fc');fog.addColorStop(1,'rgba(70,108,169,0)');ctx.fillStyle=fog;ctx.fillRect(0,H*.50,W,H*.43);ctx.restore();
}
drawBackgroundCached=function(s,bg){if(stage===0&&S.active){drawBG();return}orig.bg(s,bg)};
// Retângulos visíveis medidos nos PNGs aprovados; não recorta nenhum pixel do personagem.
const mobBounds=[]; // Margens RGBA removidas; correção ótica de sola aplicada via serpentSoleY().
function drawMob(m){
 const frames=S.imgs[m.id]||[];
 const im=frames[Math.floor(m.age*7)%Math.max(1,frames.length)];
 const z=m.size;
 ctx.save();ctx.translate(m.x+Math.sin(m.phase*1.1+m.id)*1.6,serpentSoleY()-Math.abs(Math.sin(m.phase*1.3))*1.0);ctx.rotate(Math.sin(m.phase)*.020);if(m.facing>0)ctx.scale(-1,1);
 if(m.hit>0){ctx.shadowColor='#fff';ctx.shadowBlur=16}
 if(im&&im.complete&&im.naturalWidth){
  const dw=z*im.naturalWidth/im.naturalHeight;
  ctx.drawImage(im,-dw/2,-z,dw,z);
 }else{ctx.font=Math.round(z*.65)+'px Arial';ctx.fillText('🐍',-z*.3,-z*.5)}
 ctx.restore();
 ctx.fillStyle='rgba(4,28,18,.83)';ctx.fillRect(m.x-z*.30,m.y-z*.59,z*.60,5);
 ctx.fillStyle='#adff52';ctx.fillRect(m.x-z*.30,m.y-z*.59,z*.60*(m.hp/m.max),5);
}

function drawHorde(){ctx.save();if(shake){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.84}
 drawBG();
 // Mundo usa coordenadas próprias. Apenas o desenho é deslocado pela câmera.
 ctx.save();ctx.translate(-S.camera,0);
 const bossImg=monsters['monster_hydra.png'];if(bossImg&&bossImg.complete&&bossImg.naturalWidth){
  // Aparição surpresa ocasional do chefão — não participa da luta.
  if(false&&S.area===2&&p.x>S.world*.46&&p.x<S.world*.62){ctx.save();ctx.globalAlpha=.17;ctx.drawImage(bossImg,S.world*.80,H*.18,Math.min(W*.20,180),H*.27);ctx.restore()}
 }
 for(const m of S.mobs){if(m.hp>0)drawMob(m)}
 orig.hero();lootDraw(false);shots.forEach(drawProjectile);
 for(const q of bad){if(q.life>0)drawHostileMissile(q)}
 for(const q of parts){ctx.globalAlpha=clamp(q.life,0,1);ctx.fillStyle=q.col;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
 ctx.restore();
 // Após 5 s parado, a seta luminosa indica o caminho a seguir.
 // Não interfere com ataques nem exige imagens adicionais.
 if(S.idleSeconds>=5 && p.x<S.world-W*.12){
  const sx=clamp(p.x-S.camera+110,W*.18,W*.83);
  const sy=platformY()-Math.max(90,H*.19);
  const pulse=.70+.30*Math.sin(S.arrowPulse*5);
  ctx.save();ctx.translate(sx,sy);
  ctx.globalAlpha=.55+.45*pulse;
  ctx.shadowColor='#80e9ff';ctx.shadowBlur=18+15*pulse;
  ctx.lineWidth=7;ctx.strokeStyle='#fff2b1';ctx.fillStyle='#5edfff';
  ctx.beginPath();ctx.moveTo(-24,-13);ctx.lineTo(6,-13);ctx.lineTo(6,-24);
  ctx.lineTo(38,0);ctx.lineTo(6,24);ctx.lineTo(6,13);ctx.lineTo(-24,13);
  ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 }
 // Guias de progresso leves, independentes da câmera.
 ctx.save();const x=W*.37,y=H*.10,w=W*.25;ctx.fillStyle='#102449bb';ctx.fillRect(x,y,w,7);
 ctx.fillStyle='#92d8f9';ctx.fillRect(x,y,w*clamp(p.x/S.world,0,1),7);
 ctx.strokeStyle='#ffe49a';ctx.lineWidth=1;ctx.strokeRect(x,y,w,7);
 ctx.textAlign='center';ctx.font='bold '+Math.round(Math.min(16,W*.015))+'px sans-serif';ctx.fillStyle='#f7f0dd';
 ctx.fillText('TERRITÓRIO '+(S.area+1)+'/5  •  '+(S.total?'INIMIGOS RESTANTES: '+S.total:'CAMINHO LIBERADO →'),W*.5,y-12);
 ctx.restore();lootHud();ctx.restore();
}
function drawBossEntrance(){
 if(!(S.bossIntroTime>0))return;
 const t=S.bossIntroTime;
 ctx.save();ctx.fillStyle='rgba(5,17,43,.70)';ctx.fillRect(0,0,W,H);
 const pulse=(1+Math.sin((5-t)*7)*.045);
 ctx.translate(W*.5,H*.44);ctx.scale(pulse,pulse);ctx.textAlign='center';
 ctx.shadowColor='#8bdeff';ctx.shadowBlur=25;ctx.lineWidth=5;ctx.strokeStyle='#124779';
 ctx.fillStyle='#dafaff';ctx.font='900 '+Math.round(Math.min(58,W*.065))+'px Georgia,serif';
 ctx.strokeText('🐲 PREPARE-SE! 🐲',0,-48);ctx.fillText('🐲 PREPARE-SE! 🐲',0,-48);
 ctx.font='900 '+Math.round(Math.min(46,W*.047))+'px Georgia,serif';
 ctx.strokeText('A HIDRA ESTÁ DESPERTANDO!',0,18);ctx.fillText('A HIDRA ESTÁ DESPERTANDO!',0,18);
 ctx.shadowBlur=0;ctx.fillStyle='#ffe5a3';ctx.font='bold '+Math.round(Math.min(22,W*.03))+'px Arial';
 ctx.fillText('A GUARDIÃ DO ABISMO DESPERTOU…',0,72);
 ctx.restore();
 // Pequeno tremor só no início e final da vinheta, sem alterar a física do herói.
 if(t>4.6||t<.65)shake=Math.max(shake,3);
}
function playBossSignal(){
 try{if(soundOn){tone(196,.45,'triangle',.09);setTimeout(()=>tone(247,.45,'triangle',.09),460);setTimeout(()=>tone(330,.68,'sawtooth',.07),900)}}catch(e){}
}
draw=function(){if(stage!==0||!S.active)return orig.draw();
 if(S.area===4){
  ctx.save();drawBG();
  // Desenho do boss: frames animados V2.4 da Hidra, sem renderizar o cenário antigo.
  drawEnemy();drawMotherGuardians();orig.hero();lootDraw(false);
  shots.forEach(drawProjectile);
  for(const q of bad){if(q.life>0)drawHostileMissile(q)}
  for(const q of parts){if(q.life<=0)continue;ctx.globalAlpha=clamp(q.life,0,1);ctx.fillStyle=q.col;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  lootHud();drawBossEntrance();ctx.restore();return;
 }
 drawHorde();
};

finishBossDefeat=function(){if(stage!==0||!S.active)return orig.defeat();
 defeatPending=false;playing=false;paused=true;S.active=false;
 changedArea('HIDRA DERROTADA!', 'Fim do teste do Reino 8 · V2.5',()=>{
  $('#menu').classList.remove('hidden');$('#menu').style.display='grid';$('#start').textContent='↻ TESTAR NOVAMENTE';
  stage=0;expectedStage=0;S.area=0;playing=false;paused=true;
 });
};
saveBestScore=async function(){return false};
window.addEventListener('keydown',e=>{
 // No pacote integrado, F6/F7 pertencem somente ao controlador central.
 if(window.ClassManaV25TestMode&&window.parent!==window)return;
 if(!S.active||stage!==0||!playing||paused)return;
 if(e.code==='F6'&&S.area<4){e.preventDefault();S.area++;startTerritory();if(S.area===4)playBossSignal();say25('🧪 TESTE: TERRITÓRIO '+(S.area+1),2)}
 if(e.code==='F7'){e.preventDefault();S.area=4;startTerritory();playBossSignal();say25('🧪 TESTE: CHEFONA HIDRA',3)}
},true);
window.ClassManaV25Test={getStatus:()=>({territorio:S.area+1,inimigos:S.total,ativo:S.active,hero:heroes[heroIdx]?.name,camera:S.camera,world:S.world,ground:platformY(),groundRatio:platformRatios[S.area],bossBottom:boss.y+bossHeight()/2,heroVisualPad:heroVisualFootPad(),bossVisualPad:bossVisualFootPad(),packHunts:S.packHunts,alertedPacks:[...S.packAlerts],chasing:S.mobs.filter(m=>m.hp>0&&m.engaged).length,
  balance:{hpFactor:CM25_BALANCE.hp,damageFactor:CM25_BALANCE.damage,bossReferenceHP:CM25_BALANCE.bossHPReference,bossConfiguredHP:Math.round(CM25_BALANCE.bossHPReference*CM25_BALANCE.hp),enemyAttack:stages[0].atk},approaching:S.mobs.filter(m=>m.hp>0&&!m.engaged&&m.x>p.x-W*.12&&m.x<p.x+W*1.7).length,
  projectiles:bad.map(q=>({emoji:q.emoji,ownerId:q.ownerId,x:q.x,y:q.y,vx:q.vx,vy:q.vy,speed:Math.hypot(q.vx,q.vy)})),heroBottom:p.y-45+heroHeight()/2-heroHeight()*heroFootTrim()+(window.cm25HeroFeetOffset||0),bossIntro:S.bossIntroTime||0,bossHP:boss.hp,bossMax:boss.max,ultimateUses:S.localUltimateUses||0,bossSuperClock:S.bossSuperClock,bossFace:S.bossFace,defensoresRestantes:S.total,defensoresPendentes:S.defenderQueue?.length||0,bossJetRemaining:S.bossJetLeft||0,bossJetClock:S.bossJetClock||0,loot:S.loot?{...S.loot}:null,lootBuffs:{...S.lootBuffs},chest:S.lootPhaseChest,mobs:S.mobs.map(m=>({id:m.id,x:m.x,screenX:m.x-S.camera,feet:serpentSoleY(),size:m.size,sizeTier:m.sizeTier,behavior:m.behavior,pursuing:!!m.engaged,flank:m.flank||0,velocity:m.vx||0,pack:m.batch,alertAt:m.alertAt,chaseTravel:m.chaseTravel||0,attacks:m.attacks||0,bites:m.bites||0}))})};

// == Ponte de integração com o núcleo compartilhado, Reino 8 ==
// Avanço automático de reino após o chefão (quando o módulo realmente concluiu a luta).
const cm25FinishLocal=finishBossDefeat;
let cm25CompletionSent=false;
finishBossDefeat=function(...args){
 const lastArea=4;
 const wasBoss=stage===0&&S.area===lastArea&&!!defeatPending;
 const out=cm25FinishLocal(...args);
 const completed=wasBoss&&(!S.active);
 if(completed&&!cm25CompletionSent){
   cm25CompletionSent=true;
   window.parent!==window&&window.parent.postMessage({namespace:'CM25',action:'COMPLETE',token:new URLSearchParams(location.search).get('cm25'),realm:8},location.origin);
 }
 return out;
};

window.CM25RealmBridge={
  realm:8,maxTerritories:5,
  status:()=>({realm:8,territory:S.area+1,active:!!S.active,playing:!!playing,monstersLoaded:(S.mobs||[]).length,monstersRemaining:S.total??(S.mobs||[]).length,hero:heroIdx,name:playerName,className:playerClass,score:score}),
  selectArea:(target,profile)=>{
    const i=Math.max(0,Math.min(4,Number(target)||0));
    if(profile){if(Number.isInteger(profile.hero))heroIdx=profile.hero; if(profile.name)playerName=profile.name;if(profile.className)playerClass=profile.className;}
    // Atalhos técnicos: nenhuma pontuação é enviada ao ranking V2.4.
    stage=0;expectedStage=0;
    if(!S.active){orig.reset();}
    // Abertura e vídeo não podem continuar tocando com combate ativo.
    window.ClassManaNucleo?.sairDaAbertura();
    stage=0;gameEnded=false;defeatPending=false;playing=true;paused=false;
    document.body.classList.add('cm25-test-direct');
    if(!document.getElementById('cm25-direct-style')){const st=document.createElement('style');st.id='cm25-direct-style';st.textContent='body.cm25-test-direct #classmanaSplash,body.cm25-test-direct #openingVideo{display:none!important;visibility:hidden!important;pointer-events:none!important;}';document.head.appendChild(st)}
    S.area=i;S.active=true;
    startTerritory();
    try{window.ClassManaNucleo?.audio?.play();}catch(e){console.warn("Áudio do reino",e)}
    if(S.area<4 && (!Array.isArray(S.mobs)||S.mobs.length===0))throw Error('Falha ao criar a horda do território '+(S.area+1));
    for(const id of ['menu','question','tutorial','gameOverOverlay','transition','bonusOverlay','rankingOverlay']){const el=document.getElementById(id);if(el)el.classList.add('hidden')}
    try{setHud()}catch(e){}
    try{window.restoreGameFocus?.()}catch(e){}
    return S.area+1;
  }
};

})();
