/* ClassMana V47 — módulo opcional: Magia Suprema do herói + Modo Espectral dos monstros. */
(()=>{
'use strict';
const cfg=window.CLASSMANA_MAGIA_CONFIG||{};
const api=window.ClassManaUltimateAPI;
if(!cfg.ATIVA||!api)return;
let usedHero=false,spectralDone=false,spectralPending=false,lastStage=-1,lastToken=-1,lastRealm=-1,lastTerritory=-1,effects=[];
const button=document.getElementById('ultimate');
const fx=document.createElement('canvas');fx.id='ultimateFx';Object.assign(fx.style,{position:'fixed',inset:'0',width:'100%',height:'100%',zIndex:'8',pointerEvents:'none'});document.body.appendChild(fx);const x=fx.getContext('2d');
function resize(){const d=Math.min(2,devicePixelRatio||1);fx.width=Math.round(innerWidth*d);fx.height=Math.round(innerHeight*d);x.setTransform(d,0,0,d,0,0)}addEventListener('resize',resize);resize();
const heroColors=['#ff63df','#7ff5ff','#7a6bff','#ffe06a','#a16dff','#ff5a32'];
const monsterColors={ghost:'#efffff',lava:'#ff5425',spider:'#dc62ff',plant:'#69ff91',bee:'#ffd43c',bat:'#b44cff',hydra:'#62ef8a',dragon:'#ff4726'};
function state(){return api.getState()}
function where(){
 try{
  const b=window.CM25RealmBridge,territory=Number(b?.status?.()?.territory)||0,
    max=Number(b?.maxTerritories)||0;
  return {realm:Number(b?.realm)||0,territory,final:max>0&&territory===max};
 }catch(error){return {realm:0,territory:0,final:true}}
}
function resetForStage(s){usedHero=false;spectralDone=false;spectralPending=false;lastStage=s.stage;lastToken=s.sessionToken;updateButton()}
function updateButton(){if(!button)return;const s=state();button.disabled=usedHero||!s.playing||s.paused;button.textContent=usedHero?'[C] ⚡ MAGIA SUPREMA ESGOTADA':`[C] ⚡ MAGIA SUPREMA • -${cfg.CUSTO_PONTOS} pts / -${Math.round(cfg.CUSTO_VIDA_PCT*100)}% HP`}
function flash(color,fromMonster=false){effects.push({start:performance.now(),duration:1500,color,fromMonster,seed:Math.random()*1000});}
function supreme(){const s=state();if(!s.playing||s.paused||s.gameEnded||usedHero)return;if(s.score<cfg.CUSTO_PONTOS){api.say('⚡ MAGIA SUPREMA • você precisa de '+cfg.CUSTO_PONTOS+' pontos!',1.5);return}if(s.playerHp<=20){api.say('⚡ MAGIA SUPREMA • vida muito baixa para usar!',1.5);return}const r=api.heroUltimate(cfg.CUSTO_PONTOS,cfg.CUSTO_VIDA_PCT,cfg.DANO_CHEFE_PCT);if(r&&r.ok){usedHero=true;flash(heroColors[s.heroIdx]||s.hero.col,false);updateButton()}}
if(button)button.addEventListener('click',supreme);
addEventListener('keydown',e=>{if(e.code===cfg.TECLA&&!e.repeat){const tag=document.activeElement?.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag))return;e.preventDefault();supreme()}},{capture:true});
function triggerSpectral(s){
 if(spectralPending||spectralDone)return;
 spectralPending=true;
 api.say('⚠ MODO ESPECTRAL DESPERTANDO • '+s.monster.name+'!',2.1);
 const token=s.sessionToken,stage=s.stage,start=where();
 setTimeout(()=>{
  const n=state(),now=where();spectralPending=false;
  if(n.gameEnded||!n.playing||n.paused||n.sessionToken!==token||n.stage!==stage||
     n.bossHp<=1||now.realm!==start.realm||now.territory!==start.territory)return;
  const dmg=Math.min(.28,cfg.ESPECTRAL_DANO_BASE+stage*cfg.ESPECTRAL_DANO_POR_FASE);
  const result=api.monsterSpectral(dmg);
  if(result?.ok){spectralDone=true;flash(monsterColors[n.monster.kind]||'#ffffff',true);}
  updateButton();
 },cfg.ESPECTRAL_ATRASO_MS);
}
function monitor(){
 const s=state(),pos=where();
 // V2.5 usa stage=0 nos 49 territorios: resetar por territorio real.
 if(s.stage!==lastStage||s.sessionToken!==lastToken||pos.realm!==lastRealm||pos.territory!==lastTerritory){
  resetForStage(s);lastRealm=pos.realm;lastTerritory=pos.territory;
 }
 // Nao disparar Modo Espectral de um chefe invisivel durante as hordas.
 if(cfg.ESPECTRAL_ATIVO&&(pos.realm===0||pos.final)&&s.playing&&!s.paused&&!s.gameEnded&&!spectralDone&&!spectralPending&&s.bossMax>0&&s.bossHp/s.bossMax<=cfg.ESPECTRAL_LIMIAR)triggerSpectral(s);
 updateButton();requestAnimationFrame(monitor);
}
function lightningPath(cx,top,bottom,seed,tick,width,color,alpha){
  x.save();x.globalCompositeOperation='screen';x.globalAlpha=alpha;x.strokeStyle=color;x.lineWidth=width;x.lineCap='round';x.lineJoin='round';x.shadowColor=color;x.shadowBlur=width*4;
  x.beginPath();x.moveTo(cx,top);let seg=11;for(let j=1;j<=seg;j++){let yy=top+(bottom-top)*j/seg;let jitter=Math.sin(seed*1.73+j*8.17+tick*19)*14+Math.sin(seed*.91+j*3.7+tick*31)*7;x.lineTo(cx+jitter,yy)}x.stroke();x.restore();
}
function impact(cx,cy,color,power){x.save();x.globalCompositeOperation='screen';let g=x.createRadialGradient(cx,cy,0,cx,cy,85*power);g.addColorStop(0,'rgba(255,255,255,.98)');g.addColorStop(.16,color);g.addColorStop(.55,color);g.addColorStop(1,'rgba(0,0,0,0)');x.globalAlpha=.75;x.fillStyle=g;x.beginPath();x.arc(cx,cy,85*power,0,Math.PI*2);x.fill();x.restore()}
function render(now){x.clearRect(0,0,innerWidth,innerHeight);effects=effects.filter(e=>now-e.start<e.duration);for(const e of effects){let t=(now-e.start)/e.duration;x.save();x.globalAlpha=.16*Math.sin(Math.PI*Math.min(1,t));x.fillStyle='#061126';x.fillRect(0,0,innerWidth,innerHeight);x.restore();let zoneMin=e.fromMonster?innerWidth*.08:innerWidth*.57,zoneMax=e.fromMonster?innerWidth*.47:innerWidth*.94;let ground=innerHeight*.78;for(let i=0;i<7;i++){let begin=.06+i*.075,end=begin+.34;if(t<begin||t>end)continue;let u=(t-begin)/(end-begin),pulse=Math.sin(Math.PI*u),cx=zoneMin+(zoneMax-zoneMin)*(i+.5)/7+Math.sin(e.seed+i*9.3)*18;let bottom=ground+Math.sin(i*2.4)*30;lightningPath(cx,-25,bottom,e.seed+i*13,t,16,e.color,.24*pulse);lightningPath(cx,-25,bottom,e.seed+i*13,t,7,e.color,.90*pulse);lightningPath(cx,-25,bottom,e.seed+i*13,t,2.4,'#ffffff',1*pulse);if(u>.48)impact(cx,bottom,e.color,Math.max(.35,pulse));if(i%2===0&&u>.25){let bx=cx+Math.sin(e.seed+i)*42;lightningPath(cx,innerHeight*.30,bottom*.72,e.seed+i*23,t,2.2,e.color,.65*pulse);lightningPath(bx,innerHeight*.45,bottom,e.seed+i*31,t,1.5,'#ffffff',.65*pulse)}}if(t>.62&&t<.88){let p=Math.sin((t-.62)/.26*Math.PI);x.save();x.globalCompositeOperation='screen';x.globalAlpha=.18*p;x.fillStyle=e.color;x.fillRect(0,0,innerWidth,innerHeight);x.restore()}}requestAnimationFrame(render)}
requestAnimationFrame(monitor);requestAnimationFrame(render);updateButton();
})();
