"use strict";

// Mundo 1 usa o loop Canvas original, agora com mapas próprios e colisão em todos os lados.
const VIEW={w:960,h:540}, PHYS={gravity:1580,speed:285,jump:575};
const RULES={normal:{lives:3,safe:false},test:{lives:Infinity,safe:true}};
const FORMS={ninja:{name:"Ninja",color:"#7658dc",hint:"pulo triplo e investida"},warrior:{name:"Guerreiro",color:"#d25243",hint:"quebra blocos rachados"},archer:{name:"Arqueiro",color:"#3f9a71",hint:"flechas derrotam criaturas"}};
const DIFFICULTY={easy:{hits:8,rate:.9},normal:{hits:12,rate:1},hard:{hits:16,rate:1.18}};
const SAVE="pixel-adventure-world-1-progress-v3";
const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
const modeEl=document.querySelector("#modeSelect"),difficultyEl=document.querySelector("#difficultySelect"),stageEl=document.querySelector("#stageSelect"),toastEl=document.querySelector("#toast"),logEl=document.querySelector("#damageLog"),countEl=document.querySelector("#damageCount");
const keys={left:false,right:false,jump:false,action:false};
const game={mode:"normal",difficulty:"normal",time:0,camera:0,toast:0,events:[],finished:false,transition:0,paused:false,score:0,progress:readSave()};
const hero={x:86,y:220,w:32,h:48,vx:0,vy:0,face:1,onGround:false,jumps:0,lives:3,form:null,hurt:0,action:0,dash:0,spawnX:86,spawnY:220};
let level,solids,hazards,enemies,masks,secrets,blocks,arrows,checkpoint,portal,boss;

const r=(x,y,w,h)=>({x,y,w,h});
// Cada fase foi desenhada de forma independente; altura e paredes são obstáculos físicos.
const LEVELS=[
 {id:1,name:"01 · Colinas Azuis",theme:"hills",width:2550,intro:"A/D move · Espaço pula · X usa a habilidade da máscara.",
  solids:[r(0,476,560,64),r(760,476,470,64),r(1450,476,470,64),r(2140,476,410,64),r(180,402,180,74),r(440,350,160,126),r(720,410,150,66),r(930,330,170,146),r(1210,390,130,86),r(1510,350,180,126),r(1840,410,170,66),r(2150,340,190,136)],
  hazards:[r(635,454,55,22),r(1400,454,60,22),r(2050,454,55,22)], enemies:[{x:785},{x:1280},{x:1900},{x:2240},{x:660},{x:1040},{x:1510},{x:1985}], masks:[{x:486,y:302,type:"ninja",label:"Máscara Ninja"},{x:1050,y:282,type:"ninja",secret:true,label:"Ninho alto"}], secrets:[r(1010,396,70,80)], checkpoint:{x:1470,y:428},portal:r(2440,394,30,82),platforms:[r(540,385,78,18),r(650,315,54,18),r(755,250,92,18),r(900,330,48,18),r(1010,265,68,18),r(1120,205,52,18),r(1240,300,82,18),r(1360,235,48,18),r(1480,175,76,18),r(1610,270,52,18),r(1730,205,90,18),r(1880,300,48,18),r(1980,235,70,18),r(2080,170,50,18),r(2200,260,86,18),r(2320,200,48,18)],crumble:[r(650,315,54,18),r(1010,265,68,18),r(1480,175,76,18),r(1880,300,48,18),r(2200,260,86,18)]},
 {id:2,name:"02 · Bosque Sombrio",theme:"woods",width:2750,intro:"Ruínas fecham caminhos: não atravesse as paredes — encontre o caminho alto.",
  solids:[r(0,476,330,64),r(520,476,520,64),r(1210,476,420,64),r(1810,476,390,64),r(2380,476,370,64),r(250,320,55,156),r(305,370,180,106),r(590,290,70,186),r(660,350,220,126),r(955,250,65,226),r(1020,390,155,86),r(1290,330,210,146),r(1580,250,75,226),r(1655,400,165,76),r(1900,340,120,136),r(2100,270,65,206),r(2165,370,210,106),r(2460,320,150,156)],
  hazards:[r(500,454,58,22),r(1190,454,60,22),r(1840,454,45,22)], enemies:[{x:400},{x:740},{x:1350},{x:1980},{x:2300},{x:570},{x:910},{x:1430},{x:1905},{x:2185}], masks:[{x:1328,y:282,type:"warrior",secret:true,label:"Máscara Guerreiro"},{x:1740,y:352,type:"ninja",label:"Máscara Ninja"}], secrets:[r(1260,376,62,100)], checkpoint:{x:1510,y:428},portal:r(2660,394,30,82),platforms:[r(350,300,62,18),r(450,235,48,18),r(560,175,80,18),r(690,260,52,18),r(800,195,44,18),r(910,135,82,18),r(1050,280,54,18),r(1160,215,48,18),r(1270,155,76,18),r(1400,235,50,18),r(1510,170,44,18),r(1640,280,80,18),r(1780,215,48,18),r(1900,150,76,18),r(2050,240,48,18),r(2180,175,84,18),r(2350,260,52,18),r(2470,195,70,18)],crumble:[r(450,235,48,18),r(800,195,44,18),r(1160,215,48,18),r(1510,170,44,18),r(1900,150,76,18),r(2180,175,84,18)]},
 {id:3,name:"03 · Rio Perdido",theme:"river",width:2900,intro:"A correnteza devolve ao checkpoint. Use ilhas e pontes; o Arqueiro está atrás da cachoeira.",
  solids:[r(0,476,420,64),r(700,476,220,64),r(1170,476,190,64),r(1600,476,180,64),r(2010,476,360,64),r(2500,476,400,64),r(300,370,120,106),r(610,390,90,150),r(830,325,100,151),r(1070,350,100,126),r(1320,290,95,186),r(1500,370,100,106),r(1770,310,80,166),r(1940,355,70,121),r(2200,315,120,161),r(2480,350,120,126)],
  water:[r(560,474,140,66),r(1010,474,160,66),r(1450,474,150,66),r(1850,474,160,66)], hazards:[], enemies:[{x:870},{x:1360},{x:1780},{x:2260},{x:650},{x:980},{x:1490},{x:2115},{x:2515}], masks:[{x:1338,y:242,type:"archer",secret:true,label:"Máscara Arqueiro"},{x:2525,y:302,type:"ninja",label:"Máscara Ninja"}], secrets:[r(1280,340,45,136)], checkpoint:{x:2070,y:428},portal:r(2810,394,30,82),platforms:[r(420,350,60,18),r(520,285,48,18),r(620,220,72,18),r(760,300,48,18),r(870,235,60,18),r(980,170,46,18),r(1110,250,76,18),r(1240,185,48,18),r(1360,120,70,18),r(1490,285,48,18),r(1600,220,58,18),r(1720,155,46,18),r(1850,240,70,18),r(1980,175,48,18),r(2110,110,78,18),r(2260,245,50,18),r(2380,180,70,18),r(2520,115,48,18),r(2640,260,78,18)],crumble:[r(520,285,48,18),r(870,235,60,18),r(1240,185,48,18),r(1600,220,58,18),r(1980,175,48,18),r(2380,180,70,18)]},
 {id:4,name:"04 · Ruínas da Floresta",theme:"ruins",width:3050,intro:"Blocos rachados são paredes reais. O Guerreiro abre atalhos opcionais.",
  solids:[r(0,476,430,64),r(620,476,500,64),r(1320,476,410,64),r(1930,476,420,64),r(2470,476,580,64),r(200,340,180,136),r(500,290,70,186),r(570,360,210,116),r(910,320,110,156),r(1100,260,70,216),r(1170,385,170,91),r(1550,310,180,166),r(1830,250,65,226),r(1895,370,205,106),r(2260,300,190,176),r(2650,335,180,141)],
  blocks:[r(785,380,46,96),r(831,380,46,96),r(1340,400,48,76),r(2100,380,48,96),r(2148,380,48,96)], hazards:[r(420,454,55,22),r(1450,454,65,22),r(2510,454,55,22)], enemies:[{x:630},{x:1220},{x:1640},{x:2340},{x:2750},{x:680},{x:1040},{x:1430},{x:2020},{x:2450}], masks:[{x:625,y:312,type:"warrior",label:"Máscara Guerreiro"},{x:2285,y:252,type:"archer",secret:true,label:"Máscara Arqueiro"}], secrets:[r(2100,292,96,84)], checkpoint:{x:1900,y:428},portal:r(2940,394,30,82),platforms:[r(430,290,54,18),r(540,225,72,18),r(680,155,48,18),r(800,245,58,18),r(920,180,44,18),r(1040,115,76,18),r(1170,285,52,18),r(1290,220,70,18),r(1430,150,46,18),r(1760,270,72,18),r(1880,205,48,18),r(2020,140,78,18),r(2180,245,48,18),r(2300,180,72,18),r(2450,115,50,18),r(2580,250,78,18),r(2730,185,50,18)],crumble:[r(540,225,72,18),r(920,180,44,18),r(1290,220,70,18),r(1880,205,48,18),r(2300,180,72,18),r(2580,250,78,18)]},
 {id:5,name:"05 · Covil da Criatura",theme:"lair",width:1900,intro:"Pegue a máscara Arqueiro e avance até a arena. A câmera será travada durante a batalha.",
  solids:[r(0,476,1900,64),r(330,370,150,106),r(580,300,140,176),r(1180,300,140,176),r(1420,370,150,106)], hazards:[], enemies:[], masks:[{x:210,y:428,type:"archer",label:"Máscara Arqueiro — entrada da arena"}], secrets:[r(70,400,60,76)], checkpoint:{x:130,y:428},portal:r(1780,394,30,82),boss:true}
];

function readSave(){try{return{unlocked:1,cleared:[],...JSON.parse(localStorage.getItem(SAVE)||"{}")};}catch(_){return{unlocked:1,cleared:[]};}}
function save(){localStorage.setItem(SAVE,JSON.stringify(game.progress));fillStages();}
const clone=a=>JSON.parse(JSON.stringify(a||[]));
function fillStages(){stageEl.innerHTML=LEVELS.map(l=>`<option value="${l.id}" ${l.id>game.progress.unlocked?"disabled":""}>${l.name}${l.id>game.progress.unlocked?" · bloqueada":""}</option>`).join("");if(level)stageEl.value=level.id;}
function loadLevel(id,keepLives=false){game.paused=false;const pauseBtn=document.querySelector("#pauseButton");if(pauseBtn)pauseBtn.textContent="Pausar · P / ESC";level=LEVELS[id-1];solids=clone(level.solids);(level.platforms||[]).forEach((p,i)=>solids.push({...clone([p])[0],platform:true,crumble:(level.crumble||[]).some(c=>c.x===p.x&&c.y===p.y),crumbleState:"stable",crumbleTimer:0}));hazards=clone(level.hazards).map(h=>({...h,type:"espinhos",source:"Armadilha"}));if(level.water)hazards.push(...clone(level.water).map(h=>({...h,type:"correnteza",source:"Rio Perdido"})));blocks=clone(level.blocks).map(b=>({...b,broken:false}));enemies=clone(level.enemies).map((e,i)=>{const isBoar=level.id===1&&(i===0||i===2||i===3),w=isBoar?42:28,h=34;const support=solids.filter(s=>e.x+w>s.x&&e.x<s.x+s.w&&s.y>=100&&s.y<476).sort((a,b)=>a.y-b.y)[0];const floorY=support?support.y:476;return{x:e.x,y:floorY-h,w,h,min:support?Math.max(support.x+2,e.x-48):e.x-72,max:support?Math.min(support.x+support.w-w-2,e.x+48):e.x+92,dir:i%2?1:-1,speed:55+i*8,dead:false,type:isBoar?"boar":"generic",state:"patrol",timer:0,stun:0,hp:1};});masks=clone(level.masks).map(m=>({...m,w:26,h:28,taken:false}));secrets=clone(level.secrets).map(s=>({...s,found:false}));arrows=[];checkpoint={...level.checkpoint,on:false};portal={...level.portal};boss=level.boss?{x:1650,y:306,w:125,h:170,hp:DIFFICULTY[game.difficulty].hits,max:DIFFICULTY[game.difficulty].hits,state:"intro",timer:1.4,phase:0,core:false,dead:false,hit:0,arenaActive:false,arenaCamera:800,arenaLeft:820,arenaRight:1595,target:{x:1120,y:330,w:30,h:30,active:false},targetIndex:-1,mask:{x:520,y:428,w:26,h:28,type:"archer",taken:true,active:false,phase:"collected",timer:0}}:null;Object.assign(hero,{x:86,y:220,vx:0,vy:0,jumps:0,form:null,hurt:0,action:0,dash:0});game.camera=0;game.finished=false;game.transition=0;if(!keepLives){hero.lives=RULES[game.mode].lives;game.events=[];game.score=0;renderLog();}notice(level.intro);fillStages();}
function notice(t){toastEl.textContent=t;game.toast=3;toastEl.classList.add("show");}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function colliders(){const list=solids.filter(s=>!(s.platform&&s.crumbleState==="gone")).concat(blocks.filter(b=>!b.broken));if(boss&&boss.arenaActive&&!boss.dead)list.push({x:boss.arenaRight,y:0,w:80,h:540});return list;}
function report(type,source){game.events.unshift({type,source,at:Math.floor(game.time)});renderLog();}
function renderLog(){countEl.textContent=`${game.events.length} ${game.events.length===1?"evento":"eventos"}`;logEl.innerHTML=game.events.length?game.events.slice(0,12).map(e=>`<li>${e.type} · ${e.source} <small>(${String(Math.floor(e.at/60)).padStart(2,"0")}:${String(e.at%60).padStart(2,"0")})</small></li>`).join(""):'<li class="empty">Nenhum dano registrado.</li>';}
function damage(type,source){
  if(hero.hurt>0||game.finished)return;
  report(type,source);hero.hurt=1.0;
  if(RULES[game.mode].safe){notice(`Dano registrado: ${type}`);return;}
  if(hero.form){
    const lost=hero.form;hero.form=null;hero.vy=-250;
    if(boss&&!boss.dead&&lost==="archer"){
      boss.mask.phase="hidden";boss.mask.active=false;boss.mask.timer=6;
      notice("Máscara perdida! Sobreviva por 6 segundos.");
    }else notice("Transformação perdida!");
    return;
  }
  if(--hero.lives<=0){hero.lives=0;game.finished=true;notice("GAME OVER — pressione Recomeçar");return;}
  respawn();notice(`Vida perdida! Restam ${hero.lives}`);
}
function respawn(){hero.x=checkpoint.on?checkpoint.x+18:hero.spawnX;hero.y=checkpoint.on?checkpoint.y:hero.spawnY;hero.x=Math.max(0,Math.min(level.width-hero.w,hero.x));hero.vx=hero.vy=0;hero.form=null;hero.hurt=1.25;}
function resolveX(){for(const s of colliders())if(overlap(hero,s)){if(hero.vx>0)hero.x=s.x-hero.w;else if(hero.vx<0)hero.x=s.x+s.w;hero.vx=0;}}
function resolveY(previousBottom){hero.onGround=false;for(const s of colliders())if(!(s.platform&&s.crumbleState==="gone")&&overlap(hero,s)){if(hero.vy>=0&&previousBottom<=s.y+8){hero.y=s.y-hero.h;hero.vy=0;hero.onGround=true;hero.jumps=0;if(s.crumble&&s.crumbleState==="stable"){s.crumbleState="shaking";s.crumbleTimer=.72;}}else if(hero.vy<0){hero.y=s.y+s.h;hero.vy=0;}}}
function useAction(){
  if(hero.action>0)return;hero.action=.22;
  const reach={x:hero.x+(hero.face>0?hero.w:-32),y:hero.y+8,w:32,h:30};
  if(hero.form==="ninja"){hero.dash=.22;hero.vx=hero.face*610;notice("Investida Ninja!");}
  if(hero.form==="warrior")blocks.forEach(b=>{if(!b.broken&&overlap(reach,b)){b.broken=true;notice("Parede rachada destruída!");}});
  if(hero.form==="archer"){
    const aimingDown=keys.down===true,aimingUp=keys.up===true||keys.jump===true;
    const shotY=aimingUp?hero.y+5:hero.y+hero.h*.48;
    const shotVy=aimingDown?42:aimingUp?-150:0;
    arrows.push({x:hero.x+(hero.face>0?hero.w:0),y:shotY,w:20,h:6,vx:hero.face*650,vy:shotVy,ttl:2.4,enemy:false});
  }
}
function hurtBoss(){if(boss.hit>0)return;boss.hit=.45;boss.hp--;boss.state=boss.hp?"hurt":"defeated";boss.timer=boss.hp?.55:2.0;notice(boss.hp?"Núcleo atingido!":"Guardião derrotado!");}
function chooseBossTarget(){
  const points=[
    {x:760,y:245},{x:1010,y:245},{x:780,y:440},{x:1080,y:440},
    {x:1260,y:270},{x:920,y:440}
  ];
  let next=Math.floor(Math.random()*points.length);
  if(points.length>1&&next===boss.targetIndex)next=(next+1+Math.floor(Math.random()*(points.length-1)))%points.length;
  boss.targetIndex=next;
  Object.assign(boss.target,points[next],{w:30,h:30,active:true});
}
function spawnBossSpikes(){
  const x=Math.max(390,Math.min(1380,hero.x-70+Math.random()*140));
  hazards.push({x,y:454,w:72,h:22,type:"espinhos-chefe",source:"Espinhos do Guardião",warning:1.25,active:false,duration:1.15,ttl:0});
  notice("ALERTA: rachaduras no chão! Afaste-se!");
}
function spawnFallingRocks(){
  const lanes=[930,1060,1190,1320,1450],selected=[];
  while(selected.length<3){const lane=lanes[Math.floor(Math.random()*lanes.length)];if(!selected.includes(lane))selected.push(lane);}
  selected.forEach((x,i)=>hazards.push({x:x-14,y:82,w:28,h:28,type:"pedra-caindo",source:"Pedra lançada pelo Guardião",warning:.48+i*.09,active:false,duration:2.4,ttl:0,vy:0}));
  notice("O GUARDIÃO LANÇOU PEDRAS! Observe as marcas vermelhas no chão.");
}
function updateBoss(dt){
  if(!boss||boss.dead||!boss.arenaActive)return;
  // Ciclo da máscara: 6s escondida, 3s disponível, depois repete em outro ponto.
  if(boss.mask.phase==="hidden"){
    boss.mask.timer-=dt;
    if(boss.mask.timer<=0){
      const spots=[{x:840,y:428},{x:960,y:428},{x:1080,y:428},{x:1335,y:428},{x:1380,y:428}];
      let pick=Math.floor(Math.random()*spots.length);
      if(boss.mask.last===pick)pick=(pick+1)%spots.length;
      boss.mask.last=pick;Object.assign(boss.mask,spots[pick]);
      boss.mask.phase="visible";boss.mask.active=true;boss.mask.timer=4.5;
      notice("Máscara Arqueiro disponível! Você tem 4,5 segundos.");
    }
  }else if(boss.mask.phase==="visible"){
    boss.mask.timer-=dt;
    if(boss.mask.timer<=0){
      boss.mask.phase="hidden";boss.mask.active=false;boss.mask.timer=4.5;
      notice("A máscara desapareceu. Nova posição em 4,5 segundos.");
    }
  }
  boss.timer-=dt;if(boss.hit>0)boss.hit-=dt;
  const rate=DIFFICULTY[game.difficulty].rate;
  if(boss.state==="intro"&&boss.timer<=0){boss.state="attack";boss.timer=.32;notice("Guardião da Floresta despertou!");}
  else if(boss.state==="attack"&&boss.timer<=0){
    const cycle=boss.phase%5;
    if(cycle===0){
      const x=Math.max(360,Math.min(1380,hero.x-55));
      hazards.push({x,y:454,w:110,h:22,type:"raízes",source:"Raízes do Guardião",warning:.9,active:false,duration:1.15,ttl:0});
      notice("ALERTA: raízes surgindo no chão!");
    }else if(cycle===1)spawnBossSpikes();
    else if(cycle===2)spawnFallingRocks();
    else if(cycle===3){
      for(let i=0;i<3;i++)arrows.push({x:boss.x+35,y:boss.y+55,w:13,h:13,vx:(hero.x-boss.x)*.35+i*35,vy:-160+i*45,enemy:true,ttl:3});
      notice("Sementes lançadas pelo Guardião!");
    }else{
      const startX=boss.x+8, startY=382;
      const dx=(hero.x+hero.w/2)-(startX+29);
      const flight=Math.max(.55,Math.min(1.15,Math.abs(dx)/430));
      hazards.push({x:startX,y:startY,w:62,h:54,type:"pedra-grande",source:"Pedra arremessada pelo Guardião",warning:.62,active:false,duration:3.4,ttl:0,vx:dx/flight,vy:-430});
      notice("O GUARDIÃO ARREMESSOU UMA PEDRA GIGANTE! SALTE OU DESVIE!");
    }
    boss.phase++;
    boss.state="recovery";boss.timer=.28/rate;
  }else if(boss.state==="recovery"&&boss.timer<=0){
    boss.state="vulnerable";boss.core=true;chooseBossTarget();boss.timer=1.8/rate;
    notice("ALVO DISTANTE EXPOSTO! Use a máscara Arqueiro.");
  }else if(boss.state==="vulnerable"&&boss.timer<=0){
    boss.core=false;boss.target.active=false;boss.state="attack";boss.timer=.28/rate;
  }else if(boss.state==="hurt"&&boss.timer<=0){
    boss.core=false;boss.target.active=false;boss.state="attack";boss.timer=.38/rate;
  }else if(boss.state==="defeated"&&boss.timer<=0){
    boss.dead=true;boss.target.active=false;game.finished=true;
    game.progress.cleared=[...new Set([...game.progress.cleared,5])];save();
    notice("Mundo 1 concluído! A floresta foi libertada.");
  }
}
function update(dt){if(game.paused)return;game.time+=dt;if(game.toast>0&&(game.toast-=dt)<=0)toastEl.classList.remove("show");if(game.transition>0){if((game.transition-=dt)<=0)loadLevel(level.id+1,true);return;}enemies.forEach(e=>{
  if(e.dead)return;
  if(e.type!=="boar"){
    e.x+=e.dir*e.speed*dt;
    if(e.x<e.min||e.x>e.max){e.dir*=-1;e.x=Math.max(e.min,Math.min(e.max,e.x));}
    return;
  }
  if(e.stun>0){e.stun-=dt;if(e.stun<=0){e.state="patrol";e.timer=0;}return;}
  if(e.state==="prepare"){
    e.timer-=dt;
    if(e.timer<=0){e.state="charge";e.dir=hero.x+hero.w/2<e.x+e.w/2?-1:1;e.timer=1.35;}
    return;
  }
  if(e.state==="charge"){
    const nextX=e.x+e.dir*390*dt;
    const wall=solids.some(w=>{const verticalOverlap=e.y+e.h>w.y+5&&e.y<w.y+w.h-5;const faceHit=e.dir>0?(e.x+e.w<=w.x+4&&nextX+e.w>w.x):(e.x>=w.x+w.w-4&&nextX<w.x+w.w);return verticalOverlap&&faceHit;});
    e.x=nextX;e.timer-=dt;
    if(wall||e.x<e.min-90||e.x>e.max+110||e.timer<=0){
      e.x=Math.max(e.min-90,Math.min(e.max+110,e.x));e.state="stunned";e.stun=1.35;e.vulnerable=true;
    }
    return;
  }
  e.x+=e.dir*e.speed*dt;
  if(e.x<e.min||e.x>e.max){e.dir*=-1;e.x=Math.max(e.min,Math.min(e.max,e.x));}
  const distance=Math.abs((hero.x+hero.w/2)-(e.x+e.w/2));
  if(distance<205&&Math.abs(hero.y-e.y)<100){e.state="prepare";e.timer=.72;}
});solids.forEach(s=>{if(!s.crumble)return;if(s.crumbleState==="shaking"){s.crumbleTimer-=dt;if(s.crumbleTimer<=0){s.crumbleState="gone";s.crumbleTimer=2.6;}}else if(s.crumbleState==="gone"){s.crumbleTimer-=dt;if(s.crumbleTimer<=0){s.crumbleState="rebuilding";s.crumbleTimer=.45;}}else if(s.crumbleState==="rebuilding"){s.crumbleTimer-=dt;if(s.crumbleTimer<=0)s.crumbleState="stable";}});hazards=hazards.filter(h=>{
  if(h.warning>0){h.warning-=dt;if(h.warning<=0){h.active=true;h.ttl=h.duration||1;}}
  else if(h.active&&h.ttl!=null){h.ttl-=dt;if(h.type==="pedra-caindo"){h.vy=(h.vy||0)+PHYS.gravity*1.35*dt;h.y+=h.vy*dt;}if(h.type==="pedra-grande"){h.vy=(h.vy||0)+PHYS.gravity*.62*dt;h.x+=h.vx*dt;h.y+=h.vy*dt;}if(h.ttl<=0||h.y>540)return false;}
  return true;
});arrows=arrows.filter(a=>{if(a.enemy){a.vy+=PHYS.gravity*.42*dt;a.y+=a.vy*dt;}a.x+=a.vx*dt;a.ttl-=dt;return a.ttl>0&&a.x>-40&&a.x<level.width+40&&a.y<580;});updateBoss(dt);if(game.finished)return;if(hero.hurt>0)hero.hurt-=dt;if(hero.action>0)hero.action-=dt;if(hero.dash>0)hero.dash-=dt;let direction=Number(keys.right)-Number(keys.left);if(hero.dash>0){if(direction){hero.face=direction;hero.vx=direction*610;}}else{if(direction){hero.face=direction;hero.vx+=(direction*PHYS.speed-hero.vx)*Math.min(1,dt*13);}else{hero.vx*=Math.max(0,1-dt*10);}}if(keys.jump){const allowed=hero.form==="ninja"?3:2;if(hero.onGround||hero.jumps<allowed){hero.vy=-PHYS.jump;hero.jumps++;hero.onGround=false;}keys.jump=false;}if(keys.action){useAction();keys.action=false;}hero.vy+=PHYS.gravity*dt;hero.x+=hero.vx*dt;resolveX();const oldBottom=hero.y+hero.h;hero.y+=hero.vy*dt;resolveY(oldBottom);if(hero.y>660){damage(level.theme==="river"?"correnteza":"queda",level.theme==="river"?"Rio Perdido":"Abismo");if(RULES[game.mode].safe)respawn();}const body={x:hero.x+4,y:hero.y+4,w:hero.w-8,h:hero.h-5};hazards.forEach(h=>{const active=(h.warning===undefined||h.warning<=0)&&(h.active===undefined||h.active);if(active&&overlap(body,h))damage(h.type,h.source);});enemies.forEach(e=>{
  if(e.dead||!overlap(body,e))return;
  const stomp=hero.vy>80&&oldBottom<=e.y+13;
  if(stomp){
    e.hp--;hero.vy=-390;hero.jumps=Math.max(0,hero.jumps-1);
    if(e.hp<=0){e.dead=true;game.score+=200;notice(e.type==="boar"?"Javali derrotado! +200 pontos":"Criatura derrotada!");}
    else {e.state="stunned";e.stun=.8;}
  }else if(!(e.type==="boar"&&e.state==="stunned"))damage("colisão",e.type==="boar"?"Javali Selvagem":"Criatura da floresta");
});arrows.forEach(a=>{
  if(a.enemy&&overlap(body,a))damage("semente","Guardião");
  if(!a.enemy){
    a.y+=(a.vy||0)*dt;
    enemies.forEach(e=>{if(!e.dead&&overlap(a,e)){e.dead=true;a.ttl=0;notice("Flecha certeira!");}});
    if(boss&&boss.state==="vulnerable"&&boss.target.active&&hero.form==="archer"&&overlap(a,boss.target)){
      a.ttl=0;hurtBoss();
    }
  }
});masks.forEach(m=>{if(!m.taken&&overlap(body,m)){m.taken=true;hero.form=m.type;notice(`Transformação: ${FORMS[m.type].name} — ${FORMS[m.type].hint}.`);}});
if(boss&&boss.mask.active&&overlap(body,boss.mask)){boss.mask.active=false;boss.mask.phase="collected";boss.mask.timer=0;hero.form="archer";notice("Máscara Arqueiro recuperada!");}secrets.forEach(s=>{if(!s.found&&overlap(body,s)){s.found=true;notice("Segredo descoberto!");}});if(!checkpoint.on&&hero.x>checkpoint.x){checkpoint.on=true;notice("Checkpoint alcançado!");}if(!level.boss&&overlap(body,portal))complete();hero.x=Math.max(0,Math.min(level.width-hero.w,hero.x));
if(boss&&!boss.dead&&!boss.arenaActive&&hero.x>=boss.arenaLeft){
  boss.arenaActive=true;game.camera=boss.arenaCamera;
  hero.x=Math.max(hero.x,boss.arenaLeft+70);
  if(hero.form!=="archer"){
    boss.mask.phase="visible";boss.mask.active=true;boss.mask.timer=4.5;boss.mask.x=960;boss.mask.y=428;
  }
  notice("ARENA DO GUARDIÃO: câmera travada. Esquive das pedras e ataque o alvo!");
}
if(boss&&boss.arenaActive&&!boss.dead){
  hero.x=Math.max(boss.arenaLeft+8,Math.min(boss.arenaRight-hero.w,hero.x));
  game.camera=boss.arenaCamera;
}else{
  let target=Math.max(0,Math.min(level.width-VIEW.w,hero.x-VIEW.w*.36));
  game.camera+=(target-game.camera)*Math.min(1,dt*5);
}}
function complete(){game.finished=true;game.progress.cleared=[...new Set([...game.progress.cleared,level.id])];game.progress.unlocked=Math.max(game.progress.unlocked,Math.min(5,level.id+1));save();if(level.id<5){game.transition=2.2;notice(`${level.name} concluída! Próxima fase...`);}else notice("Mundo 1 concluído!");}
function draw(){const cam=Math.floor(game.camera);background(cam);if(level.water)level.water.forEach(w=>{ctx.fillStyle="#1d8dc5";ctx.fillRect(w.x-cam,w.y,w.w,w.h);ctx.fillStyle="#86eafa";for(let i=0;i<w.w;i+=25)ctx.fillRect(w.x-cam+i,481,14,3);});solids.forEach(s=>{if(s.platform&&s.crumbleState==="gone")return;drawSolid(s,cam);if(s.platform&&s.crumble){const x=s.x-cam;if(s.crumbleState==="shaking"){ctx.strokeStyle="#f4d15b";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+8,s.y+4);ctx.lineTo(x+18,s.y+13);ctx.lineTo(x+26,s.y+5);ctx.stroke();}else if(s.crumbleState==="rebuilding"){ctx.globalAlpha=.45;ctx.fillStyle="#a9d9e8";ctx.fillRect(x,s.y,s.w,s.h);ctx.globalAlpha=1;}}});drawForestDecor(cam);blocks.forEach(b=>!b.broken&&drawBlock(b,cam));secrets.forEach(s=>!s.found&&drawSecret(s,cam));hazards.forEach(h=>drawHazard(h,cam));enemies.forEach(e=>!e.dead&&drawEnemy(e,cam));masks.forEach(m=>!m.taken&&drawMask(m,cam));arrows.forEach(a=>drawArrow(a,cam));drawCheckpoint(cam);if(boss)drawBoss(cam);if(!level.boss||boss.dead)drawPortal(cam);drawHero(cam);hud();if(game.finished)overlay();}

// Texturas pixel-art geradas no próprio Canvas: não dependem de imagens externas.
let forestTextures=null;
function makeForestTextures(){
  if(forestTextures)return forestTextures;
  const make=(base,colors,kind)=>{
    const c=document.createElement("canvas");c.width=32;c.height=32;
    const g=c.getContext("2d");g.imageSmoothingEnabled=false;g.fillStyle=base;g.fillRect(0,0,32,32);
    let seed=kind*991+37;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<78;i++){const col=colors[Math.floor(rnd()*colors.length)];g.fillStyle=col;const x=Math.floor(rnd()*30),y=Math.floor(rnd()*30);g.fillRect(x,y,1+Math.floor(rnd()*5),1+Math.floor(rnd()*4));}
    return ctx.createPattern(c,"repeat");
  };
  forestTextures={
    soil:make("#63391f",["#87502a","#a96331","#4a2d20","#bd793c","#704027"],1),
    stone:make("#555d5c",["#78827b","#92988a","#343f42","#b1ad91","#485052"],2),
    grass:make("#267b36",["#49a83e","#83c943","#b5df54","#17652f"],3)
  };
  return forestTextures;
}
function cloud(x,y,s){
  ctx.fillStyle="#ffffff";ctx.globalAlpha=.72;
  ctx.fillRect(x,y+8*s,44*s,13*s);ctx.fillRect(x+8*s,y,20*s,19*s);ctx.fillRect(x+25*s,y+3*s,23*s,18*s);
  ctx.globalAlpha=1;
}
function treeLayer(x,baseY,scale,leaf,parallax){
  const w=24*scale,h=190*scale;
  ctx.fillStyle="#49301f";ctx.fillRect(x-w/2,baseY-h,w,h);
  ctx.fillStyle="#754324";ctx.fillRect(x-w/2+5*scale,baseY-h+8*scale,7*scale,h-8*scale);
  ctx.fillStyle="#a76631";ctx.fillRect(x-w/2+9*scale,baseY-h+15*scale,3*scale,h-25*scale);
  // Copa irregular formada por agrupamentos de folhas, em vez de círculos perfeitos.
  const clusters=[[-38,-14,34],[0,-34,43],[39,-12,36],[-18,15,38],[22,18,34],[-52,17,23],[52,18,24]];
  for(const [dx,dy,rad] of clusters){
    const cx=x+dx*scale,cy=baseY-h+dy*scale,r=rad*scale;
    ctx.fillStyle="#164d32";ctx.beginPath();ctx.arc(cx+2*scale,cy+5*scale,r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=leaf;ctx.beginPath();ctx.arc(cx,cy,r*.82,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#5aaf3c";ctx.fillRect(cx-r*.55,cy-r*.48,r*.48,5*scale);
    ctx.fillStyle="#9bd64b";ctx.fillRect(cx-r*.18,cy-r*.72,r*.36,4*scale);
    ctx.fillStyle="#246c38";ctx.fillRect(cx+r*.25,cy+r*.12,r*.42,5*scale);
  }
  // raízes e cipós
  ctx.strokeStyle="#744323";ctx.lineWidth=Math.max(2,3*scale);ctx.beginPath();ctx.moveTo(x,baseY-22*scale);ctx.lineTo(x-24*scale,baseY);ctx.moveTo(x,baseY-18*scale);ctx.lineTo(x+27*scale,baseY);ctx.stroke();
  if(scale>.8){ctx.strokeStyle="#438d3d";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+8*scale,baseY-h+20*scale);ctx.lineTo(x+14*scale,baseY-h+75*scale);ctx.lineTo(x+10*scale,baseY-h+92*scale);ctx.stroke();}
}
function background(cam){
  const pal={hills:["#65c8ee","#a9e6f5"],woods:["#29475a","#759b79"],river:["#58b9dc","#b4e6e9"],ruins:["#658da0","#c2d7c4"],lair:["#182d3b","#526c57"]}[level.theme]||["#65c8ee","#a9e6f5"];
  const sky=ctx.createLinearGradient(0,0,0,540);sky.addColorStop(0,pal[0]);sky.addColorStop(1,pal[1]);ctx.fillStyle=sky;ctx.fillRect(0,0,VIEW.w,VIEW.h);
  for(let i=-100-(cam*.025%270);i<1100;i+=270)cloud(i,48+(Math.sin(i)*12),.8);
  // Montanhas distantes em duas profundidades.
  for(let layer=0;layer<2;layer++){
    const shift=cam*(layer?.045:.025),step=layer?270:360;
    for(let x=-step-(shift%step);x<1100;x+=step){
      const base=355+layer*52,peak=base-(layer?100:165);
      ctx.fillStyle=layer?"#477f91":"#719fb5";ctx.beginPath();ctx.moveTo(x-90,base);ctx.lineTo(x+35,peak);ctx.lineTo(x+155,base);ctx.closePath();ctx.fill();
      ctx.fillStyle=layer?"#d1e4df":"#e9f3e9";ctx.beginPath();ctx.moveTo(x+8,peak+36);ctx.lineTo(x+35,peak);ctx.lineTo(x+66,peak+42);ctx.lineTo(x+48,peak+33);ctx.lineTo(x+35,peak+47);ctx.closePath();ctx.fill();
    }
  }
  // Floresta distante e intermediária com parallax.
  for(let i=-150-(cam*.055%210);i<1120;i+=210)treeLayer(i,475,0.62,"#347c49",.055);
  for(let i=-190-(cam*.085%300);i<1200;i+=300)treeLayer(i,500,1.02,level.theme==="woods"?"#285d3c":"#39883d",.085);
  // O plano próximo permanece estável; somente o cenário distante usa parallax muito sutil.
}
function VIEwSafe(){return VIEW.w;}
function drawSolid(s,cam){
  const screenX=Math.floor(s.x-cam);
  if(screenX>VIEW.w||screenX+s.w<0)return;
  const t=makeForestTextures(),isStone=level.theme==="ruins";
  // Tudo é desenhado em coordenadas do mundo. A textura acompanha o terreno
  // e não fica parada na tela como uma esteira/chroma key.
  ctx.save();
  ctx.translate(-cam,0);
  ctx.fillStyle=isStone?t.stone:t.soil;
  ctx.fillRect(s.x,s.y+8,s.w,s.h-8);
  for(let x=0;x<s.w;x+=32){
    const px=s.x+x;
    ctx.fillStyle=isStone?"#9aa18f":(x%64===0?"#9b5d2e":"#784326");
    ctx.fillRect(px,s.y+13,Math.min(20,s.w-x),3);
    ctx.fillStyle=isStone?"#343f42":"#4a2d20";ctx.fillRect(px+7,s.y+29,5,3);
    ctx.fillStyle=isStone?"#b5b49a":"#bd793c";ctx.fillRect(px+19,s.y+45,4,3);
  }
  ctx.fillStyle=isStone?"#687c68":"#25833a";ctx.fillRect(s.x,s.y,s.w,10);
  ctx.fillStyle="#7fcf42";ctx.fillRect(s.x,s.y,s.w,4);
  for(let x=2;x<s.w;x+=11){
    ctx.fillStyle=x%3?"#a4df4d":"#3f9d37";
    ctx.fillRect(s.x+x,s.y+3+(x%4),3,4);
  }
  ctx.fillStyle="#d3f18a";ctx.fillRect(s.x,s.y,s.w,1);
  if(s.h>40)for(let x=15;x<s.w;x+=47){
    ctx.fillStyle="#493020";ctx.fillRect(s.x+x,s.y+22,3,13);
    ctx.fillStyle="#a66a37";ctx.fillRect(s.x+x+3,s.y+31,5,3);
  }
  ctx.restore();
}

function drawForestDecor(cam){
  if(!["hills","woods","river","ruins","lair"].includes(level.theme))return;
  const decor=[];
  for(let x=80;x<level.width;x+=173){
    decor.push({x:x+((Math.floor(x/173)%3)*21),type:Math.floor(x/173)%4});
  }
  for(const d of decor){
    const sx=Math.floor(d.x-cam);if(sx<-50||sx>VIEW.w+50)continue;
    if(d.type===0){ctx.fillStyle="#246b35";ctx.fillRect(sx,458,22,8);ctx.fillStyle="#4b9d3e";ctx.fillRect(sx+4,451,14,9);}
    else if(d.type===1){ctx.fillStyle="#68716b";ctx.fillRect(sx,458,19,10);ctx.fillStyle="#aab3a0";ctx.fillRect(sx+3,455,11,4);}
    else if(d.type===2){ctx.fillStyle="#e64c43";ctx.fillRect(sx+4,448,12,9);ctx.fillStyle="#fff1cf";ctx.fillRect(sx+7,451,3,2);ctx.fillRect(sx+13,449,2,2);ctx.fillStyle="#e8d7a2";ctx.fillRect(sx+9,457,3,7);}
    else {ctx.fillStyle="#39863d";ctx.fillRect(sx+5,453,3,10);ctx.fillRect(sx+12,450,3,13);ctx.fillStyle="#e4c95d";ctx.fillRect(sx+3,449,6,3);ctx.fillRect(sx+12,446,6,3);}
  }
}
function drawBlock(b,cam){ctx.fillStyle="#8a7a62";ctx.fillRect(b.x-cam,b.y,b.w,b.h);ctx.strokeStyle="#40352d";ctx.strokeRect(b.x-cam+.5,b.y+.5,b.w-1,b.h-1);ctx.beginPath();ctx.moveTo(b.x-cam,b.y+b.h/2);ctx.lineTo(b.x-cam+b.w,b.y+b.h/2);ctx.stroke();}function drawSecret(s,cam){ctx.fillStyle="#244636";ctx.fillRect(s.x-cam,s.y,s.w,s.h);ctx.fillStyle="#48795a";ctx.fillRect(s.x-cam+7,s.y+12,5,5);}function drawHazard(h,cam){
  const x=h.x-cam;
  if(h.warning>0){
    ctx.save();ctx.globalAlpha=.35+.25*Math.sin(game.time*18);
    ctx.fillStyle="#ff3030";ctx.fillRect(x,h.y+h.h-5,h.w,5);
    ctx.strokeStyle="#ff5555";ctx.lineWidth=2;ctx.setLineDash([7,5]);
    ctx.strokeRect(x,h.type==="pedra-caindo"?460:h.y-3,h.w,h.type==="pedra-caindo"?18: h.h+6);
    ctx.setLineDash([]);ctx.restore();
    if(h.type==="pedra-caindo"){
      ctx.fillStyle="#ff5147";ctx.beginPath();ctx.moveTo(x+h.w/2-7,463);ctx.lineTo(x+h.w/2,450);ctx.lineTo(x+h.w/2+7,463);ctx.fill();
    }else{
      ctx.strokeStyle="#ff5b48";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+8,h.y+h.h);ctx.lineTo(x+18,h.y+h.h-8);ctx.lineTo(x+27,h.y+h.h);ctx.moveTo(x+h.w-28,h.y+h.h);ctx.lineTo(x+h.w-17,h.y+h.h-9);ctx.lineTo(x+h.w-7,h.y+h.h);ctx.stroke();
    }
    return;
  }
  if(h.type==="pedra-grande"){ctx.fillStyle="#211e25";ctx.beginPath();ctx.moveTo(x+7,h.y+15);ctx.lineTo(x+20,h.y+2);ctx.lineTo(x+47,h.y+5);ctx.lineTo(x+61,h.y+23);ctx.lineTo(x+54,h.y+48);ctx.lineTo(x+29,h.y+54);ctx.lineTo(x+5,h.y+39);ctx.closePath();ctx.fill();ctx.fillStyle="#81776b";ctx.fillRect(x+16,h.y+7,27,12);ctx.fillStyle="#b4a58e";ctx.fillRect(x+19,h.y+10,13,6);ctx.fillStyle="#49433e";ctx.fillRect(x+9,h.y+31,16,10);ctx.fillStyle="#d6a75e";ctx.fillRect(x+4,h.y+48,10,3);return;}
  if(h.type==="pedra-caindo"){
    ctx.fillStyle="#746b61";ctx.fillRect(x,h.y,h.w,h.h);
    ctx.fillStyle="#b8aa91";ctx.fillRect(x+4,h.y+3,8,5);ctx.fillStyle="#49433e";ctx.fillRect(x+14,h.y+13,7,6);
    return;
  }
  if(h.type==="raízes"){ctx.fillStyle="#74452d";ctx.fillRect(x,h.y+h.h-8,h.w,8);ctx.strokeStyle="#a66a37";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,h.y+h.h);ctx.lineTo(x+12,h.y+4);ctx.lineTo(x+25,h.y+h.h);ctx.lineTo(x+43,h.y+2);ctx.lineTo(x+60,h.y+h.h);ctx.stroke();return;}
  ctx.fillStyle="#3a1720";for(let i=0;i<h.w;i+=13){ctx.beginPath();ctx.moveTo(x+i-1,h.y+h.h);ctx.lineTo(x+i+6,h.y-2);ctx.lineTo(x+i+13,h.y+h.h);ctx.fill();ctx.fillStyle="#ff4b38";ctx.beginPath();ctx.moveTo(x+i+2,h.y+h.h);ctx.lineTo(x+i+6,h.y+3);ctx.lineTo(x+i+10,h.y+h.h);ctx.fill();ctx.fillStyle="#3a1720";}
}
function drawEnemy(e,cam){
  const x=Math.floor(e.x-cam),y=Math.floor(e.y);
  if(e.type==="boar"){
    ctx.save();
    if(e.state==="prepare"){
      ctx.fillStyle="#ffd45b";ctx.fillRect(x+8,y-12,26,4);
      ctx.fillStyle="#ff704b";ctx.fillRect(x+14,y-7,14,3);
    }
    if(e.state==="charge"){ctx.fillStyle="#ffb13b";ctx.fillRect(x-5,y+8,e.dir>0?10:0,5);}
    if(e.state==="stunned"){ctx.fillStyle="#fff1a6";ctx.fillRect(x+12,y-13,5,5);ctx.fillRect(x+24,y-16,5,5);}
    // Corpo robusto, cabeça, focinho, orelhas, presas e patas.
    ctx.fillStyle="#4a281b";ctx.fillRect(x+5,y+9,30,19);
    ctx.fillStyle="#8e4b2c";ctx.fillRect(x+8,y+5,25,19);
    ctx.fillStyle="#b96b3b";ctx.fillRect(x+21,y+12,18,12);
    ctx.fillStyle="#63301f";ctx.fillRect(x+31,y+16,10,8);
    ctx.fillStyle="#e6a66a";ctx.fillRect(x+34,y+18,5,4);
    ctx.fillStyle="#f2dfb9";ctx.fillRect(x+27,y+22,5,6);
    ctx.fillStyle="#f4d8a9";ctx.fillRect(x+33,y+21,4,6);
    ctx.fillStyle="#3a211b";ctx.fillRect(x+26,y+12,3,3);
    ctx.fillStyle="#6b3824";ctx.fillRect(x+10,y+2,8,8);ctx.fillRect(x+23,y+3,8,7);
    ctx.fillStyle="#39251c";ctx.fillRect(x+9,y+26,8,8);ctx.fillRect(x+28,y+26,8,8);
    ctx.fillStyle="#d58a4e";ctx.fillRect(x+11,y+27,5,3);ctx.fillRect(x+29,y+27,5,3);
    ctx.restore();return;
  }
  ctx.fillStyle="#392e58";ctx.fillRect(x,y,e.w,e.h);ctx.fillStyle="#8158a7";ctx.fillRect(x+4,y+4,20,12);ctx.fillStyle="#ffdf6b";ctx.fillRect(x+8,y+8,4,4);ctx.fillRect(x+17,y+8,4,4);
}
function drawMask(m,cam){ctx.fillStyle="#15213a";ctx.fillRect(m.x-cam-4,m.y-4,34,36);ctx.fillStyle=FORMS[m.type].color;ctx.fillRect(m.x-cam,m.y,m.w,m.h);ctx.fillStyle="#fff3bb";ctx.fillRect(m.x-cam+6,m.y+7,5,4);ctx.fillRect(m.x-cam+16,m.y+7,5,4);}
function drawArrow(a,cam){ctx.fillStyle=a.enemy?"#f4d26c":"#e8f3ff";ctx.fillRect(a.x-cam,a.y,a.w,a.h);ctx.fillStyle=a.enemy?"#9b6833":"#85643e";ctx.fillRect(a.x-cam+(a.vx>0?a.w-4:0),a.y-2,4,9);}function drawCheckpoint(cam){ctx.fillStyle="#eeeeee";ctx.fillRect(checkpoint.x-cam,checkpoint.y-54,4,58);ctx.fillStyle=checkpoint.on?"#ffd350":"#e84f53";ctx.fillRect(checkpoint.x-cam+4,checkpoint.y-54,28,18);}function drawPortal(cam){ctx.fillStyle="#e8eef7";ctx.fillRect(portal.x-cam,portal.y,4,portal.h);ctx.fillStyle="#f4c347";ctx.fillRect(portal.x-cam+4,portal.y,32,23);ctx.fillStyle="#e95450";ctx.fillRect(portal.x-cam+12,portal.y+6,12,10);}
function drawBoss(cam){
  if(!boss||boss.dead)return;
  const bx=boss.x-cam;
  // Guardião permanece no extremo direito, separado do alvo atingível.
  ctx.fillStyle="#4c3023";ctx.fillRect(bx+20,boss.y+20,86,145);
  ctx.fillStyle="#775039";ctx.fillRect(bx+7,boss.y+38,112,82);
  ctx.fillStyle="#2e211b";ctx.fillRect(bx+20,boss.y+48,24,15);ctx.fillRect(bx+82,boss.y+48,24,15);
  ctx.fillStyle="#f3d77c";ctx.fillRect(bx+26,boss.y+52,8,6);ctx.fillRect(bx+88,boss.y+52,8,6);
  ctx.fillStyle="#3a241a";ctx.fillRect(bx+2,boss.y+118,34,52);ctx.fillRect(bx+91,boss.y+118,34,52);
  ctx.fillStyle="#2d211b";ctx.fillRect(bx+34,boss.y+155,27,15);ctx.fillRect(bx+75,boss.y+155,27,15);
  if(boss.target&&boss.target.active){
    const tx=boss.target.x-cam,ty=boss.target.y;
    ctx.save();ctx.globalAlpha=.3+.15*Math.sin(game.time*10);ctx.fillStyle="#4df8e2";ctx.beginPath();ctx.arc(tx+15,ty+15,27,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.fillStyle="#153e4a";ctx.fillRect(tx,ty,30,30);ctx.strokeStyle="#65ffe5";ctx.lineWidth=3;ctx.strokeRect(tx+.5,ty+.5,29,29);
    ctx.fillStyle="#d9fff6";ctx.fillRect(tx+7,ty+7,16,16);ctx.fillStyle="#20bda9";ctx.fillRect(tx+11,ty+11,8,8);
  }
  if(boss.mask&&boss.mask.active)drawMask(boss.mask,cam);
  // Barra de vida do chefe.
  ctx.fillStyle="#311d24";ctx.fillRect(330,91,300,13);ctx.fillStyle="#d7444d";ctx.fillRect(330,91,300*(boss.hp/boss.max),13);
}
function drawHero(cam){let hx=Math.floor(hero.x-cam),hy=Math.floor(hero.y);if(hero.hurt>0&&Math.floor(hero.hurt*12)%2===0)return;ctx.save();ctx.translate(hx+(hero.face<0?hero.w:0),hy);ctx.scale(hero.face,1);ctx.fillStyle="#14233f";ctx.fillRect(7,1,17,3);ctx.fillRect(3,5,25,8);ctx.fillRect(6,13,20,15);ctx.fillRect(4,27,24,16);ctx.fillRect(6,41,9,6);ctx.fillRect(19,41,9,6);ctx.fillStyle=hero.form==="ninja"?"#7658dc":"#1f5baa";ctx.fillRect(7,3,16,5);ctx.fillRect(5,8,22,4);ctx.fillStyle="#f4b77f";ctx.fillRect(8,13,17,12);ctx.fillStyle="#6a3c2a";ctx.fillRect(8,13,15,3);ctx.fillStyle=hero.form?FORMS[hero.form].color:"#c93645";ctx.fillRect(8,27,17,15);ctx.fillRect(6,31,4,9);ctx.fillRect(23,30,5,10);if(hero.form==="ninja"){ctx.fillStyle="#ede2ff";ctx.fillRect(4,15,24,3);}if(hero.form==="warrior"){ctx.fillStyle="#ffca68";ctx.fillRect(12,29,4,10);}if(hero.form==="archer"){ctx.strokeStyle="#e4c46d";ctx.strokeRect(25,28,9,13);}ctx.fillStyle="#275eb1";ctx.fillRect(9,42,7,5);ctx.fillRect(19,42,7,5);ctx.fillStyle="#18223c";ctx.fillRect(6,47,11,3);ctx.fillRect(19,47,11,3);if(hero.action>0){ctx.fillStyle="#fff2a5";ctx.fillRect(29,27,12,4);}ctx.restore();}
function hud(){ctx.fillStyle="#132447dd";ctx.fillRect(12,12,365,67);ctx.fillStyle="#fff";ctx.font="bold 13px monospace";ctx.fillText(`${level.name.toUpperCase()} · ${RULES[game.mode].safe?"TESTE":"NORMAL"}`,22,33);ctx.fillStyle="#ffcf61";ctx.fillText(RULES[game.mode].safe?"VIDAS: ∞":`VIDAS: ${"♥".repeat(hero.lives)}${"♡".repeat(3-hero.lives)}`,22,54);ctx.fillStyle="#b8efff";ctx.fillText(`FORMA: ${hero.form?FORMS[hero.form].name:"avent. normal"}`,156,54);ctx.fillStyle="#132447dd";ctx.fillRect(747,12,201,35);ctx.fillStyle="#fff";ctx.fillText(`PONTOS: ${game.score} · DANOS: ${game.events.length}`,752,34);if(boss&&!boss.dead){ctx.fillStyle="#132447dd";ctx.fillRect(335,84,290,28);ctx.fillStyle="#582f32";ctx.fillRect(340,89,280,18);ctx.fillStyle="#e55c5c";ctx.fillRect(340,89,280*(boss.hp/boss.max),18);ctx.fillStyle="#fff";ctx.font="12px monospace";ctx.fillText("GUARDIÃO DA FLORESTA",387,104);}}
function overlay(){ctx.fillStyle="#09112599";ctx.fillRect(0,0,VIEW.w,VIEW.h);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="bold 27px monospace";ctx.fillText(hero.lives===0?"GAME OVER":boss?.dead?"MUNDO 1 CONCLUÍDO!":"FASE CONCLUÍDA!",480,235);ctx.font="15px monospace";ctx.fillText(hero.lives===0?"Use Recomeçar fase para tentar novamente.":boss?.dead?"O portal para o Mundo 2 será aberto em breve.":"Preparando a próxima fase...",480,270);ctx.textAlign="left";}
function drawPauseOverlay(){ctx.fillStyle="#071326bb";ctx.fillRect(0,0,VIEW.w,VIEW.h);ctx.fillStyle="#fff";ctx.textAlign="center";ctx.font="bold 34px monospace";ctx.fillText("JOGO PAUSADO",480,250);ctx.font="16px monospace";ctx.fillText("Pressione P ou ESC para continuar",480,285);ctx.textAlign="left";}
let last=performance.now();function loop(now){let dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();if(game.paused)drawPauseOverlay();requestAnimationFrame(loop);}function togglePause(){if(game.finished||game.transition>0)return;game.paused=!game.paused;const b=document.querySelector("#pauseButton");if(b)b.textContent=game.paused?"Continuar · P / ESC":"Pausar · P / ESC";}function key(e,down){
  const k=e.key.toLowerCase();
  if(down&&!e.repeat&&(k==="p"||k==="escape")){togglePause();e.preventDefault();return;}
  if(["arrowleft","a"].includes(k)){keys.left=down;e.preventDefault();}
  if(["arrowright","d"].includes(k)){keys.right=down;e.preventDefault();}
  if(["arrowdown","s"].includes(k)){keys.down=down;e.preventDefault();}
  if(["arrowup","w"].includes(k)){keys.up=down;if(down)keys.jump=true;e.preventDefault();}
  if(down&&k===" "){keys.jump=true;e.preventDefault();}
  if(down&&["x","k"].includes(k)){keys.action=true;e.preventDefault();}
}
addEventListener("keydown",e=>key(e,true));addEventListener("keyup",e=>key(e,false));document.querySelectorAll("[data-action]").forEach(button=>{const action=button.dataset.action,press=(e,down)=>{e.preventDefault();button.classList.toggle("active",down);if(action==="jump"&&down)keys.jump=true;else if(action==="attack"&&down)keys.action=true;else if(action!=="jump")keys[action]=down;};button.addEventListener("pointerdown",e=>press(e,true));["pointerup","pointercancel","pointerleave"].forEach(n=>button.addEventListener(n,e=>press(e,false)));});modeEl.onchange=()=>{game.mode=modeEl.value;loadLevel(level?.id||1);};difficultyEl.onchange=()=>{game.difficulty=difficultyEl.value;if(level?.boss)loadLevel(level.id,true);};stageEl.onchange=()=>loadLevel(+stageEl.value);document.querySelector("#restartButton").onclick=()=>{game.paused=false;const b=document.querySelector("#pauseButton");if(b)b.textContent="Pausar · P / ESC";loadLevel(level.id);};const pauseButton=document.querySelector("#pauseButton");if(pauseButton)pauseButton.onclick=togglePause;if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("service-worker.js").catch(()=>{}));loadLevel(1);requestAnimationFrame(loop);
