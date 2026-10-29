/* Reino 10 — consolidacao V2.5, revisao da colisao e protecao de dano dos subalternos. */
(function(){
'use strict';
const orig={reset:resetStage,update,draw,fire,finish:finishBossDefeat,background:drawBackgroundCached};
const R={active:false,area:0,mobs:[],projectiles:[],cam:0,world:0,clock:0,shift:false,jumpV:0,jumpHold:false,cleared:false,bossIntro:0,bossShot:0,bossFollowers:[],bossHpStart:4510,bossDeath:false,showingDefeat:false,damageGrace:0};
const names=['VALE DOS DRAGÕES','FORTALEZA DAS TRÊS BANDEIRAS','PEDRAS DRACÔNICAS','PASSAGEM DAS ASAS ANCESTRAIS','CASTELO DO DRAGÃO · CONFRONTO FINAL'];
const bg=[],dragon=[],projectile=[];
for(let t=1;t<=5;t++){const i=new Image();i.src=new URL('assets_v25/cenarios/cenario_'+t+'.jpg',location.href).href;bg.push(i)}
for(let t=1;t<=4;t++){let di=[],pi=[];for(let f=1;f<=4;f++){let a=new Image(),b=new Image();a.src=new URL('assets_v25/inimigos/t'+t+'_'+f+'.png',location.href).href;b.src=new URL('assets_v25/projeteis/t'+t+'_'+f+'.png',location.href).href;di.push(a);pi.push(b)}dragon.push(di);projectile.push(pi)}
// V2.5 Reino 1: itens de apoio e limite de especial duplicado pelo baú.
const lootDefs={heart:{name:'CORAÇÃO',file:'heart.png',ttl:11},crystal:{name:'CRISTAL DE MANA',file:'crystal.png',ttl:10},chest:{name:'BAÚ DA MAGIA',file:'chest.png',ttl:12}};
const lootImages={};for(const [k,v] of Object.entries(lootDefs)){const img=new Image();img.src=AS+'items3d/'+v.file;lootImages[k]=img}
R.loot=null;R.lootClock=0;R.lootNext=11;R.lootCount=0;R.chestThisTerritory=false;R.chestEver=false;R.heartUsed=false;
const r10OriginalSuperLimit=superLimit;
superLimit=function(){const n=r10OriginalSuperLimit();return R.active&&stage===0?(R.chestThisTerritory?n*2:n):n};
function lootSpawn(type){if(R.loot||!playing||paused||R.shift)return;const def=lootDefs[type];if(!def)return;
 R.loot={type,x:clamp(p.x+W*.24,W*.19,R.world-W*.10),y:floor()-8,time:def.ttl,age:0};R.lootCount++;say('✨ '+def.name+' APARECEU! ALCANCE A TEMPO!',2.2)}
function lootCollect(){const item=R.loot;if(!item)return;R.loot=null;R.lootClock=0;R.lootNext=20+Math.random()*10;
 if(item.type==='heart')p.hp=Math.min(100,p.hp+20);
 if(item.type==='crystal')p.mana=Math.min(100,p.mana+25);
 if(item.type==='chest'){R.chestThisTerritory=true;R.chestEver=true}
 const labels={heart:'💖 +1 CORAÇÃO',crystal:'🧪 +25 MANA',chest:'🎁 SUPER x2 ATÉ O FIM DO TERRITÓRIO'};
 say(labels[item.type],2.8);burst(p.x,p.y-75,'#83dfff',20)}
function lootStep(dt){if(R.bossIntro>0||R.shift||!playing||paused)return;
 if(R.loot){const a=R.loot;a.age+=dt;a.time-=dt;
 if(Math.abs(p.x-a.x)<Math.max(35,W*.033)&&Math.abs((p.y-45)-(a.y-33))<105)lootCollect();
 else if(a.time<=0){R.loot=null;R.lootClock=0;R.lootNext=13+Math.random()*9}
 return}
 if(R.lootCount>=3)return;R.lootClock+=dt;
 if(p.hp<=35&&!R.heartUsed&&R.lootClock>3){R.heartUsed=true;lootSpawn('heart');return}
 if(R.lootClock>=R.lootNext){let type=p.hp<=55?'heart':p.mana<=45?'crystal':!R.chestEver&&R.area>=1?'chest':(R.lootCount%2?'crystal':'heart');lootSpawn(type)}}
function lootDraw(){if(!R.loot)return;const a=R.loot,img=lootImages[a.type],size=Math.min(82,H*.12),x=a.x-(R.area<4?R.cam:0),y=a.y-38+Math.sin(a.age*4)*5;
 ctx.save();ctx.globalAlpha=Math.min(1,a.time/1.1);ctx.shadowColor='#83edff';ctx.shadowBlur=18;
 ctx.fillStyle='#b9eaff';ctx.beginPath();ctx.ellipse(x,a.y-5,31,7,0,0,Math.PI*2);ctx.fill();
 if(img.complete&&img.naturalWidth){const w=size*img.naturalWidth/img.naturalHeight;ctx.drawImage(img,x-w/2,y-size/2,w,size)}
 else{ctx.fillStyle='#fff';ctx.font='42px sans-serif';ctx.fillText(a.type==='heart'?'❤️':a.type==='chest'?'🎁':'💎',x,y)}
 ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.fillText(Math.ceil(a.time)+'s',x,y-size*.55-5);ctx.restore()}
// REVISAO INDIVIDUAL DO REINO 10 (pendente de teste visual no Windows).
// T1: abaixar o apoio para o piso da passarela; T2: manter o ajuste anterior.
// T3/T4: recuar o heroi no eixo VERTICAL e reduzir levemente sua escala,
// criando profundidade sem deslocar X, nem separar escudo, sprite e hitbox.
// T5: piso proprio da arena; abaixar o apoio sem mexer na arte do castelo.
// Estas proporcoes foram comparadas as cinco artes originais (2048x768,
// 2022x778 e 2023x777), mas nao substituem teste de jogabilidade.
const floorRatiosR10=Object.freeze([.834,.790,.706,.706,.814]);
const heroScaleRatiosR10=Object.freeze([1,1,.89,.89,1]);
// Ajustes locais de apoio em pixels CSS, SEM alterar fisica ou outros reinos:
// T3: +15px, mantendo ajuste anterior; T4: +20px, corrigindo heroi acima
// da passarela na Passagem das Asas Ancestrais; T5: +36px, arena sem passarela.
// T1 e T2 preservados da versao-base. Os atalhos F6, F7 e F8 permanecem ativos.
const territoryFloorCorrectionPxR10=Object.freeze([0,0,15,20,36]);
// Recuo para o interior das passarelas (px CSS); por territorio.
// Menor em T3/T4 para preservar parte dos ajustes locais anteriores.
// Sprite, escudo, pickups e fisica compartilham a mesma ancora do piso.
const walkwayDepthInsetPxR10=Object.freeze([30,30,24,24,18]);
const floor=()=>H*floorRatiosR10[R.area]+territoryFloorCorrectionPxR10[R.area]-walkwayDepthInsetPxR10[R.area];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
window.cm25HeroDepthScale=()=>heroScaleRatiosR10[R.area]||1;
const heroHeight=()=>Math.min(142,H*.225)*window.cm25HeroDepthScale();
// Uma so ancora fisica por territorio; nao deslocar apenas o desenho.
// Assim avatar, escudo e geometria de combate acompanham a mesma posicao.
window.cm25HeroFeetOffset=()=>0;
const feet=()=>floor()+45-heroHeight()/2;
const bossFeet=()=>floor();
// O heroi ja usa coordenadas do mundo; R.cam serve apenas para renderizar.
const getShotAim=m=>({x:p.x,y:p.y-52});
const killMob=m=>{if(m.hp<=0&&m.alive){m.alive=false;score+=120+(m.territory*30);burst(m.x-R.cam,m.y-m.size*.52,'#ffd56b',19)}};
const imageDraw=(im,x,y,w,h)=>{if(im&&im.complete&&im.naturalWidth)ctx.drawImage(im,x,y,w,h)};
function mobFrame(m){return dragon[m.territory][Math.floor(R.clock*8+m.seed)%4]}
// Os dragões patrulham seus setores; somente três fazem investidas simultâneas.
function mobDraw(m){if(!m.alive)return;const im=mobFrame(m);if(!im?.naturalWidth)return;const height=m.size,width=height*im.naturalWidth/im.naturalHeight;
 const dx=m.x-R.cam;if(dx<-width||dx>W+width)return;ctx.save();ctx.globalAlpha=m.hit>0?.7:1;
 // Espelhar dragao jovem em torno de seu centro; o heroi pode estar de qualquer lado.
 ctx.translate(dx,m.y);if(p.x>m.x)ctx.scale(-1,1);
 imageDraw(im,-width/2,-height/2,width,height);ctx.restore();
 ctx.fillStyle='#1d1d2a';ctx.fillRect(dx-26,m.y-height/2-10,52,4);ctx.fillStyle='#79ef63';ctx.fillRect(dx-26,m.y-height/2-10,52*(m.hp/m.max),4)}
function createMob(territory,x,id,bossGuard=false){
 // Dragões já são jovens no desenho: escala de combate (não miniaturas).
 const sizes=[182,188,195,202];
 const size=Math.min(H*.355,sizes[territory]*clamp(H/640,.85,1.18));
 // Quinze dragões mais resistentes em cada território comum; guardiões não mudam.
 const max=bossGuard?120:220+territory*65;
 const anchorY=H*(.30+(id%4)*.085);
 return {territory,x,y:anchorY,baseY:anchorY,size,max,hp:max,alive:true,seed:id*.91,
  speed:(bossGuard?0:72+territory*9),cool:1.1+(id*.2%3),contact:0,hit:0,
  guard:bossGuard, spawned:bossGuard, spawnX:x, swoop:0, vx:0, vy:0, modeTime:.7+id*.16,
   attackUntil:0,restUntil:0};
}
function updateHud(){document.getElementById('ename').textContent=R.area===4?'DRAGÃO DE FOGO':names[R.area];document.getElementById('round').textContent='REINO 10 · TERRITÓRIO '+(R.area+1)+'/5';document.getElementById('stageText').textContent=names[R.area];document.getElementById('difficulty').textContent=R.area===4?'CHEFÃO + QUATRO DRAGÕES GUARDIÕES':'SUBALTERNOS RESTANTES: '+R.mobs.filter(x=>x.alive).length;
 if(R.area<4){const alive=R.mobs.filter(x=>x.alive).length;document.getElementById('ehp').style.width=100*alive/R.mobs.length+'%';}}
function startTerritory(){R.active=true;R.shift=false;R.cleared=false;R.cam=0;R.clock=0;R.jumpV=0;R.jumpHold=false;R.damageGrace=2.0;R.loot=null;R.lootClock=0;R.lootNext=11+Math.random()*4;R.lootCount=0;R.heartUsed=false;R.chestThisTerritory=false;R.projectiles=[];R.mobs=[];R.world=W*4.3;
 window.cm25DragonBoss=R.area===4;
 stages[0]={...stages[9]};
 if(R.area===4){R.bossIntro=.5;boss.max=4510;boss.hp=4510;boss.x=W*.78;boss.y=floor()-Math.min(360,H*.52)*.5;boss.cool=2.55;R.bossShot=3.5;R.world=W;R.bossFollowers=[0,1,2,3].map((t,i)=>{const m=createMob(t,W*(.49+.115*i),i,true);m.size=Math.min(H*.29,155+i*9);m.y=H*(.29+(i%2)*.15);m.baseY=m.y;return m});R.mobs=R.bossFollowers;
  // stageAudio() below uses the ORIGINAL V2.4 dragon track index, never overwrites the boss track.
  playMediaAudio(trilhaFases[9],true,.75);
 }else{const counts=[15,15,15,15];const n=counts[R.area];for(let i=0;i<n;i++){
  // Distribuição uniforme no percurso inteiro: cada inimigo pertence a um trecho.
  // Nunca antecipar a patrulha dos trechos futuros só porque o relógio avançou.
  const x=W*.62+(R.world-W*.92)*(i+.5)/n;
  R.mobs.push(createMob(R.area,x,i));
 }playMediaAudio(trilhaFases[9],true,.67)}
 p.x=W*.18;p.y=feet();p.hp=100;p.mana=100;p.inv=1.2;p.shield=0;p.shieldCd=0;shots=[];bad=[];parts=[];bossDefeated=false;defeatPending=false;superCooldown=0;superUses=0;R.showingDefeat=false;
 updateHud();say('🐉 '+names[R.area],2.2);
}
resetStage=function(){orig.reset();if(stage!==0)return;R.area=0;R.chestEver=false;startTerritory()};
// V2.5 Reino 9: derrota nao perde territorios conquistados.
const cm25Defeat=document.createElement('div');
cm25Defeat.id='cm25defeat';
cm25Defeat.style.cssText='position:fixed;inset:0;z-index:1000001;display:none;align-items:center;justify-content:center;background:rgba(5,9,28,.90);padding:20px;color:white;font-family:Trebuchet MS,Arial;text-align:center';
cm25Defeat.innerHTML='<div style="width:min(540px,94vw);border:3px solid #ffca70;border-radius:22px;padding:30px 22px;background:linear-gradient(150deg,#2a183b,#102d51);box-shadow:0 20px 60px #000c"><div style="font-size:52px">💔</div><h2 style="color:#ffd795">VOCÊ FOI DERROTADO!</h2><p id="cm25defeat-area" style="font-size:19px"></p><p>Você mantém os territórios já conquistados.<br>Deseja tentar novamente este território?</p><button id="cm25defeat-retry" type="button" style="margin-top:14px;border:2px solid #fff0af;border-radius:13px;background:linear-gradient(#ffdc6e,#d98b2b);color:#302011;font:bold 16px Trebuchet MS,Arial;padding:15px 24px;cursor:pointer">TENTAR NOVAMENTE ESTE TERRITÓRIO</button></div>';
(document.body||document.documentElement).appendChild(cm25Defeat);
function showCM25Defeat(){if(R.showingDefeat)return;R.showingDefeat=true;playing=false;paused=true;shots=[];bad=[];R.projectiles=[];
 cm25Defeat.querySelector('#cm25defeat-area').textContent='Reino 10 · Território '+(R.area+1)+' — '+names[R.area];cm25Defeat.style.display='flex';}
cm25Defeat.querySelector('#cm25defeat-retry').addEventListener('click',()=>{cm25Defeat.style.display='none';p.hp=100;p.mana=100;startTerritory();paused=false;playing=true;say('💖 Nova tentativa no território '+(R.area+1)+'!',2.8)});
const originalEndGameDefeat=endGameDefeat;
endGameDefeat=function(){if(stage===0&&R.active){showCM25Defeat();return;}return originalEndGameDefeat()};
// Unificar alvo dos objetos pontudos, sem alterar a escolha de herói ou custo dos disparos.
function closestTarget(){let best=null,dist=Infinity;for(const m of R.mobs){if(!m.alive||(!m.spawned&&!m.guard))continue;const dx=m.x-(p.x),dy=m.y-(p.y-55);const d=Math.hypot(dx,dy);if(d<dist){dist=d;best=m}}return best}
fire=function(power=false){if(stage!==0||!R.active)return orig.fire(power);if(!playing||paused||R.shift)return;
 const oldX=boss.x,oldY=boss.y,first=shots.length,tar=closestTarget();
 if(R.area<4){boss.x=(tar?tar.x:p.x+250);boss.y=tar?tar.y:p.y-45}
 try{orig.fire(power)}finally{boss.x=oldX;boss.y=oldY}
 for(const q of shots.slice(first)){if(R.area===4){q.cmBoss=true;const a=Math.atan2(boss.y-q.y,boss.x-q.x),v=Math.hypot(q.vx,q.vy)||620;q.vx=Math.cos(a)*v;q.vy=Math.sin(a)*v;continue}q.cmMob=true;const cx=tar?tar.x:q.x+500,cy=tar?tar.y:q.y,vel=Math.hypot(q.vx,q.vy);const a=Math.atan2(cy-q.y,cx-q.x);q.vx=Math.cos(a)*vel;q.vy=Math.sin(a)*vel;}
};
function createFire(m,bossFire=false){
 const t=bossFire?(Math.floor(R.clock*1.3)%4):m.territory;
 // Todos os sprites das chamas apontam originalmente para a esquerda.
 // A direção é fixada no instante do tiro, SEM perseguição posterior.
 const heroX=p.x,heroY=p.y-50;
 const fromX=bossFire?boss.x:m.x,fromY=bossFire?boss.y-26:m.y-m.size*.12;
 // O chefão usa sua boca orientada à esquerda como na V2.4.
 // Jovens dragões miram a boca para o lado atual do herói.
 const facing=bossFire?-1:(heroX>=m.x?1:-1);
 const mouthX=fromX+facing*(bossFire?Math.min(360,H*.52)*.36:m.size*.36);
 const mouthY=fromY;
 const rawDx=heroX-mouthX,rawDy=heroY-mouthY;
 const speed=bossFire?275:215+t*16;
 const length=Math.hypot(rawDx,rawDy)||1;
 // O projétil não pode sair pelas costas do dragão.
 // O chefão mantém o lançamento à esquerda; os menores viram junto com o herói.
 if(bossFire&&rawDx>=-8)return;
 const vx=(rawDx/length)*speed,vy=(rawDy/length)*speed;
 const maxShots=bossFire?14:11;
 if(R.projectiles.length>=maxShots)return;
 R.projectiles.push({x:mouthX,y:mouthY,vx,vy,territory:t,frame:0,life:Math.max(1.6,Math.min(5,length/speed+.65)),age:0,
   maxSize:bossFire?Math.min(105,H*.15):Math.min(m.size*.68,78),bossFire});
}
// Proteção ÚNICA para contato e projéteis: o mesmo golpe não pode tirar várias vidas.
// A janela impede dano invisível de ataques quase simultâneos.
function applyDragonDamage(amount,source){
 if(R.damageGrace>0||p.inv>0||p.shield>0||R.shift||R.bossIntro>0&&R.area===4)return false;
 p.hp=Math.max(0,p.hp-amount);
 R.damageGrace=2.0;p.inv=Math.max(p.inv,2.0);
 shake=5;burst(p.x,p.y-40,source==='projetil'?'#ff8b36':'#ffdf8c',10);
 return true;
}
// Colisão global de armas no Reino 10; o corpo do herói não conta como arma.
let cm25WeaponClock=0;
function cm25WeaponContact(dt){
 if(!playing||paused||!R.active)return;
 cm25WeaponClock=Math.max(0,cm25WeaponClock-dt);
 if(cm25WeaponClock>0)return;
 const x=(R.area<4?p.x:p.x),dir=window.cm25Facing||1;
 const hit=window.ClassManaNucleo.weapon.hitbox({heroIdx,p,H,facing:dir});
 for(const m of R.mobs){
  if(!m.alive||(!m.spawned&&!m.guard))continue;
  const dx=m.x-hit.x,dy=m.y-hit.y;
  if(Math.hypot(dx,dy)>hit.radius+m.size*.30)continue;
  m.hp=Math.max(0,m.hp-hit.damage);m.hit=.2;
  cm25WeaponClock=window.ClassManaNucleo.weapon.interval;
  burst(m.x-(R.area<4?R.cam:0),m.y,'#ffe3aa',11);
  if(m.hp<=0)killMob(m);return;
 }
 if(R.area===4&&boss.hp>0&&Math.hypot(boss.x-hit.x,boss.y-hit.y)<hit.radius+Math.min(360,H*.52)*.27){
  const last=boss.hp;
  boss.hp=Math.max(0,boss.hp-Math.max(3,Math.round(hit.damage*.55)));
  if(R.mobs.some(m=>m.alive))boss.hp=Math.max(1,boss.hp);
  cm25WeaponClock=window.ClassManaNucleo.weapon.interval;
  burst(hit.x,hit.y,'#ffc86e',12);
  document.getElementById('ehp').style.width=(100*boss.hp/boss.max)+'%';
  if(last>0&&boss.hp<=0&&!bossDefeated){
    bossDefeated=true;defeatPending=true;defeatDelay=3.4;defeatStage=stage;
    defeatScore=score+1000+stage*250;defeatHp=p.hp;
    boss.cool=Infinity;boss.vx=0;boss.vy=0;boss.dash=0;
    score+=1000+stage*250;
    efeitoClassMana('vitoria',.9,1500);
    burst(boss.x,boss.y,'#ffe06a',65);tone(980,.6,'sine',.12);
  }
 }
}
function projectileUpdate(dt){for(const q of R.projectiles){q.age+=dt;q.frame=Math.min(3,Math.floor(q.age*8));q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;
 const sz=q.maxSize*(.24+.76*q.frame/3);if(q.life>0&&Math.hypot(q.x-(p.x),q.y-(p.y-48))<sz*.19+19){q.life=0;applyDragonDamage(q.bossFire?14:4+R.area,'projetil')}}
 R.projectiles=R.projectiles.filter(q=>q.life>0&&q.x>R.cam-170&&q.x<R.cam+W+170)}
function projectileDraw(){for(const q of R.projectiles){
 const im=projectile[q.territory][q.frame];if(!im.complete||!im.naturalWidth)continue;
 const w=q.maxSize*(.24+.76*q.frame/3),h=w*im.naturalHeight/im.naturalWidth;
 const screenX=q.x-R.cam;
 if(screenX<-w*2||screenX>W+w*2)continue;
 ctx.save();
 ctx.translate(screenX,q.y);
 // Sprites têm ponta à esquerda e rastro à direita.
 // Direita: espelha a arte para a ponta acompanhar vx, sem inverter trajetória.
 if(q.vx>0)ctx.scale(-1,1);
 imageDraw(im,-w*.5,-h*.5,w,h);
 ctx.restore();
}}
// Perseguição baseada no comportamento aprovado dos morcegos (R7)
// e das abelhas (R5): patrulha por setor -> desperta perto do herói ->
// perseguição persistente, mesmo quando o herói passa ou volta para trás.
// Todos os 40 inimigos entram no combate por proximidade, SEM teto de 6.
function mobUpdateBossGuards(dt){
 const step=Math.min(dt,.055);
 const heroX=p.x,heroY=p.y-52;
 for(const m of R.mobs){
  if(!m.alive)continue;
  m.hit=Math.max(0,m.hit-dt);
  m.contact=Math.max(0,m.contact-dt);
  const visible=m.x-R.cam>-m.size&&m.x-R.cam<W+m.size;
  if(!m.guard&&!m.spawned){
   const near=Math.abs(m.x-heroX)<W*.94;
   if(near){
    m.spawned=true;m.modeTime=.55+(m.seed%1.0);
    m.cool=Math.max(.8,m.cool);
   }else{
    // Patrulha real: não deixar 34 dragões congelados em fila.
    const homeX=m.spawnX+Math.sin(R.clock*.95+m.seed)*Math.min(35,W*.04);
    const homeY=clamp(m.baseY+Math.sin(R.clock*1.8+m.seed)*H*.05,
      m.size*.55+12,floor()-m.size*.70);
    m.x+=clamp(homeX-m.x,-72*step,72*step);
    m.y+=clamp(homeY-m.y,-68*step,68*step);
    continue;
   }
  }
  // Uma vez despertado, o dragão nunca retorna ao ponto de origem,
  // nem deixa de perseguir quando o jogador cruza por baixo dele.
  m.modeTime-=step;
  if(m.modeTime<=0){m.swoop=.80;m.modeTime=2.1+(m.seed%1.45);}
  const dive=m.swoop>.08;
  // Formação de ataque em alturas diferentes; o alvo central segue sendo o herói.
  const lane=(Math.floor(m.seed*10)%5)-2;
  const reach=Math.max(38,m.size*(dive?.28:.43));
  const side=m.x<heroX?-1:1;
  const aimX=clamp(heroX+side*reach+lane*Math.max(15,m.size*.13),m.size*.30,R.world-m.size*.30);
  const aimY=clamp(heroY+lane*Math.max(19,H*.036)-(dive?0:H*.095),
    m.size*.52+12,floor()-m.size*.54);
  const dx=aimX-m.x,dy=aimY-m.y,dist=Math.hypot(dx,dy)||1;
  // O herói anda a 250px/s: os dragões precisam ser mais rápidos
  // para conseguirem alcançá-lo de ambos os lados.
  const speed=Math.max(305,m.speed*3.55)*(dive?1.18:1);
  let separateX=0,separateY=0;
  for(const other of R.mobs){
   if(other===m||!other.alive||(!other.spawned&&!other.guard))continue;
   const sx=m.x-other.x,sy=m.y-other.y,space=Math.hypot(sx,sy);
   const minimum=(m.size+other.size)*.40;
   if(space>.1&&space<minimum){
    const power=(minimum-space)/minimum;
    separateX+=(sx/space)*power;separateY+=(sy/space)*power;
   }
  }
  const vx=(dx/dist)*speed+separateX*78;
  const vy=(dy/dist)*speed*.78+separateY*68;
  m.x=clamp(m.x+clamp(vx,-speed*1.18,speed*1.18)*step,m.size*.30,R.world-m.size*.30);
  m.y=clamp(m.y+clamp(vy,-speed*.90,speed*.90)*step,m.size*.52+12,floor()-m.size*.52);
  m.swoop=Math.max(0,m.swoop-step);
  const heroDistance=Math.hypot(m.x-heroX,m.y-heroY);
  if(heroDistance<m.size*.28+32&&m.contact<=0){
   applyDragonDamage(4+R.area,'contato');
   m.contact=1.55;
  }
  m.cool-=step;
  if(m.cool<=0){
   // Disparar só de perto, dentro da tela, com espaço para ver os tiros.
   // Evita que bolas de fogo venham de dragões distantes/invisíveis.
   if(visible&&heroDistance<W*.72&&R.projectiles.length<11){
    createFire(m);
    m.cool=2.9+(m.seed%1.4)+m.territory*.12;
   }else m.cool=.35;
  }
 }
}

// Reino 10 T1-T4: 15 dragões, três investindo por vez em rodízio.
// Os outros patrulham e acompanham à distância, sem se empilharem no herói.
// O chefão/guardiões T5 continuam com a IA que já existia antes desta revisão.
function mobUpdate(dt){
 if(R.area===4)return mobUpdateBossGuards(dt);
 const step=Math.min(dt,.055),heroX=p.x,heroY=p.y-52;
 // Primeiro despertar por proximidade: dragões de regiões futuras não invadem o início.
 for(const m of R.mobs){
  if(!m.alive||m.spawned)continue;
  if(Math.abs(m.x-heroX)<W*.80){
   m.spawned=true;m.cool=Math.max(.65,m.cool);m.modeTime=.6+(m.seed%1.0);
  }
 }
 // Um atacante descansa após cada investida; outros têm oportunidade de entrar.
 let active=0;
 const usedSlots=new Set();
 for(const m of R.mobs){
  if(!m.alive||!m.spawned)continue;
  if(m.attackUntil>0&&m.attackUntil<=R.clock){
   m.attackUntil=0;m.restUntil=R.clock+3.5+(m.seed%1.0);
  }
  if(m.attackUntil>R.clock){active++;usedSlots.add(m.attackSlot);}
 }
 const candidates=R.mobs.filter(m=>m.alive&&m.spawned&&m.attackUntil<=R.clock&&m.restUntil<=R.clock&&
   Math.abs(m.x-heroX)<W*.74);
 candidates.sort((a,b)=>Math.abs(a.x-heroX)-Math.abs(b.x-heroX));
 for(const m of candidates){
  if(active>=3)break;
  m.attackUntil=R.clock+4.6+(m.seed%1.25);
  m.attackSlot=[0,1,2].find(slot=>!usedSlots.has(slot))??0;
  usedSlots.add(m.attackSlot);active++;
 }
 for(const m of R.mobs){
  if(!m.alive)continue;
  m.hit=Math.max(0,m.hit-dt);
  m.contact=Math.max(0,m.contact-dt);
  if(!m.spawned){
   // Patrulha visível e suave do setor, não fica parado mirando bolas de fogo.
   const homeX=m.spawnX+Math.sin(R.clock*.92+m.seed)*Math.min(42,W*.04);
   const homeY=clamp(m.baseY+Math.sin(R.clock*1.65+m.seed)*H*.05,m.size*.55+12,floor()-m.size*.72);
   m.x+=clamp(homeX-m.x,-70*step,70*step);
   m.y+=clamp(homeY-m.y,-65*step,65*step);
   continue;
  }
  const striking=m.attackUntil>R.clock;
  // Escolhe o flanco que tem espaço de voo no mundo; não prende 12 dragões
  // no limite direito/esquerdo da arena quando o herói chega à saída.
  const leftRoom=heroX-m.size*.35,rightRoom=R.world-m.size*.35-heroX;
  let side=m.x<heroX?-1:1;
  if(rightRoom<W*.40&&leftRoom>W*.40)side=-1;
  else if(leftRoom<W*.40&&rightRoom>W*.40)side=1;
  let aimX,aimY,speed;
  if(striking){
   // Três faixas de ataque em diferentes alturas, com distância da boca.
   const slot=m.attackSlot||0;
   const reach=Math.max(155,m.size*.98)+(slot%2)*95;
   aimX=heroX+side*reach;
   aimY=heroY-170+slot*112;
   speed=Math.max(280,m.speed*3.45);
  }else{
   // Formação de espera em grade 5 x 3: distância e altitude próprias para
   // cada um dos 15 dragões, em vez de doze alvos quase idênticos.
   const column=m.id%5,row=Math.floor(m.id/5)%3;
   const hold=W*(.51+column*.16);
   aimX=heroX+side*hold;
   // Se precisar trocar de flanco, passa SOBRE o herói, nunca por cima do corpo.
   const crossing=side<0&&m.x>heroX+W*.18 || side>0&&m.x<heroX-W*.18;
   aimY=crossing?H*.16:H*(.22+row*.20)+Math.sin(R.clock*1.5+m.seed)*H*.014;
   speed=crossing?Math.max(215,m.speed*2.3):Math.max(135,m.speed*1.68);
  }
  aimX=clamp(aimX,m.size*.35,R.world-m.size*.35);
  aimY=clamp(aimY,m.size*.55+10,floor()-m.size*.62);
  const dx=aimX-m.x,dy=aimY-m.y,len=Math.hypot(dx,dy)||1;
  // Repulsão física entre dragões próximos. Mais forte entre os que investem.
  let repelX=0,repelY=0;
  for(const other of R.mobs){
   if(other===m||!other.alive||!other.spawned)continue;
   const ox=m.x-other.x,oy=m.y-other.y,d=Math.hypot(ox,oy);
   const minSep=(m.size+other.size)*(striking?.62:.51);
   if(d>.001&&d<minSep){
    const force=(minSep-d)/minSep;
    repelX+=ox/d*force;repelY+=oy/d*force;
   }
  }
  const steer=1-Math.exp(-step*(striking?3.3:2.6));
  const vx=clamp((dx/len)*speed+repelX*(striking?230:135),-speed*1.05,speed*1.05);
  const vy=clamp((dy/len)*speed*.80+repelY*(striking?210:125),-speed*.9,speed*.9);
  m.x=clamp(m.x+vx*step,m.size*.35,R.world-m.size*.35);
  m.y=clamp(m.y+vy*step,m.size*.55+10,floor()-m.size*.62);
  // Defesa contra sprites sobrepostos: após aproximação, empurra o atacante para
  // fora do espaço do jogador, mantendo o ataque na borda do alcance.
  if(striking){
   const hdx=m.x-heroX,hdy=m.y-heroY,hr=Math.hypot(hdx,hdy)||1;
   const safeHeroDist=Math.max(145,m.size*.88);
   if(hr<safeHeroDist){
    const push=safeHeroDist-hr;
    m.x=clamp(m.x+(hdx/hr)*push,m.size*.35,R.world-m.size*.35);
    m.y=clamp(m.y+(hdy/hr)*push,m.size*.55+10,floor()-m.size*.62);
   }
  }
  const heroDistance=Math.hypot(m.x-heroX,m.y-heroY);
  if(!striking&&heroDistance<W*.34){
   // Reservas dentro da zona do jogador saem por cima e pelo flanco livre,
   // mesmo na borda da arena; somente os três atacantes podem se aproximar.
   m.x=clamp(m.x+side*Math.max(580,m.speed*5.2)*step,m.size*.35,R.world-m.size*.35);
   m.y=clamp(m.y-340*step,H*.15,floor()-m.size*.62);
  }
  if(striking&&heroDistance<m.size*.34+38&&m.contact<=0){
   applyDragonDamage(4+R.area,'contato');
   m.contact=1.55;
  }
  m.cool-=step;
  if(striking&&m.cool<=0){
   const visible=m.x-R.cam>-m.size&&m.x-R.cam<W+m.size;
   if(visible&&heroDistance<W*.70&&R.projectiles.length<6){
    createFire(m);m.cool=3.2+(m.seed%1.3)+m.territory*.15;
   }else m.cool=.45;
  }
 }
}
function mobHitByWeapons(dt){for(const q of shots){if(q.life<=0||q.cmBoss)continue;for(const m of R.mobs){if(!m.alive)continue;const cx=m.x,cy=m.y;const a=q.x-q.vx*dt,b=q.y-q.vy*dt,vx=q.x-a,vy=q.y-b,f=clamp(((cx-a)*vx+(cy-b)*vy)/(vx*vx+vy*vy||1),0,1);if(Math.hypot(a+vx*f-cx,b+vy*f-cy)<m.size*.32+(q.r||12)){q.life=0;m.hp=Math.max(0,m.hp-q.dmg);m.hit=.13;if(m.hp<=0)killMob(m);else burst(m.x-R.cam,cy,'#ffeeaa',5);break}}}
 shots=shots.filter(q=>q.life>0)}
// Chefe: mover os tiros em coordenadas DA TELA, testar impacto por trajetória.
// O update da V2.4 não deve consumir os tiros do herói: só mantém IA, ataques e áudio do chefão.
function bossHeroShots(dt){
 for(const q of shots){if(q.life<=0)continue;
  const x0=q.x,y0=q.y;q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt;
  if(q.life<=0)continue;
  const hit=(x,y,r)=>{const dx=q.x-x0,dy=q.y-y0;const a=clamp(((x-x0)*dx+(y-y0)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x0+a*dx-x,y0+a*dy-y)<=r+(q.r||12)};
  // Os guardiões seguem recebendo dano das armas do jogador.
  let struck=false;
  for(const m of R.bossFollowers){if(!m.alive||!hit(m.x,m.y,m.size*.29))continue;
   q.life=0;m.hp=Math.max(0,m.hp-q.dmg);m.hit=.17;
   burst(q.x,q.y,q.col||'#ffdd88',12);if(m.hp<=0)killMob(m);
   struck=true;break;
  }
  if(struck||bossDefeated)continue;
  // Posição e volume reais do Dragão principal, ampliando a tolerância ao corpo visível.
  if(hit(boss.x,boss.y,Math.min(145,H*.23))){
   q.life=0;boss.hp=Math.max(0,boss.hp-q.dmg);score+=q.dmg;
   document.getElementById('ehp').style.width=(100*boss.hp/boss.max)+'%';
   burst(q.x,q.y,q.col||'#ffd66b',16);shake=4;
   if(boss.hp>0&&!furyUsed&&boss.hp/boss.max<=.30)bossFury();
   if(boss.hp<=0){
    bossDefeated=true;defeatPending=true;defeatDelay=3.4;defeatStage=stage;
    defeatScore=score+1000+stage*250;defeatHp=p.hp;
    boss.cool=Infinity;boss.vx=0;boss.vy=0;boss.dash=0;
    score+=1000+stage*250;efeitoClassMana('vitoria',.9,1500);
    burst(boss.x,boss.y,'#ffe06a',80);tone(980,.6,'sine',.12);
   }
  }
 }
 shots=shots.filter(q=>q.life>0&&q.x>-90&&q.x<W+100&&q.y>-90&&q.y<H+100);
}
function physics(dt){const dx=(keys.ArrowRight||keys.d?1:0)-(keys.ArrowLeft||keys.a?1:0)+joy.x;
 if(dx>0.08)window.cm25Facing=1;else if(dx<-.08)window.cm25Facing=-1;
 const up=!!(keys.ArrowUp||keys.w||joy.y<-.55);
 p.x=clamp(p.x+dx*250*dt,W*.09,R.world-W*.10);
 if(!window.ClassManaNucleo.flight.apply({dt,heroIdx,p,keys,joy,groundY:feet(),ceilingY:H*.26,state:R,velocityKey:'jumpV'})){
  if(up&&!R.jumpHold&&p.y>=feet()-2)R.jumpV=-480;
  R.jumpHold=up;R.jumpV+=570*dt;
  p.y=clamp(p.y+R.jumpV*dt,H*.26,feet());if(p.y>=feet())R.jumpV=0;
 }
 p.inv=Math.max(0,p.inv-dt);p.shield=Math.max(0,p.shield-dt);p.shieldCd=Math.max(0,p.shieldCd-dt);superCooldown=Math.max(0,superCooldown-dt);
 if(manaAutoCountdown!==null){manaAutoCountdown-=dt;if(manaAutoCountdown<=0){manaAutoCountdown=null;askQuestion()}}
}
function toArea(i){R.area=i;startTerritory();R.shift=false;paused=false;playing=true}
function advanceTerritory(){
 if(R.area===3){
  banner('⚠ ATENÇÃO! O CHEFÃO SE APROXIMA!\n🐉 DRAGÃO DE FOGO — BATALHA FINAL',()=>toArea(4),3200);
 }else{
  banner('TERRITÓRIO CONCLUÍDO',()=>toArea(R.area+1));
 }
}
function banner(text,cb,duration=1750){if(R.shift)return;R.shift=true;paused=true;playing=false;const d=document.createElement('div');d.id='r10banner';d.style.cssText='position:fixed;inset:0;z-index:999999;display:grid;place-items:center;background:#070b22ed;color:#ffdb91;text-align:center;white-space:pre-line;padding:24px;font:900 clamp(23px,4vw,42px) Trebuchet MS,Arial';d.textContent=text;document.body.appendChild(d);setTimeout(()=>{d.remove();cb()},duration)}
function defeatInTerritory(){if(p.hp>0||gameEnded)return false;showCM25Defeat();return true;}
update=function(dt){if(stage!==0||!R.active)return orig.update(dt);if(!playing||paused||R.shift)return;
 R.clock+=dt;R.damageGrace=Math.max(0,R.damageGrace-dt);
 if(R.area===4&&R.bossIntro>0){R.bossIntro=Math.max(0,R.bossIntro-dt);elapsedMs+=dt*1000;if(R.bossIntro===0)say('⚔ A BATALHA COMEÇOU! ENFRENTE O DRAGÃO DE FOGO!',3);return;}
 elapsedMs+=dt*1000;document.getElementById('timerHud').textContent='⏳ '+fmtTime(elapsedMs);
 if(R.area<4){physics(dt);lootStep(dt);mobUpdate(dt);cm25WeaponContact(dt);for(const q of shots){if(q.cmMob){q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt}}mobHitByWeapons(dt);projectileUpdate(dt);
 const desired=clamp(p.x-W*.35,0,R.world-W);R.cam+=(desired-R.cam)*Math.min(1,dt*11);
 if(defeatInTerritory())return;const left=R.mobs.filter(m=>m.alive).length;if(left===0&&!R.cleared){R.cleared=true;say('VITÓRIA! AVANCE ATÉ A SAÍDA →',3)}
 if(R.cleared&&p.x>=R.world-W*.20)advanceTerritory();
 }else{
  // Mantenha ataques, efeitos e IA do chefão V2.4; a física do jogador é única
  // para os cinco territórios, sem o bloqueio de x<=56% ou y do jogo antigo.
  const oldKeys={ArrowRight:keys.ArrowRight,ArrowLeft:keys.ArrowLeft,ArrowUp:keys.ArrowUp,ArrowDown:keys.ArrowDown,w:keys.w,a:keys.a,s:keys.s,d:keys.d};
  const oldJoy={x:joy.x,y:joy.y};
  for(const k of Object.keys(oldKeys))keys[k]=false;
  joy.x=0;joy.y=0;
  // O update V2.4 limita p.y a H-80. Essa trava estava cancelando o salto na arena final.
  // Guardar/recuperar APENAS coordenadas do herói permite executar ataques e IA originais.
  const savedPlayerX=p.x,savedPlayerY=p.y;
  const heroShots=shots;
  // Evita que o update original mova/consuma estes projéteis antes de nosso teste de colisão.
  shots=[];
  try{orig.update(dt)}finally{shots=heroShots;Object.assign(keys,oldKeys);joy.x=oldJoy.x;joy.y=oldJoy.y;p.x=savedPlayerX;p.y=savedPlayerY;}
  if(!playing||paused)return;
  physics(dt);lootStep(dt); // permite andar e SALTAR também no território 5
  bossHeroShots(dt);
  R.bossShot-=dt;if(R.bossShot<=0){createFire(null,true);R.bossShot=3.6}
  mobUpdate(dt);cm25WeaponContact(dt);projectileUpdate(dt);
  if(defeatInTerritory())return; // sequência oficial de derrota V2.4
 }
 updateHud();
};
function drawBossEntrance(){if(R.area!==4||R.bossIntro<=0)return;const remain=Math.ceil(R.bossIntro);ctx.save();ctx.fillStyle='rgba(5,13,30,.78)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffe1a0';ctx.shadowColor='#d45d22';ctx.shadowBlur=26;ctx.font='900 '+Math.round(Math.min(51,W*.054))+'px Georgia,serif';ctx.fillText('🐉 PREPARE-SE! 🐉',W*.5,H*.32);ctx.font='900 '+Math.round(Math.min(38,W*.040))+'px Georgia,serif';ctx.fillText('O DRAGÃO DE FOGO ESTÁ CHEGANDO!',W*.5,H*.44);ctx.shadowBlur=0;ctx.font='bold '+Math.round(Math.min(26,W*.032))+'px Arial';ctx.fillText('BATALHA FINAL · '+remain,W*.5,H*.56);ctx.restore()}
function drawBackdrop(){const im=bg[R.area];if(!im.complete||!im.naturalWidth)return;const iw=im.naturalWidth,ih=im.naturalHeight;
 // For roaming backgrounds keep a level floor; translate image horizontally with camera.
 if(R.area<4){const ratio=H/ih,w=iw*ratio;let start=-(R.cam%w);for(let x=start-w;x<W+w;x+=w)ctx.drawImage(im,x,0,w,H)}
 else{const iwRatio=iw/ih,screenRatio=W/H;if(iwRatio>screenRatio){let w=H*iwRatio;ctx.drawImage(im,(W-w)/2,0,w,H)}else{let h=W/iwRatio;ctx.drawImage(im,0,(H-h)/2,W,h)}}
}
drawBackgroundCached=function(stageConfig,bgImage){if(R.active&&R.area===4){drawBackdrop();return;}return orig.background(stageConfig,bgImage)};
draw=function(){if(stage!==0||!R.active)return orig.draw();if(R.area===4){orig.draw();ctx.save();R.mobs.forEach(mobDraw);projectileDraw();lootDraw();ctx.restore();return;}
 ctx.save();drawBackdrop();R.mobs.forEach(mobDraw);
 // Base original hero drawing includes full animation, hero selection and shield.
 const oldX=p.x;p.x-=R.cam;drawHero();p.x=oldX;
 for(const q of shots){if(q.life<=0)continue;const ox=q.x;q.x-=R.cam;drawProjectile(q);q.x=ox}
 projectileDraw();lootDraw();ctx.restore();
};
finishBossDefeat=function(){if(stage!==0||!R.active)return orig.finish();if(R.area===4&&R.mobs.some(m=>m.alive)){boss.hp=Math.max(1,boss.hp);bossDefeated=false;defeatPending=false;say('DERROTE OS QUATRO GUARDIÕES!',2.2);return;}return orig.finish();};
window.addEventListener('keydown',e=>{if(window.ClassManaV25TestMode&&window.parent!==window)return;if(!R.active)return;if(e.code==='F6'||e.code==='F7'){e.preventDefault();e.stopImmediatePropagation();if(e.code==='F7'){if(R.area!==4)banner('⚠ CHEFÃO FINAL\n🐉 DRAGÃO DE FOGO',()=>toArea(4),2300)}else if(R.area===3)advanceTerritory();else toArea((R.area+1)%5)}},true);
const note=document.createElement('div');note.style.cssText='position:fixed;bottom:3px;left:5px;z-index:99990;font:11px Arial;color:#e9eeff;background:#15213aaf;padding:4px 6px;border-radius:5px;pointer-events:none';note.textContent='REINO 10 · V2.5 FINAL · F6 próxima fase · F7 chefão · ↑/W saltar';document.body.appendChild(note);

// == Ponte de integração com o núcleo compartilhado, Reino 10 ==
// Avanço automático de reino após o chefão (quando o módulo realmente concluiu a luta).
const cm25FinishLocal=finishBossDefeat;
let cm25CompletionSent=false;
finishBossDefeat=function(...args){
 const lastArea=4;
 const wasBoss=stage===0&&R.area===lastArea&&!!defeatPending;
 const out=cm25FinishLocal(...args);
 const completed=wasBoss&&(boss.hp<=0&&R.mobs.every(m=>!m.alive));
 if(completed&&!cm25CompletionSent){
   cm25CompletionSent=true;
   window.parent!==window&&window.parent.postMessage({namespace:'CM25',action:'COMPLETE',token:new URLSearchParams(location.search).get('cm25'),realm:10},location.origin);
 }
 return out;
};

window.CM25RealmBridge={
  realm:10,maxTerritories:5,
  status:()=>({realm:10,territory:R.area+1,active:!!R.active,playing:!!playing,monstersLoaded:(R.mobs||[]).length,monstersRemaining:R.total??(R.mobs||[]).length,hero:heroIdx,name:playerName,className:playerClass,score:score}),
  selectArea:(target,profile)=>{
    const i=Math.max(0,Math.min(4,Number(target)||0));
    if(profile){if(Number.isInteger(profile.hero))heroIdx=profile.hero; if(profile.name)playerName=profile.name;if(profile.className)playerClass=profile.className;}
    // Atalhos técnicos: nenhuma pontuação é enviada ao ranking V2.4.
    stage=0;expectedStage=0;
    if(!R.active){orig.reset();}
    // Abertura e vídeo não podem continuar tocando com combate ativo.
    window.ClassManaNucleo?.sairDaAbertura();
    stage=0;gameEnded=false;defeatPending=false;playing=true;paused=false;
    document.body.classList.add('cm25-test-direct');
    if(!document.getElementById('cm25-direct-style')){const st=document.createElement('style');st.id='cm25-direct-style';st.textContent='body.cm25-test-direct #classmanaSplash,body.cm25-test-direct #openingVideo{display:none!important;visibility:hidden!important;pointer-events:none!important;}';document.head.appendChild(st)}
    R.area=i;R.active=true;
    startTerritory();
    try{window.ClassManaNucleo?.audio?.play();}catch(e){console.warn("Áudio do reino",e)}
    if(R.area<4 && (!Array.isArray(R.mobs)||R.mobs.length===0))throw Error('Falha ao criar a horda do território '+(R.area+1));
    for(const id of ['menu','question','tutorial','gameOverOverlay','transition','bonusOverlay','rankingOverlay']){const el=document.getElementById(id);if(el)el.classList.add('hidden')}
    try{setHud()}catch(e){}
    try{window.restoreGameFocus?.()}catch(e){}
    return R.area+1;
  }
};

})();
