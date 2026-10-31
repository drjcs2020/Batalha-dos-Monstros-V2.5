/* ClassMana V2.5 — modo de teste direto do Reino 4: Mestre da Colmeia.
   EXTENSÃO da V2.4: preserva seu menu, vídeos, acesso, 6 heróis, recarga e chefão.
   Teste isolado: nenhum salvamento e nenhuma submissão ao ranking.
*/
(function(){
'use strict';
// Use the ORIGINAL V2.4 Mestre da Colmeia monster, boss frames and audio.
stages[0]={...stages[4]};
const S={area:0,active:false,transition:false,mobs:[],fx:[],camera:0,lastCamera:0,world:0,
 names:['BOSQUE DO MEL','COLMEIA SELVAGEM','CAVERNAS DE ÂMBAR','FORTALEZA DOURADA','MESTRE DA COLMEIA · ARENA FINAL'],
 // Dezoito encontros com nove sprites de abelhas em quatro territorios; chefona apenas na quinta area.
 waves:[
 [0,1,2,3,0,1,2,3,0,1,2,3,0,1,2,3,0,1,2,3],
 [4,5,6,7,4,5,6,7,4,5,6,7,4,5,6,7,4,5,6,7],
 [8,9,10,11,12,8,9,10,11,12,8,9,10,11,12,8,9,10,11,12],
 [13,14,15,16,17,13,14,15,16,17,13,14,15,16,17,13,14,15,16,17]
 ],
 files:['planta_01.png','planta_02.png','planta_03.png','planta_04.png','planta_05.png','planta_06.png','planta_07.png','planta_08.png','planta_09.png','planta_10.png','planta_11.png','planta_12.png','planta_13.png','planta_14.png','planta_15.png','planta_16.png','planta_17.png','planta_18.png'],
 bg:[],imgs:[],facing:1,total:0,clock:0,advanceReady:false,idleSeconds:0,arrowPulse:0,vy:0,jumpWasDown:false,shotDirection:1,shotHits:0,loot:null,lootClock:0,lootNext:14,lootCount:0,lootHeartUsed:false,lootChestUsed:false,lootPhaseChest:false,lootBuffs:{},lootNotice:"",lootNoticeTime:0,lootMapUntil:0,bossMovement:0,bossFace:1,bossHealthAtStart:0,previousBossHP:0,lootGuarantees:{},spriteFeet:0
};
// Revisao 13: volume de subordinados deste reino, distribuido pelo percurso.
// Nao altera hordas do chefe, dano, sprites ou posicoes verticais.
S.waves=S.waves.map(base=>Array.from({length:26},(_,i)=>base[i%base.length]));
const getAsset=f=>new URL('assets_v25/'+f,location.href).href;
// Conservar os seis frames da V2.4 e acrescentar apenas quatro novos arquivos.
// Mestre da Colmeia usa as artes e animações oficiais da V2.4.
window.cm25ExtraGolemFrames=false;
window.cm25GolemBossEnlarged=false;

for(let i=1;i<=5;i++){const im=new Image();im.src=getAsset('cenarios/cenario_'+i+'.jpg');S.bg.push(im)}
for(const f of S.files){const im=new Image();im.src=getAsset('inimigos/'+f);S.imgs.push(im)}
const orig={reset:resetStage,update,draw,fire,defeat:finishBossDefeat,hero:drawHero,bg:drawBackgroundCached};
window.cm25Facing=1;
window.addEventListener('keydown',e=>{if(e.code==='ArrowLeft'||e.code==='KeyA')window.cm25Facing=-1;if(e.code==='ArrowRight'||e.code==='KeyD')window.cm25Facing=1},true);
let css=document.createElement('style');css.textContent=`
 #openRanking,#bonusViewRanking{display:none!important}
 #cm25stage-transition{position:fixed;inset:0;z-index:999999;display:none;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 42%,rgba(48,48,111,.88),rgba(8,12,34,.96));color:#f3f4ff;font-family:Georgia,'Trebuchet MS',sans-serif;text-align:center;pointer-events:none}
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
const overlay=document.createElement('div');overlay.id='cm25stage-transition';overlay.innerHTML='<div class="frame"><div class="scene-art"></div><div class="eyebrow">✦ CLASSMANA · REINO DA COLMEIA ✦</div><div class="heading"></div><div class="defeated"></div><div class="desc"></div><div class="meter"><span></span></div></div>';
(document.body||document.documentElement).appendChild(overlay);
const say25=(s,t=2)=>say(s,t);
const clamp=(a,l,r)=>Math.max(l,Math.min(r,a));
// REINO 4 E POSTERIORES — REGRA DE PISO UNICO (sem alterar fases aprovadas).
// A referencia correta vem da ARTE, nao do codigo: a linha da passarela dos cenarios
// regenerados cai perto de 72,5% da imagem-fonte. Como a camera desenha a arte a 114,5%
// da altura do canvas e sem deslocamento vertical, o piso visivel projetado cruza ~83,0%
// do canvas final. Heroi, subordinados, sombras e itens usam exatamente essa ancora.
// Pequena folga de seguranca evita que os pes aparentem estar enterrados no piso.
// Alturas da borda frontal da passarela medidas nas cinco artes originais.
// Cada quadro e deslocado apenas na vertical, sem deformar ou redimensionar sprites.
// A linha de contato visual final fica igual no canvas dos cinco territorios.
const CLASSMANA_R4_SOURCE_FLOOR_RATIOS=[.695,.695,.705,.695,.695];
const CLASSMANA_R4_BG_SCALE=1.145;
const CLASSMANA_R4_FLOOR_RATIO=.800;
const FOOT_CLEARANCE_PX=()=>Math.max(3,Math.round(H*.0045));
const platformRatios=Array(5).fill(CLASSMANA_R4_FLOOR_RATIO);
const platformY=()=>H*CLASSMANA_R4_FLOOR_RATIO;
const floorAnchorY=()=>platformY()-FOOT_CLEARANCE_PX();
const heroHeight=()=>Math.min(178,H*.285);
const bossHeight=()=>Math.min(300,H*.48);
// O desenho dos heróis usa centro y-45; o limite é calculado pelos pés VISÍVEIS.
// Ajuste apenas da margem transparente inferior de cada sprite (em fração da altura).
const heroFootTrim=()=>0; // Pontos de pouso agora calculados no desenho a partir da base visivel do proprio PNG.
// A arena original da V2.4 tem margens transparentes diferentes dos novos cenários.
// Compensações restritas ao território final; Física continua ancorada pelo limite inferior.
const heroVisualFootPad=()=>0;
const bossVisualFootPad=()=>0;
// Ajuste LOCAL do apoio do herói nos cinco territórios R5: +9px T1-T4 e +11px T5
// (~2,4–2,9 mm CSS a 96dpi), sem mudar piso dos inimigos e a arte original.
// Revisão R5 T1-T5: eliminar compensações opostas na altura do herói.
// O ajuste anterior somava +9/+11 no pouso e SUBTRAÍA ~14–22px no desenho.
// Nova âncora única = posição visual anterior +11px em todos os cinco territórios;
// física, imagem, escudo e hitbox voltam a compartilhar o mesmo y.
const heroGroundContactPxR5=()=>{
 const oldNegativePad=Math.max(11,Math.round(H*.027));
 return Math.max(4,(S.area===4?31:20)-oldNegativePad); // nunca deixar âncora acima do piso em telas altas
};
const ground=()=>floorAnchorY()+45-heroHeight()/2+heroHeight()*heroFootTrim()+heroVisualFootPad()+heroGroundContactPxR5();
const isWingedHero=()=>heroIdx===0||heroIdx===5;
const gravity=()=>isWingedHero()?380:570; // salto amplo; fada flutua um pouco mais
const heroCeiling=()=>Math.max(125,H*.24); // limite superior da faixa de voo/salto
// Calibracao Reino 5: correção do erro anterior que deslocava o herói PARA BAIXO.
 // A âncora do herói passa a ficar alguns pixels acima da referência do piso,
 // em vez de ultrapassá-la. Sem mexer nos monstros voadores ou no cenário.
// Ajuste exclusivo do Reino 5: os pes visiveis do heroi estavam abaixo da linha
// de contato. Este deslocamento corrige o desenho, nao a fisica nem o piso.
const heroGroundOffset=()=>0; // Sem segundo deslocamento visual: referência física única nos 5 territórios.
const worldLen=()=>W*4.25; // Permite rolagem longa e pelo menos uma repetição do cenário.

// ITENS DE APOIO — somente assets existentes da V2.4; os PNGs são carregados uma vez.
const lootDefs={
 heart:{label:'CORAÇÃO',file:'heart.png',ttl:11},
 chest:{label:'BAÚ DA MAGIA',file:'chest.png',ttl:12},
 crystal:{label:'CRISTAL DE MANA',file:'crystal.png',ttl:14},
 clock:{label:'TEMPO LENTO',file:null,emoji:'⏱️',ttl:13},
 shield:{label:'ESCUDO',file:'shield.png',ttl:13},
 sword:{label:'ESPADA',file:'dagger.png',ttl:13},
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
 S.loot={key,x:nearX,y:floorAnchorY()-8,age:0,life:def.ttl};
 S.lootCount++;if(key==='heart')S.lootHeartUsed=true;
 lootMessage('✨ '+def.label+' APARECEU! ALCANCE A TEMPO!');
}
function lootCollect(){
 if(!S.loot)return;
 const key=S.loot.key;
 S.loot=null;S.lootNext=12+Math.random()*5;S.lootClock=0;
 if(key==='heart')p.hp=Math.min(100,p.hp+20);
 if(key==='crystal')p.mana=Math.min(100,p.mana+40);
 if(key==='chest'){S.lootChestUsed=true;S.lootPhaseChest=true;}
 if(key==='clock')S.lootBuffs.clock=12;
 if(key==='shield'){S.lootBuffs.shield=10;p.shield=Math.max(p.shield,10)}
 if(key==='sword')S.lootBuffs.sword=14;
 if(key==='map')S.lootMapUntil=12;
 burst(p.x,p.y-75,key==='heart'?'#ff6189':'#83dfff',19);
 const description={heart:'+1 CORAÇÃO',crystal:'+40 MANA',chest:'LIMITE DE SUPER x2 ATÉ O FIM DA FASE',clock:'INIMIGOS LENTOS POR 12s',shield:'PROTEÇÃO POR 10s',sword:'DANO AUMENTADO POR 14s',map:'PRÓXIMO ITEM SINALIZADO'}[key];
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
const mobEmojis=['🐝','💣','💥','☄️','🐝','💥'];
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
 overlay.querySelector('.defeated').replaceChildren(...used.map(id=>{const im=document.createElement('img');im.src=S.imgs[id].src;im.alt='Subordinado derrotado';return im}));
 overlay.querySelector('.heading').textContent=name;
 overlay.querySelector('.desc').textContent=desc;
 const bar=overlay.querySelector('.meter span');bar.style.transition='none';bar.style.width='0%';
 requestAnimationFrame(()=>{bar.style.transition='width 1.65s linear';bar.style.width='100%'});
 setTimeout(()=>{overlay.style.display='none';cb();S.transition=false;if(!stayPaused){playing=true;paused=false}},delay);
}
function createMob(id,i,n){
 // Abelhas voadoras: nascem em alturas variadas, espalhadas pelo mapa,
 // e atacam em mergulhos de cima para baixo.
 const begin=W*.59;
 const finish=S.world-W*.60;
 const ratio=n>1?i/(n-1):0;
 const x=begin+(finish-begin)*ratio;
 const stationX=x;
 const sizes=[108,116,114,118,113,119,122,124,114,123,124,129,131,129,132,138,140,144];
 const shots=[1,1,2,2,1,2,2,2,2,2,2,2,3,2,2,3,3,3];
 const speeds=[58,62,54,60,66,58,70,62,57,63,65,62,64,63,60,67,66,61];
 const size=Math.min(H*.22,(sizes[id]||115)*Math.min(1.10,H/480))*.78;
 const laneBase=clamp(H*(.22+((id%5)*.055)+((i%3)*.018)),H*.18,floorAnchorY()-size*.62);
 const hoverLead=110+((id*23+i*11)%150); // evita sobreposição horizontal perto do herói
 return {id,isZombie:false,airborne:true,x,stationX,
  y:laneBase,baseY:laneBase,flightBaseY:laneBase,
  max:(shots[id]||2)*22,hp:(shots[id]||2)*22,size,
  speed:(speeds[id]||62)+S.area*6,phase:i*1.1,cool:3.1+(i%4)*.78+Math.floor(i/4)*.18,
  contact:0,age:0,hit:0,step:0,behavior:'fly',actionTimer:1.1+(i%4)*.25,actionAge:0,
  descentPending:false,descentDone:false,descentHeight:0,dropStart:0,dropDuration:1.0,
  jumpVelocity:0,jumpHeight:0,raiseTime:0,raiseTotal:0.55,
  waveAmp:18+((id+i)%4)*8,waveSpeed:1.6+((id+i)%3)*.25,
  hoverLead,verticalBias:((id+i)%5)*.03,diveTargetY:laneBase,diveStartY:laneBase,diveProgress:0,diveDuration:.7,
  returnDuration:.85,diveCooldown:1.4+((id+i)%4)*.22};
}


// Escudo REAL dos subordinados: o dano consome a barreira primeiro.
// O HP só diminui quando a barreira acabar; sem recarga infinita.
const cm25OriginalCreateMob=createMob;
createMob=function(...args){
 const m=cm25OriginalCreateMob(...args);
 m.cm25ShieldMax=Math.max(14,Math.round(m.max*.32));
 m.cm25Shield=m.cm25ShieldMax;
 return m;
};
function cm25AbsorbMobShield(m,damage){
 damage=Math.max(0,Number(damage)||0);
 if(!m||!Number.isFinite(m.cm25Shield)||m.cm25Shield<=0)return damage;
 const blocked=Math.min(m.cm25Shield,damage);
 m.cm25Shield=Math.max(0,m.cm25Shield-blocked);
 m.hit=Math.max(m.hit||0,.22);
 return damage-blocked;
}
function cm25RenderMobShield(m,x,y,z){
 if(!m||m.hp<=0||!(m.cm25Shield>0))return;
 const pct=m.cm25Shield/Math.max(1,m.cm25ShieldMax),radius=Math.max(28,z*.52);
 ctx.save();ctx.globalAlpha=.42+.33*pct;
 ctx.strokeStyle='#65e9ff';ctx.lineWidth=Math.max(2,3*pct);
 ctx.shadowColor='#3bd8ff';ctx.shadowBlur=13;
 ctx.beginPath();ctx.ellipse(x,y,radius,radius*.93,0,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#092745';ctx.fillRect(x-radius*.56,y-radius-18,radius*1.12,6);
 ctx.fillStyle='#78e9ff';ctx.fillRect(x-radius*.56,y-radius-18,radius*1.12*pct,6);
 ctx.font='bold 16px "Segoe UI Emoji",Arial';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.fillText('🛡️',x,y-radius-24);ctx.restore();
}

function setHud(){
 $('#ename').textContent=S.area===4?'MESTRE DA COLMEIA':S.names[S.area];
 $('#round').textContent='MESTRE DA COLMEIA · TERRITÓRIO '+(S.area+1)+'/5';
 $('#stageText').textContent=S.area===4?'REINO DA COLMEIA · MESTRE DA COLMEIA':'REINO DA COLMEIA · '+S.names[S.area];
 $('#difficulty').textContent=S.area===4?'BATALHA FINAL':'DERROTE OS SUBORDINADOS · '+S.total+' RESTANTES';
 $('#ehp').style.width=S.area===4?'100%':(S.total/S.mobs.length*100)+'%';
}
function startTerritory(){
 cm25MeleeCooldown=0;
 // O teste direto usa stage=0, mas a musica DEVE ser a original do Reino 5.
 if(soundOn&&typeof playMediaAudio==='function'&&typeof trilhaFases!=='undefined'){
  playMediaAudio(trilhaFases[4],true,.75);
 }
 lootResetTerritory();
 S.mobs=[];S.fx=[];S.camera=0;S.lastCamera=0;S.advanceReady=false;S.world=worldLen();S.clock=0;S.localUltimateUses=0;S.idleSeconds=0;S.arrowPulse=0;S.fx=[];S.vy=0;S.jumpWasDown=false;
 p.x=W*.19;p.y=ground();window.cm25HeroFeetOffset=heroGroundOffset();p.hp=100;p.mana=100;p.inv=1.5;
 shots=[];bad=[];parts=[];superCooldown=0;superUses=0;
 if(S.area<4){let ids=S.waves[S.area];S.mobs=ids.map((id,i)=>createMob(id,i,ids.length));S.total=S.mobs.length}
 else {boss.max=Math.round(stages[0].hp*2.0);boss.hp=boss.max;boss.x=W*.78;boss.y=floorAnchorY()-bossHeight()*.7-3+bossVisualFootPad();boss.cool=3.1;S.total=0;S.bossIntroTime=1.85;S.bossIntroEndsAt=performance.now()+1850;S.bossPhase=1;S.bossPhaseNotice=0;S.camera=0;S.bossMovement=0;S.bossWebCooldown=6.0;S.bossSuperClock=13.5;S.bossFace=-1;window.cm25GolemFacing=-1;S.bossHealthAtStart=boss.hp;S.previousBossHP=boss.hp;S.defenderQueue=Array.from({length:S.files.length},(_,i)=>i);S.guardianSpawnCooldown=2.0;S.bossAnchorX=W*.67;S.bossSwingSpeed=1.1;S.mobs=[];S.total=S.defenderQueue.length}
 setHud();say25('🐝 '+S.names[S.area]+' — '+(S.area===4?'CHEFÃO!':'avance e vença a horda!'),3);
}
resetStage=function(){orig.reset();if(stage!==0)return;S.area=0;S.active=true;S.lootChestUsed=false;S.lootPhaseChest=false;startTerritory();console.info('[ClassMana R4] Territorio 1/5 carregado com '+S.total+' inimigos, antes da chefona.')};
function updateFacing(dx){
 if(dx>0.08)window.cm25Facing=1;
 else if(dx<-.08)window.cm25Facing=-1;
}
// Mira assistida: considera o corpo real e a direção física de cada alvo.
function mobAimPoint(m){return {x:m.x,y:m.y-m.size*.52}}
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
// Plano B para falta do modulo remoto: sete raios descendo do topo,
// em sequencia da esquerda para a direita. Nao altera placar nem combate.
let cm25FallbackCanvas=null,cm25FallbackCtx=null,cm25FallbackStart=0,cm25FallbackRAF=0;
function cm25PlayUltimateFallback(){
 if(!cm25FallbackCanvas){
  cm25FallbackCanvas=document.createElement('canvas');
  cm25FallbackCanvas.id='cm25UltimateVisualFallback';
  Object.assign(cm25FallbackCanvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'99999'});
  document.body.appendChild(cm25FallbackCanvas);
  cm25FallbackCtx=cm25FallbackCanvas.getContext('2d');
 }
 cm25FallbackStart=performance.now();
 if(cm25FallbackRAF)cancelAnimationFrame(cm25FallbackRAF);
 const color=['#ff63df','#7ff5ff','#7a6bff','#ffe06a','#a16dff','#ff5a32'][heroIdx]||'#d1e8ff';
 const render=now=>{
  const d=Math.min(2,window.devicePixelRatio||1),w=innerWidth,h=innerHeight;
  if(cm25FallbackCanvas.width!==Math.round(w*d)||cm25FallbackCanvas.height!==Math.round(h*d)){
   cm25FallbackCanvas.width=Math.round(w*d);cm25FallbackCanvas.height=Math.round(h*d);
  }
  const g=cm25FallbackCtx;g.setTransform(d,0,0,d,0,0);g.clearRect(0,0,w,h);
  const t=(now-cm25FallbackStart)/1500;
  if(t>=1){cm25FallbackRAF=0;return}
  const target=window.cm25UltimateTargetScreen?.();
  const minX=target==null?w*.26:Math.max(25,target-140),maxX=target==null?w*.84:Math.min(w-25,target+140);
  for(let i=0;i<7;i++){
   const st=.055+i*.082,u=(t-st)/.33;
   if(u<=0||u>=1)continue;
   const opacity=Math.sin(u*Math.PI),cx=minX+(maxX-minX)*(i+.5)/7;
   const xAt=y=>cx+Math.sin(i*3.7+y*.055+Math.floor(now/56)*.9)*11;
   g.save();g.globalCompositeOperation='screen';g.globalAlpha=opacity;
   for(const width of [15,6,2]){
    g.beginPath();g.moveTo(xAt(0),-20);
    for(let n=1;n<=12;n++){const yy=(h*.81+20)*n/12-20;g.lineTo(xAt(yy),yy)}
    g.strokeStyle=width===2?'#ffffff':color;g.lineWidth=width;g.lineJoin='round';
    g.shadowColor=color;g.shadowBlur=width*3;g.stroke();
   }
   g.restore();
  }
  cm25FallbackRAF=requestAnimationFrame(render);
 };
 cm25FallbackRAF=requestAnimationFrame(render);
}
function cm25CastUltimate(){
 if(!S.active||stage!==0||!playing||paused||defeatPending||bossDefeated)return;
 const limit=S.area===4?3:1;
 if((S.localUltimateUses||0)>=limit){say25('⚡ MAGIA SUPREMA: usos esgotados neste território!',1.6);return}
 // MODO DE TESTE: permitir acionar C mesmo sem acumular pontos no inicio da fase.
 if(p.hp<=20){say25('⚡ MAGIA SUPREMA: vida muito baixa!',1.8);return}
 const target=S.area===4?boss:closestMob();
 if(!target){say25('⚡ MAGIA SUPREMA: nenhum alvo próximo!',1.8);return}
 // A tecla C e o botao sao tratados por esta rotina; por isso o modulo
 // original nao chega a chamar flash(). Acionamos SOMENTE o desenho dos raios.
 // Nunca chamar supreme()/heroUltimate() novamente: isso duplicaria o custo.
 if(typeof window.cm25PlayUltimateFx==='function')window.cm25PlayUltimateFx();
 else cm25PlayUltimateFallback();
 S.localUltimateUses=(S.localUltimateUses||0)+1;
 score=Math.max(0,score-500);p.hp=Math.max(1,p.hp*.80);
 $('#php').style.width=p.hp+'%';
 const x=S.area===4?boss.x:target.x, y=S.area===4?boss.y:target.y-target.size*.52;
 const damage=S.area===4?Math.max(1,Math.ceil(boss.max*.21)):Math.max(1,Math.ceil(target.max*.84));
 target.hp=Math.max(0,target.hp-cm25AbsorbMobShield(target,damage));
 burst(x,y,'#f6ddff',55);shake=13;try{tone(760,.42,'sine',.08)}catch(_e){}
 if(S.area===4){$('#ehp').style.width=(boss.hp/boss.max*100)+'%';
   if(boss.hp<=0){defeatPending=true;finishBossDefeat();}
 }else if(target.hp<=0){S.total=Math.max(0,S.total-1);setHud()}
 say25('⚡ MAGIA SUPREMA ATIVADA! • -20% VIDA',2.2);
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
  // Em teste, C deve funcionar a partir do inicio do territorio.
  if(p.hp<=20){say25('⚡ Vida muito baixa!',1.4);return {ok:false,reason:'vida'}}
  score=Math.max(0,score-pointCost);p.hp=Math.max(1,p.hp*(1-hpCostPct));
  $('#php').style.width=p.hp+'%';
  const aim=mobAimPoint(target);S.ultimateAimX=aim.x;S.ultimateAimY=aim.y;S.ultimateScreenX=aim.x-S.camera;
  const damage=Math.max(1,Math.ceil(target.max*.84));
  // O alvo mantém colisão e visibilidade: não há dano em monstros já derrotados.
  setTimeout(()=>{if(!S.active||S.area>=4||target.hp<=0||!playing)return;
   target.hp=Math.max(0,target.hp-cm25AbsorbMobShield(target,damage));target.hit=.22;burst(aim.x,aim.y,'#a8f0ff',55);
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
  const targetY=m.y-m.size*.52;
  const radius=Math.max(12,m.size*.29);
  const deltaX=m.x-h.x,deltaY=targetY-h.y;
  if(deltaX*deltaX+deltaY*deltaY>(radius+h.radius)**2)continue;
  m.hp=Math.max(0,m.hp-cm25AbsorbMobShield(m,damage));m.hit=.22;
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
function hurtHero(points,x,y){if(p.shield>0||p.inv>0)return;p.hp=Math.max(0,p.hp-points);p.inv=.7;burst(x,y,'#e7a9fb',15);shake=5}
// Todos os seis tipos de subordinado têm arma própria: o limite de projéteis não
// cancela para sempre o turno de nenhum inimigo. Cada um reage à distância.
const attackEmojiById=Array(18).fill('🌿');
const attackColorById=Array.from({length:18},(_,i)=>['#ffd14b','#e69b19','#ffe28a','#ffaf24'][Math.floor(i/4)%4]);
const cmLavaMissiles=['proj_01.png','proj_02.png','proj_03.png','proj_04.png','proj_05.png','proj_06.png','proj_07.png','proj_08.png','proj_09.png','proj_10.png','proj_11.png','proj_12.png','proj_13.png','proj_14.png','proj_15.png','proj_16.png'];
const cmMissileImgs=cmLavaMissiles.map(file=>{const im=new Image();im.src=getAsset('projeteis/'+file);return im});
function drawHostileMissile(q){
 const ix=q.cmProjectileId!=null?q.cmProjectileId:(q.isBossWeb?12+(q.ownerId%4):q.ownerId%16);
 const im=cmMissileImgs[ix]; const r=q.ownerId===3?35:25;
 ctx.save();ctx.translate(q.x,q.y);ctx.shadowBlur=12;ctx.shadowColor=q.col||'#ffa832';
 // PNGs direcionais foram normalizados para apontar à ESQUERDA.
 // Alinhar visual e física: projéteis viajando à direita recebem espelhamento
 // apenas no momento do desenho, sem modificar os sprites de abelha.
 const isRadial=[1,6,7,11,12,15].includes(ix); // efeitos explosivos / circulares
 if(!isRadial){
  const angle=Math.atan2(q.vy||0,q.vx||-1);
  ctx.rotate(angle-Math.PI); // PNG original aponta para ângulo PI (esquerda)
 }
 if(im&&im.complete&&im.naturalWidth){ctx.drawImage(im,-r*1.45,-r,r*2.9,r*2)}
 else {ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='29px Segoe UI Emoji,sans-serif';ctx.fillText(q.emoji||'🐝',0,0)}ctx.restore();
}
// Cada abelha alterna caminhada, preparação defensiva, saltos e descida por fio.
// Distância de ativação curta; ações só começam quando o jogador pode vê-las.
function updateMobs(dt){
 const slowdown=(S.lootBuffs.clock||0)>0?.48:1;
 const activeDistance=W*.54;
 let diving=S.mobs.filter(m=>m.hp>0&&m.behavior==='dive').length;
 for(const m of S.mobs){
  if(m.hp<=0)continue;
  m.age+=dt;m.phase+=dt*3.2;m.hit=Math.max(0,m.hit-dt);m.contact=Math.max(0,m.contact-dt);
  m.cool-=dt*slowdown;m.actionTimer-=dt*slowdown;m.diveCooldown=Math.max(0,m.diveCooldown-dt*slowdown);
  const factor=dt*slowdown;
  const distance=p.x-m.x;
  // Acorda ao alcançar o setor; depois segue o herói, mesmo que ele recue.
  m.cm25Chasing ||= Math.abs(distance)<activeDistance;
  const near=m.cm25Chasing;
  const onScreen=m.x-S.camera>-m.size&&m.x-S.camera<W+m.size;
  // Abelhas ainda não despertas patrulham seu setor. As despertas perseguem
  // com dispersão horizontal para não se empilharem na Fada.
  const targetX=near
   ?clamp(p.x+((m.id%5)-2)*Math.max(30,m.size*.25),W*.09,S.world-W*.10)
   :clamp(m.stationX+Math.sin(m.age*.72+m.id)*W*.032,
         m.stationX-W*.065,m.stationX+W*.065);
  const dxTarget=targetX-m.x;

  if(m.behavior==='fly'){
   // voo espalhado em camadas, vindo majoritariamente por cima.
   m.flightBaseY=clamp(m.baseY+Math.sin(m.age*.35+m.id)*8,H*.18,floorAnchorY()-m.size*.58);
   const wave=Math.sin(m.age*m.waveSpeed+m.phase)*m.waveAmp;
   m.y=clamp(m.flightBaseY+wave,H*.16,floorAnchorY()-m.size*.34);
   const drift=clamp(dxTarget,-1,1);
   const glide=.82+.18*Math.sin(m.age*1.7+m.id);
   m.x=clamp(m.x+drift*m.speed*factor*glide*(near?1.85:1),W*.09,S.world-W*.12);
   if(near&&onScreen&&m.actionTimer<=0&&m.diveCooldown<=0&&diving<3){
    m.behavior='dive';
    m.diveStartY=m.y;
    m.diveTargetY=clamp((p.y-45)-m.size*.22,H*.22,floorAnchorY()-m.size*.18);
    m.diveProgress=0;
    m.diveDuration=.55+((m.id+m.age*10)%3)*.08;
    diving++;
    m.actionTimer=1.25+(m.id%4)*.18;
    m.diveCooldown=1.6+(m.id%4)*.22;
   }
  }else if(m.behavior==='dive'){
   // ataque de cima para baixo.
   m.diveProgress=Math.min(1,m.diveProgress+factor/m.diveDuration);
   const t=m.diveProgress, smooth=t*t*(3-2*t);
   m.y=m.diveStartY+(m.diveTargetY-m.diveStartY)*smooth;
   const diveAim=targetX;
   const drift=clamp(diveAim-m.x,-1,1);
   m.x=clamp(m.x+drift*m.speed*factor*(near?1.85:1.18),W*.09,S.world-W*.12);
   if(t>=1){
    m.behavior='rise';
    m.raiseTime=0;
    m.raiseTotal=.62+((m.id)%3)*.08;
    m.baseY=clamp(H*(.20+.05*((m.id+Math.floor(m.age))%5)),H*.18,floorAnchorY()-m.size*.60);
   }
  }else if(m.behavior==='rise'){
   // sobe rapidamente para uma nova faixa de voo após o mergulho.
   m.raiseTime+=factor;
   const t=clamp(m.raiseTime/m.raiseTotal,0,1), smooth=t*t*(3-2*t);
   const riseFrom=Math.max(m.y,m.diveTargetY);
   m.y=riseFrom+(m.baseY-riseFrom)*smooth;
   const targetX2=targetX;
   const drift=clamp(targetX2-m.x,-1,1);
   m.x=clamp(m.x+drift*m.speed*factor*(near?1.3:.74),W*.09,S.world-W*.12);
   if(t>=1){m.behavior='fly';m.actionTimer=1.0+(m.id%4)*.2;}
  }

  // dano por contato só quando a abelha invade de fato o espaço do herói.
  const bodyY=m.y-m.size*.48;
  if(near&&Math.abs(distance)<m.size*.38&&Math.abs((p.y-45)-bodyY)<m.size*.46&&m.contact<=0){
    hurtHero(2+Math.floor(S.area/2),p.x,p.y);m.contact=1.5;
  }

  // tiros saem da altura real do voo.
  if(m.cool<=0){
   const sx=m.x, sy=m.y-m.size*.46;
   const dx=p.x-sx, dy=(p.y-45)-sy;
   const dist=Math.hypot(dx,dy);
   if(near&&onScreen&&dist<W*.72){
    if(bad.length<9){
     const speed=205+S.area*16;
     const col=attackColorById[m.id];
     bad.push({x:sx,y:sy,vx:dx/(dist||1)*speed,vy:dy/(dist||1)*speed,
      life:Math.max(2.0,dist/speed+.75),r:13,kind:'bee',col,
      emoji:attackEmojiById[m.id],ownerId:m.id,cmProjectileId:m.id%16,special:false});
     m.attacks=(m.attacks||0)+1;burst(sx,sy,col,3);
     m.cool=2.8+(m.id%4)*.45+Math.random()*.65;
    }else m.cool=.35;
   }else m.cool=.45;
  }
 }
}

function collision(dt){
 for(const q of shots){const ox=q.x,oy=q.y;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;if(q.life<=0)continue;
  for(const m of S.mobs){if(m.hp<=0)continue;
   if((()=>{const cx=m.x,cy=m.y-m.size*.52,vx=q.x-ox,vy=q.y-oy,t=clamp(((cx-ox)*vx+(cy-oy)*vy)/(vx*vx+vy*vy||1),0,1);return Math.hypot(ox+vx*t-cx,oy+vy*t-cy)<m.size*.30+q.r*.55})()){q.life=0;m.hp=Math.max(0,m.hp-cm25AbsorbMobShield(m,q.dmg*((S.lootBuffs.sword||0)>0?1.35:1)));m.hit=.14;burst(m.x,m.y-m.size*.5,q.col,9);
    if(m.hp===0){burst(m.x,m.y-m.size*.5,'#d2f5ff',25);S.total--;setHud()}break;
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
 if(up&&!S.jumpWasDown&&(p.y>=ground()-2 || isWingedHero()))S.vy=isWingedHero()?-425:-480;
 S.jumpWasDown=up;
 S.vy+=gravity()*dt*(down?2.0:1);
 S.vy=clamp(S.vy,-550,700);
 p.y=clamp(p.y+S.vy*dt,heroCeiling(),ground());
 window.cm25HeroFeetOffset=heroGroundOffset();
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


// Defesa da colmeia: um exemplar de cada um dos 18 sprites, em levas de até 3.
// Todos têm hitbox, HP, podem ser derrotados e surgem visivelmente no piso.
function updateMotherGuardians(dt){
 if(bossDefeated||defeatPending){S.mobs=[];S.defenderQueue=[];return}
 S.guardianSpawnCooldown=Math.max(0,(S.guardianSpawnCooldown||0)-dt);
 const alive=S.mobs.filter(m=>m.hp>0);
 S.mobs=alive;
 if(S.guardianSpawnCooldown<=0&&alive.length<2&&S.defenderQueue.length){
  const id=S.defenderQueue.shift(),m=createMob(id,18-S.defenderQueue.length,18);
  m.x=clamp(W*(.53+alive.length*.13),W*.45,W*.88);m.stationX=m.x;
  m.size=Math.min(m.size,H*.17);m.cool=3.0+alive.length*.8;m.max=Math.max(16,Math.round(m.max*.75));m.hp=m.max;
  m.baseY=clamp(H*(.22+.07*alive.length),H*.18,floorAnchorY()-m.size*.62);
  m.flightBaseY=m.baseY;m.y=m.baseY;m.behavior='fly';m.hoverLead=90+alive.length*48;m.descentPending=false;m.descentDone=true;
  S.mobs.push(m);S.guardianSpawnCooldown=4.1;
 }
 updateMobs(dt);
 // A atualização padrão do chefe movimenta as balas do herói antes daqui.
 // Resolver colisões dos defensores sem movimentar os tiros duas vezes.
 for(const q of shots){if(q.life<=0)continue;
  for(const m of S.mobs){if(m.hp<=0)continue;
   const cx=m.x,cy=m.y-m.size*.52;
   const d=Math.hypot(q.x-cx,q.y-cy);
   const ox=q.x-q.vx*dt,oy=q.y-q.vy*dt,vx=q.x-ox,vy=q.y-oy;
   const t=clamp(((cx-ox)*vx+(cy-oy)*vy)/(vx*vx+vy*vy||1),0,1);
   if(Math.min(d,Math.hypot(ox+vx*t-cx,oy+vy*t-cy))<m.size*.32+(q.r||8)*.5){
    q.life=0;m.hp=Math.max(0,m.hp-cm25AbsorbMobShield(m,q.dmg));m.hit=.18;
    burst(cx,cy,q.col||'#bb8cff',11);
    if(m.hp===0){S.total=Math.max(0,S.total-1);burst(cx,cy,'#d2f5ff',25)}
    break;
   }
  }
 }
}
function drawMotherSilk(){
 // Âncora fixa no teto + fio curvado pela posição pendular da Mestre da Colmeia.
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
 const txt='🐝 DEFENSORAS DA COLMEIA: '+S.total+'/10';
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
 if(cm25UltimateButton&&S.localUltimateUses<(S.area===4?3:1))cm25UltimateButton.disabled=false;
 const wanted=clamp(p.x-W*.36,0,S.world-W);S.lastCamera=S.camera;S.camera+=(wanted-S.camera)*Math.min(1,dt*12);
 if(p.hp<=0){showTerritoryDefeat();return}
 if(S.total===0){if(!S.advanceReady){S.advanceReady=true;say25('✨ Horda derrotada! Avance até o fim do caminho →',4)}
 if(p.x>S.world-W*.16&&!S.transition){
  const next=S.area+1;changedArea('TERRITÓRIO '+(S.area+1)+' CONCLUÍDO',
   next===4?'⚠ O GUARDIÃO ESTÁ DESPERTANDO…':'Seguindo para '+S.names[next]+'…',
   ()=>{S.area=next;startTerritory();if(next===4)playBossSignal()},false,next===4?600:1850);
 }}
}

 // Separação espacial suave: os inimigos mantêm a perseguição e ataques,
 // mas não ficam todos sobrepostos em uma só pilha de sprites.
 function cm25SeparateMobs(dt){
  if(!playing||paused||!S.active||!Array.isArray(S.mobs))return;
  const alive=S.mobs.filter(m=>m&&m.hp>0).sort((a,b)=>a.x-b.x||a.id-b.id);
  if(alive.length<2)return;
  const minX=W*.10,maxX=S.area===4?W*.91:S.world-W*.10;
  // A ordem espacial é estável: cada inimigo ocupa sua faixa sem
  // trocar continuamente de lado e se empilhar sobre os demais.
  const movement=Math.max(1,Math.min(.05,dt)*600);
  for(let pass=0;pass<4;pass++){
   for(let i=1;i<alive.length;i++){
    const left=alive[i-1],right=alive[i];
    if(Math.abs(left.y-right.y)>Math.min(left.size,right.size)*.72)continue;
    const gap=Math.max(82,(left.size+right.size)*.48);
    const overlap=gap-(right.x-left.x);
    if(overlap<=0)continue;
    const step=Math.min(overlap,movement);
    if(left.x<=minX+1)right.x=clamp(right.x+step,minX,maxX);
    else if(right.x>=maxX-1)left.x=clamp(left.x-step,minX,maxX);
    else{
     left.x=clamp(left.x-step*.5,minX,maxX);
     right.x=clamp(right.x+step*.5,minX,maxX);
    }
   }
  }
 }
update=function(dt){
 if(stage===0&&S.active&&S.area<4){const result=moveHorde(dt);cm25SeparateMobs(dt);return result;}
 if(stage===0&&S.active&&S.area===4){
  // Prazo absoluto: a vinheta termina em 2,4 segundos REAIS no relogio (mais 0,6s de transicao),
  // sem acumular tempo de renderizacao, pausa ou fade adicional.
  if(S.bossIntroTime>0){
   S.bossIntroTime=Math.max(0,(S.bossIntroEndsAt-performance.now())/1000);
   if(S.bossIntroTime===0){
    say25('⚔ BATALHA! MESTRE DA COLMEIA!',1.3);
    S.bossPhase=1;boss.cool=4.4;
   }else return;
  }
  updateFacing((keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0)+joy.x);
  // Na arena do chefão, preservar o combate original mas substituir a física vertical.
  const old=[keys.ArrowUp,keys.w,keys.ArrowDown,keys.s,joy.y];
  keys.ArrowUp=keys.w=keys.ArrowDown=keys.s=false;joy.y=0;
  try{orig.update(dt)}finally{[keys.ArrowUp,keys.w,keys.ArrowDown,keys.s,joy.y]=old}
  if(playing&&!paused){
   applyVerticalPhysics(dt);lootStep(dt);
   if(cm25UltimateButton&&S.localUltimateUses<3)cm25UltimateButton.disabled=false;
   // Mestre da Colmeia é terrestre: asas ancoradas ao piso final.
   S.bossMovement+=dt;
   const sway=Math.sin(S.bossMovement*.9)*Math.min(W*.12,110);
   boss.x=clamp(W*.71+sway,W*.45,W*.86);
   boss.y=floorAnchorY()-bossHeight()*.7+Math.sin(S.bossMovement*1.7)*12+bossVisualFootPad();
   S.bossFace=-1;
   window.cm25GolemFacing=-1;
   // Sem aumentar o dano dos ataques. O jogador precisa mudar de lugar.

   const newPhase=boss.hp<=boss.max*.35?3:(boss.hp<=boss.max*.70?2:1);
   if(newPhase>S.bossPhase){S.bossPhase=newPhase;S.bossPhaseNotice=2.4;shake=9;
    say25(newPhase===2?'🐝 A MESTRE DA COLMEIA DESPERTOU NOVOS PODERES!':'💥 ÚLTIMA RESISTÊNCIA DA MESTRE DA COLMEIA!',2.6);
    try{tone(newPhase===2?450:310,.40,'triangle',.06)}catch(e){}
   }
   S.bossPhaseNotice=Math.max(0,(S.bossPhaseNotice||0)-dt);
   updateMotherGuardians(dt);
   cm25ApplyHeroContact(dt,true);
   if(bossDefeated||!S.active)return;
   // O contador original deve chegar a zero para a Mestre da Colmeia atacar.
   // Não restaurar boss.cool a cada frame: isso bloqueava enemyAttack().
   // Magia Suprema da Mestre da Colmeia: chuva de gotas de mel em leque, com aviso e
   // projéteis físicos partindo do CORPO da colmeia (sem nascer fora da tela).
   S.bossSuperClock=(S.bossSuperClock??9.5)-dt;
   if(S.bossSuperClock<=0&&!bossDefeated&&bad.length<6){
    const sx=boss.x+(p.x<boss.x?-bossHeight()*.23:bossHeight()*.23);
    const sy=boss.y+bossHeight()*.12;
    const angle=Math.atan2(p.y-42-sy,p.x-sx);
    for(let i=-1;i<=1&&bad.length<8;i++){
     const a=angle+i*.22,spd=170;
     bad.push({x:sx,y:sy,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,
      life:4.7,r:17,kind:'bee',col:'#ffcc34',emoji:'🐝',ownerId:(i+3)%4,cmProjectileId:12+((i+3)%4),
      isBossWeb:true,special:true,spin:0});
    }
    burst(sx,sy,'#ffbd22',20);say25('⚠ SUPER DA MESTRE DA COLMEIA • TEMPESTADE DE FERRÕES!',2);
    S.bossSuperClock=S.bossPhase>=3?15.0:17.0;
   }
   S.bossWebCooldown=(S.bossWebCooldown??4.1)-dt;
   if(S.bossWebCooldown<=0&&!bossDefeated&&bad.length<12){
    const phase=S.bossPhase||1;
    const amount=phase===1?1:phase===2?2:3;
    const sx=boss.x+(p.x<boss.x?-bossHeight()*.24:bossHeight()*.24);
    const sy=boss.y+bossHeight()*.09;
    const aim=Math.atan2(p.y-34-sy,p.x-sx);
    const speed=155+phase*11;
    for(let j=0;j<amount&&bad.length<12;j++){
     const a=aim+(j-(amount-1)/2)*(.15+phase*.025);
     bad.push({x:sx,y:sy,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
      life:4.5,r:17,kind:'bee',col:['#ffd76a','#ffb323','#fff0a1'][phase-1],
      emoji:'🐝',ownerId:(phase+j)%4,cmProjectileId:[2,5,9,14][(phase+j)%4],isBossWeb:true,special:false,spin:0});
    }
    S.bossWebCooldown=phase===1?7.2:phase===2?6.5:5.8;
   }
  }
  return;
 }
 orig.update(dt);
};
function drawBG(){
 const im=S.bg[S.area];
 if(!im||!im.complete||!im.naturalWidth){const fb=S.bg[Math.min(S.area,3)]||S.bg[3]||S.bg[0];if(fb&&fb.complete&&fb.naturalWidth){ctx.drawImage(fb,0,0,W,H);return}orig.bg(stages[0],bgs['bg_bee.png']||Object.values(bgs||{})[0]);return}
 const ih=im.naturalHeight,iw=im.naturalWidth;
 const targetHeight=H*CLASSMANA_R4_BG_SCALE,period=iw*(targetHeight/ih),scroll=S.camera;
 // Somente territorio 5: recuar visualmente os personagens no piso por enquadramento
 // da arena (passarela desenhada 2,5% mais abaixo). NAO alterar ancoras,
 // escala ou colisao de herois/subordinados dos territorios 1 a 4.
 const bossArenaSceneryOffset=S.area===4?H*.025:0;
 // Reino 5: a arte ficava aproximadamente 6,5% de tela ABAIXO da ancora
 // de colisao, fazendo todos os personagens parecerem flutuar. Mover apenas
 // a paisagem para CIMA, preservando hero, subordinados, inimigos aereos e fisica.
 const CLASSMANA_R5_BG_CONTACT_CORRECTION=H*.065;
 const imageTop=H*(CLASSMANA_R4_FLOOR_RATIO-CLASSMANA_R4_SOURCE_FLOOR_RATIOS[S.area]*CLASSMANA_R4_BG_SCALE)+bossArenaSceneryOffset-CLASSMANA_R5_BG_CONTACT_CORRECTION;
 // A translação alinha a MESMA borda da passarela em todos os cenarios.
 let left=-(scroll%period);
 while(left<W){ctx.drawImage(im,left,imageTop,period,targetHeight);left+=period}
 ctx.fillStyle='rgba(5,15,38,.07)';ctx.fillRect(0,0,W,H);
 // Neblina simples em camadas, deslocando-se bem mais lentamente do que o piso.
 ctx.save();ctx.globalAlpha=.12;
 const fog=ctx.createLinearGradient(0,H*.50,0,H*.93);fog.addColorStop(0,'rgba(130,185,255,0)');fog.addColorStop(.7,'#9dd5fc');fog.addColorStop(1,'rgba(70,108,169,0)');ctx.fillStyle=fog;ctx.fillRect(0,H*.50,W,H*.43);ctx.restore();
}
drawBackgroundCached=function(s,bg){if(stage===0&&S.active){drawBG();return}orig.bg(s,bg)};
// Retângulos visíveis medidos nos PNGs aprovados; não recorta nenhum pixel do personagem.
// SOLO COMPARTILHADO — o ponto de contato dos subordinados e do herói
// deriva da mesma linha visual. Uma folga de 2 px mantém as folhas/patas
// visíveis, sem enterrá-las na superfície da passarela.
// Correção exclusiva dos subordinados terrestres no Reino 4.
// Mantém a física de salto e a base do herói intocadas.
const MOB_FOOT_CLEARANCE=2;
const MOB_EXTRA_GROUNDING_PX=()=>Math.max(8,Math.round(H*.025))+Math.round(3*96/25.4); // Desce +3 mm (~11 px CSS a 96 dpi) apenas os subordinados no desenho.
const mobVisualFootY=()=>platformY()-MOB_FOOT_CLEARANCE+MOB_EXTRA_GROUNDING_PX();
const mobBounds=S.imgs.map(()=>null);
let showFloorGuide=false;
window.addEventListener('keydown',e=>{if(window.ClassManaV25TestMode&&window.parent!==window)return;if(e.code==='F8'){e.preventDefault();showFloorGuide=!showFloorGuide;}},true);
function getMobBounds(id){
 if(mobBounds[id])return mobBounds[id];
 const im=S.imgs[id];if(!im||!im.complete||!im.naturalWidth)return null;
 const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;
 const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(im,0,0);
 const rgba=g.getImageData(0,0,c.width,c.height).data;
 let left=c.width,top=c.height,right=-1,bottom=-1;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
  const a=rgba[(y*c.width+x)*4+3];if(a<24)continue;
  left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
 }
 const bounds=right>=left?[left,top,right-left+1,bottom-top+1]:[0,0,c.width,c.height];
 mobBounds[id]=bounds;return bounds;
}
function drawMob(m){
 const im=S.imgs[m.id],z=m.size;
 // Sombra permanece no piso: a diferença revela claramente salto e descida.
 const shadowY=mobVisualFootY()+2;
 const heightOff=Math.max(0,shadowY-m.y);
 ctx.save();
 ctx.globalAlpha=.24*(1-.55*clamp(heightOff/(H*.48),0,1));
 ctx.fillStyle='#091026';ctx.beginPath();
 ctx.ellipse(m.x,shadowY+2,z*.33*(1-.25*clamp(heightOff/(H*.48),0,1)),Math.max(3,z*.055),0,0,Math.PI*2);
 ctx.fill();ctx.restore();
 if(m.behavior==='descend'){
  const topY=Math.max(0,Math.min(H*.12,m.y-z-H*.12));
  ctx.save();ctx.strokeStyle='#eae2ff';ctx.lineWidth=2.4;
  ctx.shadowColor='#b778ff';ctx.shadowBlur=7;ctx.beginPath();
  ctx.moveTo(m.x,topY);ctx.lineTo(m.x,m.y-z*.77);ctx.stroke();ctx.restore();
 }
 // Não usar a borda do arquivo PNG como linha do chão.
 // Em repouso m.y == floorAnchorY(); saltos alteram apenas o deslocamento
 // vertical relativo, e todos os 18 sprites têm o mesmo ponto de contato.
 const jumpOrFlightOffset=m.y-floorAnchorY();
 const spriteFootY=mobVisualFootY()+jumpOrFlightOffset;
 ctx.save();ctx.translate(m.x,spriteFootY);
 // Espelhamento do sprite em torno da mesma ancora do piso.
 if(p.x>m.x)ctx.scale(-1,1);
 if(m.hit>0){ctx.shadowColor='#ffffff';ctx.shadowBlur=19}
 if(im&&im.complete&&im.naturalWidth){
  const b=getMobBounds(m.id)||[0,0,im.naturalWidth,im.naturalHeight],sw=b[2],sh=b[3];
  const dw=z*sw/sh;
  // PNG intacto e proporção preservada. Somente sobe no salto/na descida.
  ctx.drawImage(im,b[0],b[1],sw,sh,-dw/2,-z,dw,z);
 }else{ctx.font=(z*.65)+'px Arial';ctx.fillText('🐝',-z*.3,0)}
 // Os sprites aprovados já possuem suas patas: não desenhar membros adicionais.
 ctx.restore();
 // Barra de vida acompanha o CORPO em movimento, não a linha do piso.
 const barY=spriteFootY-z-14;
 ctx.fillStyle='rgba(3,15,34,.8)';ctx.fillRect(m.x-z*.37,barY,z*.74,6);
 ctx.fillStyle='#ff9abb';ctx.fillRect(m.x-z*.37,barY,z*.74*(m.hp/m.max),6);
}

const cm25OriginalDrawMob=drawMob;
drawMob=function(m){cm25OriginalDrawMob(m);cm25RenderMobShield(m,m.x,m.y-m.size*.5,m.size)};
function drawHorde(){ctx.save();if(shake){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake*=.84}
 drawBG();
 if(showFloorGuide){ctx.save();ctx.setLineDash([12,8]);ctx.strokeStyle='#02ffff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,platformY());ctx.lineTo(W,platformY());ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#03fafa';ctx.font='bold 13px Arial';ctx.fillText('REFERÊNCIA REAL DO PISO',20,platformY()-12);ctx.restore();}
 // Mundo usa coordenadas próprias. Apenas o desenho é deslocado pela câmera.
 ctx.save();ctx.translate(-S.camera,0);
 const bossImg=monsters['monster_bee.png'];if(bossImg&&bossImg.complete&&bossImg.naturalWidth){
  // Aparição surpresa ocasional do chefão — não participa da luta.
  if(S.area===2&&p.x>S.world*.46&&p.x<S.world*.62){ctx.save();ctx.globalAlpha=.17;ctx.drawImage(bossImg,S.world*.80,H*.18,Math.min(W*.20,180),H*.27);ctx.restore()}
 }
 for(const m of S.mobs){if(m.hp>0)drawMob(m)}
 orig.hero();lootDraw(false);shots.forEach(drawProjectile);
 for(const q of bad){ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor=q.col||'#90e9ff';ctx.shadowBlur=18;ctx.font='29px "Segoe UI Emoji","Apple Color Emoji",sans-serif';drawHostileMissile(q);ctx.restore()}
 for(const q of parts){ctx.globalAlpha=clamp(q.life,0,1);ctx.fillStyle=q.col;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
 ctx.restore();
 // Após 5 s parado, a seta luminosa indica o caminho a seguir.
 // Não interfere com ataques nem exige imagens adicionais.
 if(S.idleSeconds>=5 && p.x<S.world-W*.12){
  const sx=clamp(p.x-S.camera+110,W*.18,W*.83);
  const sy=floorAnchorY()-Math.max(90,H*.19);
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
 const t=Math.max(0,(S.bossIntroEndsAt-performance.now())/1000);
 if(t<=0){S.bossIntroTime=0;return;}
 ctx.save();ctx.fillStyle='rgba(5,17,43,.70)';ctx.fillRect(0,0,W,H);
 const pulse=(1+Math.sin((2.4-t)*7)*.045);
 ctx.translate(W*.5,H*.44);ctx.scale(pulse,pulse);ctx.textAlign='center';
 ctx.shadowColor='#8bdeff';ctx.shadowBlur=25;ctx.lineWidth=5;ctx.strokeStyle='#124779';
 ctx.fillStyle='#dafaff';ctx.font='900 '+Math.round(Math.min(58,W*.065))+'px Georgia,serif';
 ctx.strokeText('🐝 PREPARE-SE! 🐝',0,-48);ctx.fillText('🐝 PREPARE-SE! 🐝',0,-48);
 ctx.font='900 '+Math.round(Math.min(46,W*.047))+'px Georgia,serif';
 ctx.strokeText('A MESTRE DA COLMEIA ESTÁ CHEGANDO!',0,18);ctx.fillText('A MESTRE DA COLMEIA ESTÁ CHEGANDO!',0,18);
 ctx.shadowBlur=0;ctx.fillStyle='#ffe5a3';ctx.font='bold '+Math.round(Math.min(22,W*.03))+'px Arial';
 ctx.fillText('O GUARDIÃO DA REINO DA COLMEIA DESPERTOU…',0,72);
 ctx.restore();
 // Pequeno tremor só no início e final da vinheta, sem alterar a física do herói.
 if(t>2.0||t<.5)shake=Math.max(shake,3);
}
function playBossSignal(){
 try{if(soundOn){tone(196,.45,'triangle',.09);setTimeout(()=>tone(247,.45,'triangle',.09),460);setTimeout(()=>tone(330,.68,'sawtooth',.07),900)}}catch(e){}
}
draw=function(){if(stage!==0||!S.active)return orig.draw();if(S.area===4){orig.draw();
  drawMotherGuardians();
  // Chefão também lança emojis ofensivos, acompanhando os projéteis reais.
  if(S.bossIntroTime<=0){ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='32px "Segoe UI Emoji","Apple Color Emoji",sans-serif';for(const q of bad){if(q.life>0&&q.isBossWeb)drawHostileMissile(q)}ctx.restore()}
  lootDraw(false);lootHud();drawBossEntrance();return}drawHorde()};
finishBossDefeat=function(){if(stage!==0||!S.active)return orig.defeat();
 defeatPending=false;playing=false;paused=true;S.active=false;
 changedArea('MESTRE DA COLMEIA DERROTADA!', 'Próximo reino: Duquesa Aranha!',()=>{
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
 if(e.code==='F7'){e.preventDefault();S.area=4;startTerritory();playBossSignal();say25('🧪 TESTE: CHEFÃA MESTRE DA COLMEIA',3)}
},true);
window.ClassManaV25Test={getStatus:()=>({territorio:S.area+1,inimigos:S.total,ativo:S.active,hero:heroes[heroIdx]?.name,camera:S.camera,world:S.world,ground:floorAnchorY(),groundRatio:platformRatios[S.area],bossBottom:boss.y+bossHeight()/2,heroVisualPad:heroVisualFootPad(),bossVisualPad:bossVisualFootPad(),projectiles:bad.map(q=>({emoji:q.emoji,ownerId:q.ownerId,x:q.x,y:q.y,vx:q.vx,vy:q.vy})),heroBottom:p.y-45+heroHeight()/2+(window.cm25HeroFeetOffset||0),bossIntro:S.bossIntroTime||0,bossIntroRemaining:S.bossIntroEndsAt?Math.max(0,(S.bossIntroEndsAt-performance.now())/1000):0,bossHP:boss.hp,bossMax:boss.max,ultimateUses:S.localUltimateUses||0,bossSuperClock:S.bossSuperClock,bossFace:S.bossFace,defensoresRestantes:S.total,defensoresPendentes:S.defenderQueue?.length||0,loot:S.loot?{...S.loot}:null,lootBuffs:{...S.lootBuffs},chest:S.lootPhaseChest,mobs:S.mobs.map(m=>({id:m.id,feet:m.y,visualFeet:mobVisualFootY()+(m.y-floorAnchorY()),zombie:m.isZombie,size:m.size,behavior:m.behavior,attacks:m.attacks||0}))})};

// == Ponte de integração com o núcleo compartilhado, Reino 5 ==
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
   window.parent!==window&&window.parent.postMessage({namespace:'CM25',action:'COMPLETE',token:new URLSearchParams(location.search).get('cm25'),realm:5},location.origin);
 }
 return out;
};

window.CM25RealmBridge={
  realm:5,maxTerritories:5,
  status:()=>({realm:5,territory:S.area+1,active:!!S.active,playing:!!playing,monstersLoaded:(S.mobs||[]).length,monstersRemaining:S.total??(S.mobs||[]).length,hero:heroIdx,name:playerName,className:playerClass,score:score}),
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
