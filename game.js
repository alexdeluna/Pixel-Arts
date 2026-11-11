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
const ENEMY_KINDS={boar:{file:"boar.png",frames:4,w:50,h:50,offsetX:-4,offsetY:-13},mushroom:{file:"mushroom.png",frames:3,w:42,h:48,offsetX:-7,offsetY:-12},armadillo:{file:"armadillo.png",frames:3,w:46,h:44,offsetX:-9,offsetY:-9},wasp:{file:"wasp.png",frames:4,w:42,h:42,offsetX:-7,offsetY:-10},bat:{file:"bat.png",frames:4,w:44,h:42,offsetX:-8,offsetY:-8},plant:{file:"plant.png",frames:3,w:44,h:50,offsetX:-8,offsetY:-15}};
const enemyImages={};
for(const kind of Object.keys(ENEMY_KINDS))enemyImages[kind]=null;
function enemyKindFor(levelId,index,isBoar){if(isBoar)return "boar";const sets={1:["mushroom","armadillo","wasp","bat","plant"],2:["armadillo","wasp","bat","plant","mushroom"],3:["armadillo","wasp","bat","mushroom","plant"],4:["bat","plant","wasp","armadillo","mushroom"]};const list=sets[levelId]||sets[1];return list[(index+(levelId===1?0:Math.floor(index/5)))%list.length];}

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
function loadLevel(id,keepLives=false){game.paused=false;const pauseBtn=document.querySelector("#pauseButton");if(pauseBtn)pauseBtn.textContent="Pausar · P / ESC";level=LEVELS[id-1];solids=clone(level.solids);(level.platforms||[]).forEach((p,i)=>solids.push({...clone([p])[0],platform:true,crumble:(level.crumble||[]).some(c=>c.x===p.x&&c.y===p.y),crumbleState:"stable",crumbleTimer:0}));hazards=clone(level.hazards).map(h=>({...h,type:"espinhos",source:"Armadilha"}));if(level.water)hazards.push(...clone(level.water).map(h=>({...h,type:"correnteza",source:"Rio Perdido"})));blocks=clone(level.blocks).map(b=>({...b,broken:false}));enemies=clone(level.enemies).map((e,i)=>{const isBoar=level.id===1&&(i===0||i===2||i===3),w=isBoar?42:28,h=34;const support=solids.filter(s=>e.x+w>s.x&&e.x<s.x+s.w&&s.y>=100&&s.y<476).sort((a,b)=>a.y-b.y)[0];const floorY=support?support.y:476;return{x:e.x,y:floorY-h,w,h,min:support?Math.max(support.x+2,e.x-48):e.x-72,max:support?Math.min(support.x+support.w-w-2,e.x+48):e.x+92,dir:i%2?1:-1,speed:55+i*8,dead:false,type:isBoar?"boar":"generic",kind:enemyKindFor(level.id,i,isBoar),state:"patrol",timer:0,stun:0,hp:1};});masks=clone(level.masks).map(m=>({...m,w:26,h:28,taken:false}));secrets=clone(level.secrets).map(s=>({...s,found:false}));arrows=[];checkpoint={...level.checkpoint,on:false};portal={...level.portal};boss=level.boss?{x:1540,y:306,w:125,h:170,hp:DIFFICULTY[game.difficulty].hits,max:DIFFICULTY[game.difficulty].hits,state:"intro",timer:1.4,phase:0,core:false,dead:false,hit:0,arenaActive:false,arenaCamera:760,arenaLeft:760,arenaRight:1720,target:{x:1120,y:330,w:30,h:30,active:false},targetIndex:-1,mask:{x:520,y:428,w:26,h:28,type:"archer",taken:true,active:false,phase:"collected",timer:0}}:null;Object.assign(hero,{x:86,y:220,vx:0,vy:0,jumps:0,form:null,hurt:0,action:0,dash:0});game.camera=0;game.finished=false;game.transition=0;if(!keepLives){hero.lives=RULES[game.mode].lives;game.events=[];game.score=0;renderLog();}notice(level.intro);fillStages();}
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
  // O olho só pode surgir nestes dois pontos, ambos dentro da arena e da câmera travada.
  const points=[
    {x:1010,y:245},
    {x:1390,y:245}
  ];
  let next=Math.floor(Math.random()*points.length);
  if(next===boss.targetIndex)next=(next+1)%points.length;
  boss.targetIndex=next;
  // Duas marcas piscam; apenas uma contém o olho verdadeiro.
  const other=(next+1)%points.length;
  boss.eyeMarks=[
    {...points[next],index:next,real:true,alpha:0},
    {...points[other],index:other,real:false,alpha:0}
  ].sort(()=>Math.random()-.5);
  Object.assign(boss.target,points[next],{w:46,h:34,active:false,warning:true,warningTimer:1.25,rayFired:false});
}
function spawnBossSpikes(){
  // Padrões variáveis: ondas curtas em faixas diferentes, deixando rotas de fuga.
  const patterns=[
    [{x:hero.x-95,w:78},{x:hero.x+45,w:78}],
    [{x:hero.x-150,w:68},{x:hero.x-35,w:68},{x:hero.x+85,w:68}],
    [{x:hero.x-55,w:92},{x:hero.x+105,w:72}],
    [{x:hero.x-190,w:72},{x:hero.x-75,w:72},{x:hero.x+65,w:72}]
  ];
  const pattern=patterns[Math.floor(Math.random()*patterns.length)].slice(0,1+Math.floor(Math.random()*2));
  const left=boss?.arenaLeft??360,right=(boss?.arenaRight??1595);
  pattern.forEach((p,i)=>{
    const w=p.w,x=Math.max(left+18,Math.min(right-w-18,p.x));
    hazards.push({x,y:454,w,h:24,type:"espinhos-chefe",source:"Espinhos do Guardião",warning:.72+i*.16,active:false,duration:.95,ttl:0});
  });
  notice("ALERTA: sequência de espinhos! Procure uma plataforma segura!");
}
function spawnFallingRocks(){
  const lanes=[900,1080,1260,1440,1620],selected=[];
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
  // O local do olho é anunciado antes de materializar o núcleo.
  if(boss.target?.warning){
    boss.target.warningTimer-=dt;
    if(boss.target.warningTimer<=0){
      boss.target.warning=false;boss.target.active=true;boss.eyeMarks=[];
      if(!boss.target.rayFired){
        const sx=boss.target.x+23,sy=boss.target.y+17;
        const dx=(hero.x+hero.w/2)-sx,dy=(hero.y+hero.h/2)-sy;
        const len=Math.max(1,Math.hypot(dx,dy)),speed=405;
        arrows.push({x:sx-7,y:sy-5,w:15,h:10,vx:dx/len*speed,vy:dy/len*speed,ttl:3.6,enemy:true,ray:true});
        boss.target.rayFired=true;
        notice("RAIO DO OLHO! DESVIE!");
      }
    }
  }
  const rate=DIFFICULTY[game.difficulty].rate;
  // Ataque especial: aviso com 2, 3 ou 4 piscadas e tempo de espera variável.
  if(boss.state==="chainsaw"){
    const saw=boss.chainsaw;
    if(saw?.phase==="warning"){
      saw.blinkTimer-=dt;
      if(saw.blinkTimer<=0){
        saw.blinkOn=!saw.blinkOn;saw.blinkTimer=.19;
        saw.togglesLeft--;
        if(saw.togglesLeft<=0){saw.phase="delay";saw.delay=.28+Math.random()*.82;saw.blinkOn=false;}
      }
    }else if(saw?.phase==="delay"){
      saw.delay-=dt;
      if(saw.delay<=0){
        saw.phase="active";
        saw.hazard={x:boss.arenaCamera+VIEW.w+35,y:408,w:132,h:68,type:"motosserra",source:"Motosserra do Guardião",warning:0,active:true,ttl:2.2,vx:-1580};
        hazards.push(saw.hazard);
        notice("A MOTOSSERRA ESTÁ ATRAVESSANDO A ARENA!");
      }
    }else if(saw?.phase==="active"&&!hazards.includes(saw.hazard)){
      boss.chainsaw=null;boss.state="recovery";boss.timer=.28/rate;
    }
    return;
  }
  if(boss.state==="intro"&&boss.timer<=0){boss.state="attack";boss.timer=.32;notice("Guardião da Floresta despertou!");}
  else if(boss.state==="attack"&&boss.timer<=0){
    const cycle=boss.phase%6;
    if(cycle===0){
      const x=Math.max(boss.arenaLeft+18,Math.min(boss.arenaRight-128,hero.x-55));
      hazards.push({x,y:454,w:110,h:22,type:"raízes",source:"Raízes do Guardião",warning:.9,active:false,duration:1.15,ttl:0});
      notice("ALERTA: raízes surgindo no chão!");
    }else if(cycle===1)spawnBossSpikes();
    else if(cycle===2)spawnFallingRocks();
    else if(cycle===3){
      for(let i=0;i<3;i++)arrows.push({x:boss.x+35,y:boss.y+55,w:13,h:13,vx:(hero.x-boss.x)*.35+i*35,vy:-160+i*45,enemy:true,ttl:3});
      notice("Sementes lançadas pelo Guardião!");
    }else if(cycle===4){
      const startX=boss.x+8, startY=382;
      const dx=(hero.x+hero.w/2)-(startX+29);
      const flight=Math.max(.55,Math.min(1.15,Math.abs(dx)/430));
      hazards.push({x:startX,y:startY,w:62,h:54,type:"pedra-grande",source:"Pedra arremessada pelo Guardião",warning:.62,active:false,duration:3.4,ttl:0,vx:dx/flight,vy:-430});
      notice("O GUARDIÃO ARREMESSOU UMA PEDRA GIGANTE! SALTE OU DESVIE!");
    }else{
      const flashes=2+Math.floor(Math.random()*3);
      boss.chainsaw={phase:"warning",blinks:flashes,togglesLeft:flashes*2,blinkTimer:.08,blinkOn:true,delay:0,hazard:null};
      boss.state="chainsaw";
      notice(`PERIGO! Motosserra a caminho — ${flashes} alertas!`);
    }
    boss.phase++;
    if(boss.state!=="chainsaw"){boss.state="recovery";boss.timer=.28/rate;}
  }else if(boss.state==="recovery"&&boss.timer<=0){
    boss.state="vulnerable";boss.core=true;chooseBossTarget();boss.timer=2.75/rate;
    notice("ATENÇÃO! O OLHO VAI SURGIR — AFASTE-SE DA MARCA!");
  }else if(boss.state==="vulnerable"&&boss.timer<=0){
    boss.core=false;boss.target.active=false;boss.target.warning=false;boss.eyeMarks=[];boss.state="attack";boss.timer=.28/rate;
  }else if(boss.state==="hurt"&&boss.timer<=0){
    boss.core=false;boss.target.active=false;boss.target.warning=false;boss.eyeMarks=[];boss.state="attack";boss.timer=.38/rate;
  }else if(boss.state==="defeated"&&boss.timer<=0){
    boss.dead=true;boss.target.active=false;boss.target.warning=false;boss.eyeMarks=[];game.finished=true;
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
  else if(h.active&&h.ttl!=null){h.ttl-=dt;if(h.type==="pedra-caindo"){h.vy=(h.vy||0)+PHYS.gravity*1.35*dt;h.y+=h.vy*dt;}if(h.type==="pedra-grande"){h.vy=(h.vy||0)+PHYS.gravity*.62*dt;h.x+=h.vx*dt;h.y+=h.vy*dt;}if(h.type==="motosserra"){h.x+=h.vx*dt;if(h.x+h.w<boss.arenaCamera-160)return false;}if(h.ttl<=0||h.y>540)return false;}
  return true;
});arrows=arrows.filter(a=>{if(a.enemy&&!a.ray){a.vy+=PHYS.gravity*.42*dt;a.y+=a.vy*dt;}else if(a.ray){a.y+=a.vy*dt;}a.x+=a.vx*dt;a.ttl-=dt;return a.ttl>0&&a.x>-40&&a.x<level.width+40&&a.y<580;});updateBoss(dt);if(game.finished)return;if(hero.hurt>0)hero.hurt-=dt;if(hero.action>0)hero.action-=dt;if(hero.dash>0)hero.dash-=dt;let direction=Number(keys.right)-Number(keys.left);if(hero.dash>0){if(direction){hero.face=direction;hero.vx=direction*610;}}else{if(direction){hero.face=direction;hero.vx+=(direction*PHYS.speed-hero.vx)*Math.min(1,dt*13);}else{hero.vx*=Math.max(0,1-dt*10);}}if(keys.jump){const allowed=hero.form==="ninja"?3:2;if(hero.onGround||hero.jumps<allowed){hero.vy=-PHYS.jump;hero.jumps++;hero.onGround=false;}keys.jump=false;}if(keys.action){useAction();keys.action=false;}hero.vy+=PHYS.gravity*dt;hero.x+=hero.vx*dt;resolveX();const oldBottom=hero.y+hero.h;hero.y+=hero.vy*dt;resolveY(oldBottom);if(hero.y>660){damage(level.theme==="river"?"correnteza":"queda",level.theme==="river"?"Rio Perdido":"Abismo");if(RULES[game.mode].safe)respawn();}const body={x:hero.x+4,y:hero.y+4,w:hero.w-8,h:hero.h-5};hazards.forEach(h=>{const active=(h.warning===undefined||h.warning<=0)&&(h.active===undefined||h.active);if(active&&overlap(body,h))damage(h.type,h.source);});enemies.forEach(e=>{
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
});
if(boss&&boss.arenaActive&&!boss.dead&&boss.target?.active&&overlap(body,boss.target)){
  damage("contato com o olho","Núcleo do Guardião");
}
masks.forEach(m=>{if(!m.taken&&overlap(body,m)){m.taken=true;hero.form=m.type;notice(`Transformação: ${FORMS[m.type].name} — ${FORMS[m.type].hint}.`);}});
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
function drawBlock(b,cam){ctx.fillStyle="#8a7a62";ctx.fillRect(b.x-cam,b.y,b.w,b.h);ctx.strokeStyle="#40352d";ctx.strokeRect(b.x-cam+.5,b.y+.5,b.w-1,b.h-1);ctx.beginPath();ctx.moveTo(b.x-cam,b.y+b.h/2);ctx.lineTo(b.x-cam+b.w,b.y+b.h/2);ctx.stroke();}function drawSecret(s,cam){ctx.fillStyle="#244636";ctx.fillRect(s.x-cam,s.y,s.w,s.h);ctx.fillStyle="#48795a";ctx.fillRect(s.x-cam+7,s.y+12,5,5);}function drawSpikeStrip(x,y,w,h,cam=0){
  // Um único modelo visual para todos os espinhos, inclusive os do Guardião.
  const sx=x-cam, count=Math.max(1,Math.floor(w/13)), step=w/count;
  for(let i=0;i<count;i++){
    const left=sx+i*step, base=y+h;
    ctx.fillStyle="#32151b";
    ctx.beginPath();ctx.moveTo(left-1,base);ctx.lineTo(left+step/2, y-3);ctx.lineTo(left+step+1,base);ctx.closePath();ctx.fill();
    ctx.fillStyle="#e94b32";
    ctx.beginPath();ctx.moveTo(left+2,base-1);ctx.lineTo(left+step/2,y+3);ctx.lineTo(left+step-2,base-1);ctx.closePath();ctx.fill();
    ctx.fillStyle="#ffad55";
    ctx.fillRect(left+step/2-1,y+7,2,Math.max(2,h-9));
    ctx.fillStyle="#ffdc9b";
    ctx.fillRect(left+step/2-1,y+5,2,3);
  }
  ctx.fillStyle="#5a2020";ctx.fillRect(sx,y+h-3,w,4);
  ctx.fillStyle="#ff7145";ctx.fillRect(sx,y+h-3,w,1);
}
function drawHazard(h,cam){
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
  if(h.type==="espinhos"||h.type==="espinhos-chefe"){
    drawSpikeStrip(h.x,h.y,h.w,h.h,cam);return;
  }
  if(h.type==="motosserra"){
    // Barra metálica longa, corrente dentada e motor vermelho; atravessa a arena sem colisão com paredes.
    ctx.save();
    ctx.fillStyle="#242b32";ctx.fillRect(x+8,h.y+13,h.w-16,42);
    ctx.fillStyle="#9aa6ad";ctx.fillRect(x+12,h.y+8,h.w-24,9);ctx.fillRect(x+12,h.y+53,h.w-24,8);
    ctx.fillStyle="#d7e0e4";for(let i=0;i<h.w-24;i+=10){ctx.beginPath();ctx.moveTo(x+12+i,h.y+8);ctx.lineTo(x+17+i,h.y);ctx.lineTo(x+22+i,h.y+8);ctx.fill();ctx.beginPath();ctx.moveTo(x+12+i,h.y+61);ctx.lineTo(x+17+i,h.y+68);ctx.lineTo(x+22+i,h.y+61);ctx.fill();}
    ctx.fillStyle="#c93635";ctx.fillRect(x+38,h.y+17,55,34);ctx.fillStyle="#f4b84b";ctx.fillRect(x+47,h.y+22,29,7);ctx.fillStyle="#222a32";ctx.fillRect(x+81,h.y+20,13,26);
    ctx.fillStyle="#e7f0f4";ctx.fillRect(x+101,h.y+24,12,4);ctx.restore();return;
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
  // Inimigos desenhados diretamente no Canvas: não dependem de recortes de sprite sheet.
  // A arte visual usa coordenadas próprias e não altera a caixa física de colisão.
  const sx=Math.floor(e.x-cam), sy=Math.floor(e.y);
  const bob=(e.kind==="wasp"||e.kind==="bat")?Math.sin(game.time*10+e.x*.025)*2:0;
  const preparing=e.state==="prepare",stunned=e.state==="stunned";
  ctx.save();
  ctx.translate(sx+e.w/2,sy+e.h);
  ctx.scale(e.dir<0?-1:1,1);
  ctx.translate(-e.w/2,-e.h);
  const px=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const poly=(pts,c)=>{ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fill();};
  if(e.kind==="boar"){
    // Javali marrom, focinho, presas e crina.
    px(3,13,22,15,"#71351f");px(8,8,18,20,"#a95a2b");px(20,13,9,13,"#c87939");
    poly([[7,10],[10,4],[13,9],[17,3],[19,10],[23,8],[25,15]],"#d68a43");
    px(24,17,8,7,"#df9a55");px(29,19,4,4,"#39251d");px(23,15,3,3,"#fff0b2");px(24,16,1,1,"#17151a");
    poly([[25,24],[29,24],[27,29]],"#f6e4c2");px(5,25,5,7,"#552b20");px(20,25,5,7,"#552b20");
    px(3,18,4,5,"#d78a49");px(1,17,3,4,"#f3d5a2");
  }else if(e.kind==="mushroom"){
    px(10,20,20,12,"#f2c65c");px(13,26,14,7,"#e9a93c");
    poly([[4,22],[6,12],[13,5],[25,5],[34,13],[38,22],[31,25],[10,25]],"#d93635");
    px(11,9,5,5,"#fff1d5");px(24,7,5,5,"#fff1d5");px(31,14,4,4,"#fff1d5");
    px(15,21,4,4,"#291b24");px(26,21,4,4,"#291b24");px(19,26,7,2,"#8d3d28");
  }else if(e.kind==="armadillo"){
    px(5,18,29,13,"#644a38");px(9,11,23,17,"#9a8062");
    for(let i=0;i<4;i++){px(9+i*6,12,4,14,i%2?"#d2b98a":"#c0a276");px(10+i*6,14,2,10,"#806449");}
    px(29,20,8,7,"#b8a080");px(34,21,4,3,"#28232a");px(31,18,3,3,"#fff0bf");
    px(8,28,6,5,"#44352c");px(25,28,6,5,"#44352c");poly([[5,20],[1,17],[3,25]],"#806449");
  }else if(e.kind==="wasp"){
    // Asas animadas com oscilação vertical.
    const wing=Math.sin(game.time*22+e.x)*4;
    poly([[13,13-bob],[5,4-wing],[17,8-bob]],"#e9f7ff");poly([[23,13-bob],[30,3+wing],[28,15-bob]],"#c7e9f5");
    px(10,17,19,10,"#e9ad24");px(13,15,4,14,"#29232a");px(23,15,4,14,"#29232a");
    px(28,17,8,7,"#f4c83d");px(34,18,3,3,"#201d24");px(31,16,2,2,"#fff4c7");
    poly([[14,27],[17,32],[20,27]],"#29232a");px(8,20,3,3,"#fff0b3");
  }else if(e.kind==="bat"){
    const flap=Math.sin(game.time*19+e.x*.04)*5;
    poly([[21,19],[9,8-flap],[2,13],[5,24],[12,21],[16,29],[22,23]],"#593b8c");
    poly([[23,19],[34,8+flap],[41,13],[37,24],[31,21],[27,29],[22,23]],"#7147a8");
    px(15,15,14,13,"#8a5ac0");px(17,17,3,3,"#ffdf67");px(25,17,3,3,"#ffdf67");
    px(18,18,1,2,"#20162f");px(26,18,1,2,"#20162f");poly([[19,27],[22,32],[25,27]],"#d64b68");
  }else if(e.kind==="plant"){
    px(16,19,12,13,"#277b39");px(12,26,6,7,"#236b32");px(26,26,7,7,"#236b32");
    poly([[17,23],[9,8],[15,11],[20,4],[24,12],[31,8],[27,24]],"#3b9b43");
    poly([[11,19],[14,9],[19,17],[23,8],[30,18],[27,25]],"#e0443c");
    px(15,18,14,8,"#6b1726");px(18,20,3,3,"#fff0d2");px(25,20,3,3,"#fff0d2");
    poly([[16,26],[20,30],[25,26]],"#f2d7a0");px(5,29,10,3,"#2b7736");px(28,30,10,3,"#2b7736");
  }else{
    px(5,10,28,22,"#55406e");px(12,15,5,5,"#ffdf6b");px(24,15,5,5,"#ffdf6b");
  }
  if(preparing){px(18,-10,5,9,"#fff1a6");px(19,-8,3,4,"#d83c32");}
  if(stunned){px(8,-8,4,4,"#fff1a6");px(26,-11,4,4,"#fff1a6");}
  ctx.restore();
}
function drawMask(m,cam){
  const x=Math.round(m.x-cam),y=Math.round(m.y),bob=Math.sin(game.time*4+m.x*.02)*2;
  const c=FORMS[m.type]?.color||"#ffffff";
  ctx.save();ctx.translate(x,y+bob);
  // Aura e suporte flutuante, sem caixa retangular opaca.
  ctx.globalAlpha=.2+.08*Math.sin(game.time*7);ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(13,17,23,21,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle="#13213a";ctx.fillRect(3,29,20,3);ctx.fillStyle="#54718a";ctx.fillRect(7,32,12,2);
  if(m.type==="ninja"){
    ctx.fillStyle="#292044";ctx.fillRect(3,6,20,17);ctx.fillStyle="#7658dc";ctx.fillRect(5,4,16,6);ctx.fillRect(2,10,22,8);ctx.fillStyle="#c9b5ff";ctx.fillRect(4,13,18,3);ctx.fillStyle="#fff2d2";ctx.fillRect(7,12,4,3);ctx.fillRect(16,12,4,3);ctx.fillStyle="#39265f";ctx.fillRect(8,18,10,4);ctx.fillStyle="#b9a0ff";ctx.fillRect(19,5,8,3);
  }else if(m.type==="warrior"){
    ctx.fillStyle="#662c25";ctx.fillRect(3,7,20,17);ctx.fillStyle="#d34d3f";ctx.fillRect(5,5,16,15);ctx.fillStyle="#ffbd55";ctx.fillRect(3,3,6,6);ctx.fillRect(17,3,6,6);ctx.fillRect(8,2,8,4);ctx.fillStyle="#ffe6a0";ctx.fillRect(7,12,4,4);ctx.fillRect(16,12,4,4);ctx.fillStyle="#7d252b";ctx.fillRect(9,19,9,4);ctx.fillStyle="#f6c65f";ctx.fillRect(1,10,3,8);ctx.fillRect(23,10,3,8);
  }else if(m.type==="archer"){
    ctx.fillStyle="#214b39";ctx.fillRect(3,7,20,17);ctx.fillStyle="#31975a";ctx.fillRect(5,7,16,15);ctx.fillStyle="#5acb70";ctx.fillRect(4,5,18,5);ctx.fillRect(8,2,10,5);ctx.fillStyle="#e7c78c";ctx.fillRect(7,13,4,4);ctx.fillRect(16,13,4,4);ctx.fillStyle="#193f36";ctx.fillRect(9,19,9,3);ctx.strokeStyle="#f2d28a";ctx.lineWidth=2;ctx.beginPath();ctx.arc(24,15,8,-1.2,1.2);ctx.stroke();ctx.fillStyle="#e6c77d";ctx.fillRect(24,7,2,16);
  }
  ctx.restore();
}
function drawArrow(a,cam){
  const x=a.x-cam;
  if(a.ray){
    ctx.save();ctx.shadowColor="#ff4bda";ctx.shadowBlur=14;
    ctx.strokeStyle="#ff4bda";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(x,a.y+5);ctx.lineTo(x+a.w,a.y+5);ctx.stroke();
    ctx.strokeStyle="#fff0ff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,a.y+5);ctx.lineTo(x+a.w,a.y+5);ctx.stroke();ctx.restore();return;
  }
  ctx.fillStyle=a.enemy?"#f4d26c":"#e8f3ff";ctx.fillRect(x,a.y,a.w,a.h);ctx.fillStyle=a.enemy?"#9b6833":"#85643e";ctx.fillRect(x+(a.vx>0?a.w-4:0),a.y-2,4,9);
}function drawCheckpoint(cam){ctx.fillStyle="#eeeeee";ctx.fillRect(checkpoint.x-cam,checkpoint.y-54,4,58);ctx.fillStyle=checkpoint.on?"#ffd350":"#e84f53";ctx.fillRect(checkpoint.x-cam+4,checkpoint.y-54,28,18);}function drawPortal(cam){ctx.fillStyle="#e8eef7";ctx.fillRect(portal.x-cam,portal.y,4,portal.h);ctx.fillStyle="#f4c347";ctx.fillRect(portal.x-cam+4,portal.y,32,23);ctx.fillStyle="#e95450";ctx.fillRect(portal.x-cam+12,portal.y+6,12,10);}
function drawBoss(cam){
  if(!boss||boss.dead)return;
  const bx=boss.x-cam;
  // Guardião da Floresta: corpo de tronco antigo, braços-raiz e copa viva.
  // A arte é desenhada em coordenadas de mundo, com blocos pixelados nítidos.
  ctx.save();
  if(boss.hit>0){ctx.globalAlpha=.72+.28*Math.sin(game.time*48);}
  // raízes inferiores e pernas
  ctx.fillStyle="#3b261b";ctx.fillRect(bx+43,boss.y+126,39,39);
  ctx.fillStyle="#62402a";ctx.fillRect(bx+28,boss.y+153,30,15);ctx.fillRect(bx+70,boss.y+153,31,15);
  ctx.fillStyle="#9a6337";ctx.fillRect(bx+31,boss.y+157,21,5);ctx.fillRect(bx+75,boss.y+157,21,5);
  ctx.strokeStyle="#704326";ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(bx+45,boss.y+158);ctx.lineTo(bx+22,boss.y+170);ctx.moveTo(bx+87,boss.y+158);ctx.lineTo(bx+111,boss.y+170);ctx.stroke();
  // tronco central em camadas
  ctx.fillStyle="#39271e";ctx.fillRect(bx+30,boss.y+53,67,108);
  ctx.fillStyle="#65402a";ctx.fillRect(bx+23,boss.y+60,80,91);
  ctx.fillStyle="#895633";ctx.fillRect(bx+34,boss.y+65,58,76);
  ctx.fillStyle="#a36a39";ctx.fillRect(bx+43,boss.y+72,8,58);ctx.fillRect(bx+73,boss.y+80,7,51);
  ctx.fillStyle="#4a3022";ctx.fillRect(bx+55,boss.y+83,7,34);ctx.fillRect(bx+84,boss.y+94,5,28);
  // braços grossos de madeira, articulados como galhos
  ctx.fillStyle="#4b3021";ctx.fillRect(bx+5,boss.y+83,31,57);ctx.fillRect(bx+91,boss.y+80,31,60);
  ctx.fillStyle="#80502e";ctx.fillRect(bx+1,boss.y+92,29,39);ctx.fillRect(bx+95,boss.y+89,28,41);
  ctx.fillStyle="#a66a37";ctx.fillRect(bx+7,boss.y+97,17,8);ctx.fillRect(bx+101,boss.y+94,15,8);
  // dedos/raízes nas mãos
  ctx.strokeStyle="#593720";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(bx+10,boss.y+128);ctx.lineTo(bx-1,boss.y+145);ctx.moveTo(bx+20,boss.y+129);ctx.lineTo(bx+17,boss.y+148);ctx.moveTo(bx+111,boss.y+126);ctx.lineTo(bx+124,boss.y+143);ctx.moveTo(bx+101,boss.y+128);ctx.lineTo(bx+99,boss.y+148);ctx.stroke();
  // pescoço e copa de folhas
  ctx.fillStyle="#513622";ctx.fillRect(bx+47,boss.y+35,35,37);
  const foliage=[[12,43,27],[31,24,31],[61,12,34],[88,27,31],[111,47,24],[42,48,27],[77,48,28]];
  for(const [ox,oy,rad] of foliage){
    ctx.fillStyle="#174c2d";ctx.beginPath();ctx.arc(bx+ox,boss.y+oy,rad,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#287b39";ctx.beginPath();ctx.arc(bx+ox-3,boss.y+oy-4,rad*.78,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#64b83d";ctx.fillRect(bx+ox-rad*.45,boss.y+oy-rad*.52,rad*.55,5);
    ctx.fillStyle="#9bd64b";ctx.fillRect(bx+ox+2,boss.y+oy-rad*.72,rad*.28,4);
  }
  // galhos superiores e espinhos de madeira
  ctx.strokeStyle="#593720";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(bx+61,boss.y+42);ctx.lineTo(bx+42,boss.y+4);ctx.moveTo(bx+73,boss.y+38);ctx.lineTo(bx+101,boss.y+2);ctx.moveTo(bx+44,boss.y+47);ctx.lineTo(bx+15,boss.y+19);ctx.stroke();
  ctx.fillStyle="#a16a38";ctx.fillRect(bx+37,boss.y+4,10,8);ctx.fillRect(bx+97,boss.y+2,10,8);ctx.fillRect(bx+10,boss.y+16,10,8);
  // face expressiva sob a copa
  ctx.fillStyle="#2b211b";ctx.fillRect(bx+34,boss.y+49,22,17);ctx.fillRect(bx+79,boss.y+49,22,17);
  ctx.fillStyle="#ffd36b";ctx.fillRect(bx+40,boss.y+54,10,7);ctx.fillRect(bx+85,boss.y+54,10,7);
  ctx.fillStyle="#fff2bb";ctx.fillRect(bx+43,boss.y+55,3,3);ctx.fillRect(bx+88,boss.y+55,3,3);
  ctx.fillStyle="#38251c";ctx.fillRect(bx+53,boss.y+76,30,7);ctx.fillRect(bx+59,boss.y+83,17,5);
  ctx.fillStyle="#d7a45b";ctx.fillRect(bx+58,boss.y+89,6,4);ctx.fillRect(bx+72,boss.y+89,6,4);
  // musgo e folhas soltas no corpo
  ctx.fillStyle="#4c9a3b";ctx.fillRect(bx+24,boss.y+71,11,7);ctx.fillRect(bx+91,boss.y+69,12,8);ctx.fillRect(bx+48,boss.y+133,17,6);
  ctx.fillStyle="#a4d94b";ctx.fillRect(bx+28,boss.y+69,5,3);ctx.fillRect(bx+96,boss.y+67,5,3);
  ctx.restore();
  if(boss.target&&boss.target.warning){
    const wx=boss.target.x-cam,wy=boss.target.y;
    const blink=Math.sin(game.time*22)>0;
    ctx.save();ctx.globalAlpha=blink?.95:.48;
    ctx.strokeStyle="#ff3c43";ctx.lineWidth=4;ctx.setLineDash([8,5]);
    ctx.beginPath();ctx.ellipse(wx+23,wy+17,39,30,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#ff3c43";ctx.beginPath();ctx.moveTo(wx+23,wy-23);ctx.lineTo(wx+14,wy-39);ctx.lineTo(wx+32,wy-39);ctx.fill();
    ctx.font="bold 12px monospace";ctx.textAlign="center";ctx.fillStyle="#fff";ctx.strokeStyle="#65151c";ctx.lineWidth=3;
    ctx.strokeText("AFASTE-SE",wx+23,wy-47);ctx.fillText("AFASTE-SE",wx+23,wy-47);
    ctx.restore();
  }
  // Marcas falsas e verdadeira: todas piscam antes do surgimento, sem revelar qual é real.
  if(boss.eyeMarks?.length){
    boss.eyeMarks.forEach(mark=>{
      const mx=mark.x-cam,my=mark.y;
      ctx.save();ctx.globalAlpha=.48+.42*Math.sin(game.time*18);
      ctx.strokeStyle="#ff4b55";ctx.lineWidth=3;ctx.setLineDash([7,5]);
      ctx.beginPath();ctx.ellipse(mx+23,my+17,34,25,0,0,Math.PI*2);ctx.stroke();
      ctx.setLineDash([]);ctx.fillStyle="#ff4b55";ctx.font="bold 11px monospace";ctx.textAlign="center";
      ctx.fillText("ALERTA",mx+23,my-15);ctx.restore();
    });
  }
  if(boss.target&&boss.target.active){
    const tx=boss.target.x-cam,ty=boss.target.y;
    // Núcleo em formato de olho vivo: brilho, esclera, íris e pupila.
    ctx.save();
    const pulse=.88+.12*Math.sin(game.time*12);
    ctx.globalAlpha=.22+.12*Math.sin(game.time*10);
    ctx.fillStyle="#4df8e2";ctx.beginPath();ctx.ellipse(tx+23,ty+17,30*pulse,23*pulse,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle="#17343b";ctx.beginPath();ctx.ellipse(tx+23,ty+17,23,15,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#65ffe5";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(tx+23,ty+17,22,14,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle="#f4fff2";ctx.beginPath();ctx.ellipse(tx+23,ty+17,17,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#24bda9";ctx.beginPath();ctx.ellipse(tx+24,ty+17,8,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#102d38";ctx.beginPath();ctx.ellipse(tx+25,ty+17,4,8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#ffffff";ctx.fillRect(tx+17,ty+10,5,4);
    ctx.strokeStyle="#9affee";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tx+2,ty+17);ctx.lineTo(tx+9,ty+7);ctx.lineTo(tx+17,ty+3);ctx.moveTo(tx+29,ty+3);ctx.lineTo(tx+38,ty+7);ctx.lineTo(tx+44,ty+17);ctx.stroke();
    ctx.restore();
  }
  if(boss.mask&&boss.mask.active)drawMask(boss.mask,cam);
  if(boss.state==="chainsaw"&&boss.chainsaw?.phase==="warning"&&boss.chainsaw.blinkOn){
    ctx.save();ctx.textAlign="center";ctx.font="bold 42px monospace";
    ctx.lineWidth=7;ctx.strokeStyle="#3b1014";ctx.strokeText("PERIGO",VIEW.w/2,185);
    ctx.fillStyle="#ff3038";ctx.fillText("PERIGO",VIEW.w/2,185);
    ctx.font="bold 13px monospace";ctx.fillStyle="#fff2d0";ctx.fillText("MOTOSSERRA IMINENTE — SUBA!",VIEW.w/2,208);
    ctx.restore();
  }
  // Barra de vida do chefe.
  ctx.fillStyle="#311d24";ctx.fillRect(330,91,300,13);ctx.fillStyle="#d7444d";ctx.fillRect(330,91,300*(boss.hp/boss.max),13);
}
function drawHero(cam){
  const hx=Math.floor(hero.x-cam),hy=Math.floor(hero.y);
  if(hero.hurt>0&&Math.floor(hero.hurt*12)%2===0)return;
  const moving=Math.abs(hero.vx)>35;
  const running=moving&&hero.onGround;
  const airborne=!hero.onGround,fall=airborne&&hero.vy>90;
  const step=running?Math.sin(game.time*17)*3:0;
  const poseY=running?Math.abs(Math.sin(game.time*17))*-1:airborne?-2:Math.sin(game.time*3)*.5;
  const px=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  ctx.save();
  // Em movimento, o personagem fica claramente de perfil; parado, olha para a câmera.
  if(moving||airborne){
    ctx.translate(hx+(hero.face<0?hero.w:0),hy+poseY);ctx.scale(hero.face,1);
    // Mochila visível atrás do corpo.
    px(3,20,7,15,"#70402c");px(2,23,7,9,"#b77a43");px(4,19,5,3,"#e2a45d");
    const legA=airborne?(fall?3:-3):step,legB=-legA;
    px(9,38+legA,7,9,"#234f91");px(17,39+legB,7,8,"#234f91");
    px(7,45+legA,10,4,"#18233d");px(16,45+legB,11,4,"#18233d");
    px(8,24,17,17,"#c93645");px(6,27,4,11,"#c93645");px(23,27,5,10,"#c93645");
    px(10,26,12,3,"#ed5b52");px(13,31,5,7,"#8d283c");
    // Braço próximo e braço distante dão profundidade ao perfil.
    px(20,27+(running?-step:airborne?-2:0),5,10,"#f0b77e");px(7,28,4,9,"#a94a43");
    // Cabeça lateral: um olho, nariz e cabelo voltados para a direção do movimento.
    px(10,10,15,16,"#e9ad78");px(21,16,5,4,"#d58c62");
    px(9,9,16,5,"#5b3428");px(12,14,12,3,"#6d3c2a");
    px(20,17,3,3,"#25253a");px(25,19,3,2,"#8b3e3b");
    // Boné lateral com aba projetada para a frente.
    px(8,5,19,5,"#15396b");px(11,1,16,6,"#286fc2");px(10,5,18,3,"#347fd5");px(24,8,8,3,"#173c70");px(18,2,5,2,"#7fc9ff");
  }else{
    // Pose frontal de repouso: evita que pareça caminhar de lado quando está parado.
    ctx.translate(hx,hy+poseY);
    px(4,18,5,19,"#70402c");px(3,21,6,12,"#b77a43");
    px(8,39,7,8,"#234f91");px(19,39,7,8,"#234f91");
    px(6,45,10,4,"#18233d");px(18,45,11,4,"#18233d");
    px(7,24,19,17,"#c93645");px(5,27,4,11,"#c93645");px(24,27,4,10,"#c93645");
    px(9,26,14,3,"#ed5b52");px(13,31,5,7,"#8d283c");
    px(3,27,5,10,"#f0b77e");px(25,27,5,10,"#f0b77e");
    px(8,10,17,16,"#e9ad78");px(6,14,3,7,"#d58c62");px(24,14,3,7,"#d58c62");
    px(8,9,17,5,"#5b3428");px(9,13,15,2,"#6d3c2a");px(10,17,3,3,"#25253a");px(20,17,3,3,"#25253a");px(14,21,6,2,"#8b3e3b");
    px(5,5,22,5,"#15396b");px(8,1,17,6,"#286fc2");px(7,5,19,3,"#347fd5");px(3,8,27,3,"#173c70");px(17,2,5,2,"#7fc9ff");
  }
  // Máscaras mantêm a silhueta de perfil/frontal sem alterar a física do personagem.
  if(hero.form==="ninja"){
    px(5,12,23,5,"#4b2d91");px(7,13,19,3,"#9c7af0");px(moving?19:9,13,4,3,"#fff0c8");px(3,4,27,3,"#7658dc");px(25,5,8,3,"#b7a0ff");px(8,27,17,4,"#7658dc");
  }else if(hero.form==="warrior"){
    px(6,2,21,6,"#b93232");px(8,0,17,4,"#f0b84f");px(5,7,23,3,"#81252c");px(8,27,17,4,"#a93231");px(13,28,5,10,"#f4c45e");px(25,27,7,3,"#d8dce7");
  }else if(hero.form==="archer"){
    px(5,4,23,5,"#286d43");px(8,1,18,5,"#48a85a");px(6,8,22,3,"#1d563b");px(moving?19:9,12,4,3,"#fff0c8");px(8,27,17,4,"#327e4e");px(26,25,3,17,"#e3c47c");px(28,27,5,13,"#b88a48");
  }
  if(hero.action>0){px(29,27,10,3,"#fff2a5");px(34,23,3,11,"#ffe08a");}
  ctx.restore();
}
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
