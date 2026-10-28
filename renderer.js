import { WORLD, locations, roads } from './story/locations.js';
import { characters } from './story/characters.js';
import { items, pickups } from './story/items.js';
import { quests } from './story/quests.js';

const C = { grass: '#91aa68', darkGrass: '#708e4e', lightGrass: '#acc17c', asphalt: '#b9ad91', roadEdge: '#8e8a6b', ink: '#374633', cream: '#fff3cc', gold: '#efca54', blue: '#84c8cb' };
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const hash = (x, y, seed = 1) => { const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); };
const rect = (ctx, x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
const ellipse = (ctx, x, y, rx, ry, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
const line = (ctx, x1, y1, x2, y2, color, width = 1) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); };
const text = (ctx, value, x, y, size = 11, color = C.cream, align = 'center', weight = '700') => { ctx.font = `${weight} ${size}px "Courier New", monospace`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(value,x,y); };
const rounded = (ctx,x,y,w,h,r,color) => { ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill(); };

export class WorldRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.engine = engine;
    this.width = 1200;
    this.height = 720;
    this.camera = { x: 600, y: 300, w: 1200, h: 720 };
    this.time = 0;
    this.terrain = document.createElement('canvas');
    this.terrain.width = WORLD.width;
    this.terrain.height = WORLD.height;
    this.makeTerrain();
    this.makeScenery();
    this.resize();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, bounds.width || this.canvas.clientWidth || 1200);
    this.height = Math.max(1, bounds.height || this.canvas.clientHeight || 720);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.imageSmoothingEnabled = false;
    this.zoom = this.width < 600 ? .8 : this.width < 1000 ? .85 : .9;
    this.updateCamera(true);
  }

  updateCamera(snap = false, dt = .016) {
    const player = this.engine.state.player;
    const w = this.width / this.zoom;
    const h = this.height / this.zoom;
    const targetX = clamp(player.x - w * .5, 0, Math.max(0,WORLD.width-w));
    const targetY = clamp(player.y - h * .68, 0, Math.max(0,WORLD.height-h));
    const blend = snap ? 1 : Math.min(1, dt * 8);
    this.camera.x += (targetX-this.camera.x)*blend;
    this.camera.y += (targetY-this.camera.y)*blend;
    this.camera.w = w;
    this.camera.h = h;
  }

  makeTerrain() {
    const ctx = this.terrain.getContext('2d');
    rect(ctx,0,0,WORLD.width,WORLD.height,C.grass);
    // Small seeded clusters keep the park tactile without shimmering frame to frame.
    for (let y=0;y<WORLD.height;y+=16) for(let x=0;x<WORLD.width;x+=16) {
      const n=hash(x,y);
      if(n>.67) rect(ctx,x+Math.floor(n*9),y+3,3,2,n>.9?'#afc37d':'#839e5c');
      if(n<.16){ rect(ctx,x+4,y+8,2,4,'#799653');rect(ctx,x+7,y+9,2,3,'#799653'); }
    }
    for(const b of locations) {
      rounded(ctx,b.x-23,b.y-12,b.w+46,b.h+92,20,'#a2b978');
      for(let i=0;i<40;i++){
        const x=b.x-15+hash(i,b.x)*(b.w+30),y=b.y+hash(i,b.y)*(b.h+70);
        rect(ctx,x,y,3,2,'#91aa67');
      }
      rect(ctx,b.door.x-25,b.y+b.h-2,50,88,'#cabfa2');
      for(let i=0;i<5;i++) line(ctx,b.door.x-23,b.y+b.h+i*16,b.door.x+23,b.y+b.h+i*16,'#b3aa8c');
    }
    for(const road of roads) {
      rect(ctx,road.x-5,road.y-5,road.w+10,road.h+10,'#99a174');
      rect(ctx,road.x,road.y,road.w,road.h,C.asphalt);
    }
    for(const road of roads) for(let i=0;i<road.w*road.h/100;i++) {
      const x=road.x+hash(i,road.x,6)*road.w,y=road.y+hash(i,road.y,7)*road.h;
      rect(ctx,x,y,hash(i,4)> .7?3:2,1,hash(i,1)>.5?'#c7bea6':'#aba289');
    }
    // Wheel tracks, puddles, and small parked-lawn paths.
    for(const y of [747,788,1296,1338]) {
      ctx.globalAlpha=.14;line(ctx,165,y,1920,y,'#6f725e',3);ctx.globalAlpha=1;
    }
    ellipse(ctx,1750,790,29,7,'#9dada0');ellipse(ctx,1750,787,22,3,'#b4c7b7');
    ellipse(ctx,590,1320,24,7,'#9caa97');
    // A pale footpath connects the trailer front lawns.
    rect(ctx,190,492,1985,25,'#a7b979');
    for(let x=190;x<2180;x+=28)rect(ctx,x,499,18,2,'#b9c58b');
    // A little pond in the quieter northeast corner.
    ellipse(ctx,2260,285,82,120,'#839c79');
    ellipse(ctx,2260,285,70,108,'#759f9b');
    ellipse(ctx,2264,275,61,94,'#8fb6aa');
    for(let i=0;i<12;i++)rect(ctx,2215+hash(i,5)*80,210+hash(i,12)*140,13,2,'#a8cbbb');
    for(const p of [[2210,233],[2300,310],[2230,355]]){ellipse(ctx,p[0],p[1],9,4,'#658f6f');rect(ctx,p[0]-1,p[1]-2,3,2,'#d9c68d');}
    // Park edge fence.
    for(let x=15;x<WORLD.width;x+=28){rect(ctx,x,130,7,36,'#8b8a65');rect(ctx,x,130,7,4,'#c1b18b');}
    rect(ctx,0,141,WORLD.width,5,'#a39a74');rect(ctx,0,155,WORLD.width,5,'#a39a74');
    for(let y=160;y<1650;y+=30){rect(ctx,16,y,6,30,'#938e67');rect(ctx,2377,y,6,30,'#938e67');}
    // Patch of stones and flowers along the entrance green.
    for(let i=0;i<85;i++){
      const x=1060+hash(i,36)*310,y=1405+hash(i,87)*260;
      if(Math.abs(x-1200)<65)continue;
      if(i%3===0){rect(ctx,x,y,4,4,'#d2c3a4');rect(ctx,x,y,4,1,'#e1d2b2');}
      else{rect(ctx,x,y,2,5,'#7f9860');rect(ctx,x-2,y-2,5,3,i%2?'#e6d797':'#d9bd83');}
    }
  }

  makeScenery() {
    this.scenery=[];
    const add=(x,y,type,extra={})=>this.scenery.push({x,y,type,...extra});
    for(let x=45;x<2380;x+=86){add(x+hash(x,2)*26,80+hash(x,1)*24,'tree',{size:.9+hash(x,7)*.45});}
    for(let y=260;y<1640;y+=145){add(35,y,'tree',{size:1.08});add(2370,y+35,'tree',{size:1.12});}
    for(const [x,y,s] of [[500,270,1],[920,240,.95],[1320,255,1.05],[1730,290,1],[490,600,.9],[1360,595,1],[1810,600,1.1],[2300,560,.95],[520,880,.8],[1420,890,.85],[1010,1030,.9],[2040,890,.9],[1540,1450,1],[840,1590,1],[1440,1620,1],[2260,1620,1]])add(x,y,'tree',{size:s});
    for(const [x,y,color,dir] of [[370,590,'#a57050','h'],[700,610,'#628b86','h'],[1160,580,'#b5a674','h'],[1510,600,'#a7aeb0','h'],[1900,610,'#9b665b','h'],[370,1190,'#bbb58d','h'],[1540,1190,'#6b8177','h'],[2020,1185,'#bd985c','v']])add(x,y,'car',{color,dir});
    for(const [x,y] of [[1390,640],[1050,625],[1780,1190],[590,1560],[2125,1615]])add(x,y,'picnic');
    for(const [x,y] of [[165,436],[550,437],[1345,440],[1790,440],[2060,1140]])add(x,y,'mailbox');
    for(const [x,y] of [[995,460],[1260,435],[1035,565]])add(x,y,'cat',{color:'#d7bd87'});
    add(1215,465,'cat',{color:'#565d53'});add(1280,560,'cat',{color:'#efdfbb'});
    for(const [x,y] of [[150,1410],[570,1435],[1890,1110],[1555,1120]])add(x,y,'tires');
    for(const [x,y] of [[665,1093],[830,1093],[1610,1100],[1850,1100]])add(x,y,'cone');
    for(const [x,y] of [[450,430],[820,430],[1660,430],[2300,1120]])add(x,y,'planter');
    for(const [x,y] of [[200,1375],[580,1580],[2280,1130]])add(x,y,'bin');
    add(2135,600,'laundry');add(1540,1560,'laundry');
    add(370,1550,'junk');add(1800,1490,'speaker');add(2080,1490,'speaker');
    add(1200,1550,'entrance');
    // Street lamps are deliberately set beside, rather than on, the walking routes.
    for(const [x,y] of [[200,680],[990,680],[1880,680],[240,1230],[1040,1230],[2090,1230]])add(x,y,'lamp');
  }

  visible(x,y,pad=160) {
    return x>this.camera.x-pad && x<this.camera.x+this.camera.w+pad && y>this.camera.y-pad && y<this.camera.y+this.camera.h+pad;
  }

  draw(time=0,dt=.016) {
    this.time=time;
    this.updateCamera(false,dt);
    const ctx=this.ctx;
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    rect(ctx,0,0,this.width,this.height,C.grass);
    ctx.save();ctx.scale(this.zoom,this.zoom);ctx.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(this.terrain,0,0);
    const collected=new Set(this.engine.state.collected);
    const objectives=this.objectives();
    for(const pickup of pickups) if(!collected.has(pickup.id)&&this.visible(pickup.x,pickup.y,35))this.drawPickup(ctx,pickup,objectives.items.has(pickup.item));
    const scene=[];
    for(const building of locations) if(this.visible(building.x+building.w/2,building.y+building.h))scene.push({y:building.y+building.h,draw:()=>this.drawBuilding(ctx,building)});
    for(const prop of this.scenery)if(this.visible(prop.x,prop.y))scene.push({y:prop.y+(prop.type==='tree'?6:4),draw:()=>this.drawProp(ctx,prop)});
    for(const character of characters)if(this.visible(character.x,character.y))scene.push({y:character.y+10,draw:()=>this.drawCharacter(ctx,character)});
    scene.push({y:this.engine.state.player.y+10,draw:()=>this.drawPlayer(ctx)});
    scene.sort((a,b)=>a.y-b.y).forEach(obj=>obj.draw());
    const nearest=this.engine.nearestInteractable();
    if(nearest){const point=nearest.type==='location'?nearest.entity.door:nearest.entity;
      ctx.strokeStyle='rgba(255,245,207,.7)';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.ellipse(point.x,point.y+10,25,12,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    }
    for(const character of characters) {
      if(!this.visible(character.x,character.y))continue;
      if(objectives.characters.has(character.id))this.drawMarker(ctx,character.x,character.y-58,'diamond');
      else if(this.engine.getAvailableQuests(character.id).length)this.drawMarker(ctx,character.x,character.y-58,'quest');
    }
    for(const location of locations)if(objectives.locations.has(location.id)&&this.visible(location.door.x,location.door.y))this.drawMarker(ctx,location.door.x,location.door.y-24,'diamond');
    // A warm, very light afternoon wash. Evening retains playable contrast.
    const minute=this.engine.state.minutes;
    if(minute>1020){ctx.fillStyle=`rgba(112,79,45,${Math.min(.08,(minute-1020)/3000)})`;ctx.fillRect(this.camera.x,this.camera.y,this.camera.w,this.camera.h);}
    ctx.restore();
    // Edge shade frames the playable surface without obscuring the art.
    const shade=ctx.createLinearGradient(0,0,0,this.height);shade.addColorStop(0,'rgba(39,51,34,.07)');shade.addColorStop(.15,'rgba(39,51,34,0)');shade.addColorStop(.88,'rgba(39,51,34,0)');shade.addColorStop(1,'rgba(39,51,34,.09)');ctx.fillStyle=shade;ctx.fillRect(0,0,this.width,this.height);
  }

  objectives() {
    const result={characters:new Set(),locations:new Set(),items:new Set()};
    for(const [id,active] of Object.entries(this.engine.state.activeQuests)){
      const step=quests.find(q=>q.id===id)?.steps[active.step];if(!step)continue;
      if(step.type==='talk'||step.type==='deliver')result.characters.add(step.target);
      else if(step.type==='visit')result.locations.add(step.target);
      else if(step.type==='collect')result.items.add(step.target);
    }
    return result;
  }

  drawBuilding(ctx,b) {
    const {x,y,w,h}=b;
    // Pixel-stepped ground shadows and the lower wall lend the map a raised diorama feel.
    rect(ctx,x+13,y+18,w,h+8,'rgba(44,59,35,.22)');rect(ctx,x+w,y+40,13,h-24,'rgba(54,65,40,.12)');
    rect(ctx,x,y,w,h,'#53634c');rect(ctx,x+3,y+6,w-6,h-9,b.color);
    const roofH=h-43;
    rect(ctx,x-4,y-5,w+8,roofH,b.roofColor);rect(ctx,x-4,y-5,w+8,5,'#c4b99a');
    rect(ctx,x-4,y+roofH-5,w+8,6,'rgba(28,40,29,.35)');
    for(let i=12;i<w;i+=22){line(ctx,x+i,y+3,x+i,y+roofH-9,'rgba(255,241,205,.16)',2);line(ctx,x+i+2,y+3,x+i+2,y+roofH-9,'rgba(35,43,33,.11)',1);}
    for(let sy=y+roofH+7;sy<y+h-4;sy+=7)rect(ctx,x+4,sy,w-8,2,'rgba(91,91,64,.13)');
    // Roof AC, vent, and seams.
    rect(ctx,x+w-62,y+24,34,27,'#455747');rect(ctx,x+w-65,y+20,34,27,'#b7bc9e');rect(ctx,x+w-62,y+23,28,21,'#899783');
    for(let i=0;i<4;i++)rect(ctx,x+w-59,y+26+i*4,22,1,'#5d705d');
    rect(ctx,x+34,y+18,12,13,'#414d3f');rect(ctx,x+32,y+15,12,13,'#a8ad92');rect(ctx,x+30,y+13,16,4,'#d0c8a9');
    const bottom=y+h;
    for(const wx of [x+31,x+w-71]){
      rect(ctx,wx-3,bottom-34,47,31,'#e3d4b0');rect(ctx,wx,bottom-31,41,23,'#456c68');rect(ctx,wx+3,bottom-28,17,17,'#98b4a1');rect(ctx,wx+23,bottom-28,15,17,'#7d9d91');rect(ctx,wx+19,bottom-31,3,23,'#ded3b0');rect(ctx,wx-5,bottom-6,51,4,'#a99f80');
    }
    const dx=b.door.x;
    rect(ctx,dx-16,bottom-39,33,39,'#e8d8b2');rect(ctx,dx-13,bottom-37,27,37,'#526d5b');rect(ctx,dx-9,bottom-33,19,14,'#7e9a88');rect(ctx,dx+7,bottom-15,3,3,'#e6c976');
    rect(ctx,dx-24,bottom+1,49,7,'#d6c9a9');rect(ctx,dx-28,bottom+8,57,6,'#b9b193');rect(ctx,dx-31,bottom+14,63,5,'#96977a');
    if(b.kind==='trailer'){
      for(const ax of [x+55,x+w-55]){rect(ctx,ax-8,bottom+1,17,6,'#55604d');rect(ctx,ax-5,bottom+4,11,4,'#3b483d');}
      rect(ctx,x+8,y+roofH+3,w-16,4,'rgba(255,244,208,.5)');
    }
    if(b.kind==='shed'){
      for(let sy=bottom-35;sy<bottom;sy+=7)rect(ctx,x+4,sy,w-8,2,'#97734e');
      rect(ctx,x+80,y+roofH+3,96,18,'#dfcc99');text(ctx,'KITTY RESCUE',x+128,y+roofH+12,9,'#5b6246');
    }
    if(b.kind==='burger'){
      rect(ctx,x-7,y+roofH-5,w+14,26,'#c6a35d');for(let i=0;i<w;i+=28)rect(ctx,x+i,y+roofH-5,14,26,'#aa5f44');
      rect(ctx,x+25,y+roofH-36,w-50,28,'#efe0b0');text(ctx,'THE DIRTY BURGER',x+w/2,y+roofH-21,14,'#7c4e35');
      ellipse(ctx,x+29,bottom+23,20,8,'#53604c');rect(ctx,x+13,bottom-3,32,24,'#444f43');rect(ctx,x+10,bottom-6,38,8,'#6e7060');for(let i=0;i<5;i++)rect(ctx,x+14+i*7,bottom-5,2,5,'#a49a76');
    }
    if(b.kind==='garage'){
      rect(ctx,x+35,bottom-46,90,43,'#758174');for(let i=0;i<5;i++)rect(ctx,x+38,bottom-41+i*7,84,2,'#9ba18d');
      rect(ctx,x+160,y+roofH+7,140,17,'#e4d9b4');text(ctx,'CORY + JACOB',x+230,y+roofH+16,10,'#4c604f');
    }
    if(b.kind==='office'){
      rect(ctx,x+w-26,y+20,4,105,'#d6c9a7');rect(ctx,x+w-22,y+20,37,22,'#d8d3ad');rect(ctx,x+w-22,y+20,8,22,'#b47760');rect(ctx,x+w+7,y+20,8,22,'#b47760');rect(ctx,x+w-6,y+26,7,9,'#ab6a53');
    }
    if(b.kind==='laundry'){
      for(let i=0;i<3;i++){rect(ctx,x+24+i*57,y+roofH+6,40,31,'#d6d8bd');ellipse(ctx,x+44+i*57,y+roofH+21,11,11,'#5c7c74');ellipse(ctx,x+44+i*57,y+roofH+21,7,7,'#9db9a7');}
    }
    if(b.kind==='yard'){
      rect(ctx,x+15,y+30,w-30,h-40,'#817e61');
      for(let i=0;i<13;i++){const sx=x+22+hash(i,7)*(w-50),sy=y+40+hash(i,41)*(h-70);rect(ctx,sx,sy,24+hash(i,2)*30,15,'#9a9a82');rect(ctx,sx+3,sy-3,19,5,'#b5b096');}
    }
    if(b.kind==='stage'){
      rect(ctx,x+8,y+25,w-16,h-36,'#b39365');for(let i=0;i<w-18;i+=18)rect(ctx,x+9+i,y+25,1,h-36,'#907a54');
      rect(ctx,x-6,y-1,12,h,'#675a43');rect(ctx,x+w-6,y-1,12,h,'#675a43');
      rect(ctx,x+12,y+22,w-24,24,'#dbbd6d');text(ctx,'SUNNYVALE BLOCK PARTY',x+w/2,y+34,14,'#5b613f');
      for(let i=0;i<11;i++){const bx=x+15+i*29;ctx.fillStyle=i%2?'#e2c661':'#a5735d';ctx.beginPath();ctx.moveTo(bx,y+56);ctx.lineTo(bx+18,y+56);ctx.lineTo(bx+9,y+72);ctx.fill();}
    }
    // Readable, quiet labels sit below each structure.
    const label=b.shortName;const labelW=Math.max(66,label.length*6.6+18);
    rounded(ctx,x+w/2-labelW/2,bottom+40,labelW,21,3,'rgba(54,70,49,.84)');text(ctx,label,x+w/2,bottom+51,10,'#f5edca');
  }

  drawProp(ctx,p) {
    const {x,y,type}=p;
    if(type==='tree'){
      const s=p.size||1;ctx.save();ctx.translate(x,y);ctx.scale(s,s);
      ellipse(ctx,13,9,34,12,'rgba(59,75,41,.18)');
      rect(ctx,-6,-40,13,46,'#786747');rect(ctx,-3,-36,4,40,'#a48a59');rect(ctx,-11,3,24,5,'#89744e');
      const crown=(dx,dy,color)=>{rect(ctx,dx-24,dy-17,49,32,color);rect(ctx,dx-33,dy-8,67,21,color);rect(ctx,dx-18,dy-25,37,47,color);};
      crown(4,-52,'#4b713e');crown(-5,-59,'#5d8147');crown(-9,-65,'#749650');
      rect(ctx,-25,-75,23,11,'#91ad5e');rect(ctx,-27,-62,14,8,'#82a255');rect(ctx,-7,-83,20,12,'#9ab767');rect(ctx,7,-69,15,9,'#82a453');rect(ctx,20,-56,10,12,'#41643a');rect(ctx,-3,-44,20,6,'#567a40');
      ctx.restore();return;
    }
    if(type==='car'){
      ctx.save();ctx.translate(x,y);if(p.dir==='v')ctx.rotate(Math.PI/2);
      ellipse(ctx,5,8,43,16,'rgba(51,63,43,.18)');
      rect(ctx,-34,-13,69,28,'#3e4b40');rect(ctx,-28,-19,13,8,'#3f493e');rect(ctx,17,-19,13,8,'#3f493e');rect(ctx,-28,13,13,7,'#3f493e');rect(ctx,17,13,13,7,'#3f493e');
      rect(ctx,-37,-13,76,27,p.color);rect(ctx,-33,-16,66,31,p.color);rect(ctx,-35,-12,73,3,'rgba(255,240,208,.3)');
      rect(ctx,-13,-13,34,25,'#486861');rect(ctx,-8,-11,19,21,p.color);rect(ctx,-22,-12,10,23,'#9caf9c');rect(ctx,13,-11,9,21,'#819f91');
      rect(ctx,-37,-10,4,7,'#e7d9a2');rect(ctx,-37,5,4,7,'#e7d9a2');rect(ctx,35,-10,4,6,'#a2604d');rect(ctx,35,6,4,6,'#a2604d');rect(ctx,-40,-10,3,22,'#a2a894');rect(ctx,39,-10,3,22,'#a2a894');
      line(ctx,-4,-12,-4,12,'rgba(70,82,66,.28)',1);rect(ctx,-2,-16,9,2,'#d2d0ac');
      ctx.restore();return;
    }
    if(type==='picnic'){
      ellipse(ctx,7,8,38,12,'rgba(60,70,45,.13)');
      rect(ctx,-25,-18,49,31,'#6d6648');rect(ctx,-28,-23,55,28,'#ae9262');for(let i=0;i<4;i++)rect(ctx,-26,-21+i*7,51,2,'#cab17d');
      rect(ctx,-30,-34,59,7,'#ac9466');rect(ctx,-30,13,59,7,'#a58a5c');rect(ctx,-25,19,5,5,'#706b4d');rect(ctx,20,19,5,5,'#706b4d');
      rect(ctx,12,-14,7,9,'#e5d2a3');rect(ctx,13,-17,5,3,'#ba805d');return;
    }
    if(type==='mailbox'){
      rect(ctx,-2,-22,5,29,'#9b8760');rect(ctx,-11,-38,22,18,'#5b7766');rect(ctx,-9,-41,17,4,'#77907a');rect(ctx,-8,-33,15,2,'#a4ae8c');rect(ctx,10,-39,3,13,'#b75c4d');return;
    }
    if(type==='cat'){
      const tail=Math.sin(this.time/700+x)*1.5;
      ellipse(ctx,0,5,11,4,'rgba(59,70,44,.18)');rect(ctx,-8,-8,15,11,p.color);rect(ctx,3,-16,10,12,p.color);rect(ctx,3,-19,3,5,p.color);rect(ctx,10,-19,3,5,p.color);rect(ctx,4,-11,2,2,'#384d3e');rect(ctx,10,-11,2,2,'#384d3e');rect(ctx,-7,0,3,7,p.color);rect(ctx,3,0,3,7,p.color);rect(ctx,-15,-7+tail,9,4,p.color);rect(ctx,-17,-12+tail,4,7,p.color);return;
    }
    if(type==='tires'){
      for(let i=0;i<3;i++){ellipse(ctx,3,-i*8,17,7,'#455145');rect(ctx,-14,-i*8-5,34,5,'#4e5949');ellipse(ctx,3,-i*8-5,17,6,'#66705a');ellipse(ctx,3,-i*8-6,8,3,'#424c40');}return;
    }
    if(type==='cone'){
      rect(ctx,-10,0,20,5,'#706f50');rect(ctx,-7,-6,14,7,'#bb7951');rect(ctx,-5,-13,10,8,'#e0c893');rect(ctx,-3,-19,6,7,'#be7d51');return;
    }
    if(type==='planter'){
      rect(ctx,-15,-6,31,13,'#a48258');rect(ctx,-17,-9,35,5,'#c09a65');rect(ctx,-11,-20,6,15,'#5a7c4d');rect(ctx,3,-22,6,16,'#69864e');rect(ctx,-5,-17,6,12,'#78965a');for(let i=0;i<5;i++)rect(ctx,-13+i*6,-21-(i%2)*4,6,5,i%2?'#dcc279':'#cf9f6b');return;
    }
    if(type==='bin'){
      ellipse(ctx,0,7,15,5,'rgba(59,70,44,.15)');rect(ctx,-12,-27,25,33,'#6e8570');rect(ctx,-9,-23,4,25,'#91a08a');rect(ctx,-15,-31,31,6,'#a0aa8f');rect(ctx,-2,-36,10,5,'#667b63');return;
    }
    if(type==='laundry'){
      rect(ctx,-68,-59,5,65,'#8e805a');rect(ctx,68,-59,5,65,'#8e805a');line(ctx,-65,-50,70,-50,'#756d4d',2);
      const colors=['#e2d9b9','#91aaa5','#c49a85','#c7c697'];
      for(let i=0;i<4;i++){const lx=x-48+i*31;rect(ctx,lx-x-10,-47,24,26,colors[i]);rect(ctx,lx-x-16,-47,36,8,colors[i]);rect(ctx,lx-x-2,-50,4,5,'#ab9867');}return;
    }
    if(type==='junk'){
      rect(ctx,-55,-8,112,17,'#817f61');rect(ctx,-46,-28,44,23,'#a59d7e');rect(ctx,3,-19,37,15,'#777e66');rect(ctx,-16,-38,49,20,'#b2aa8b');rect(ctx,22,-26,27,20,'#8a9985');line(ctx,-41,-27,-8,-8,'#736f56',3);return;
    }
    if(type==='speaker'){
      rect(ctx,-17,-56,35,59,'#3a493e');rect(ctx,-13,-52,27,49,'#536251');ellipse(ctx,0,-16,10,10,'#303f36');ellipse(ctx,0,-16,5,5,'#6c7b63');ellipse(ctx,0,-41,6,6,'#33453a');return;
    }
    if(type==='lamp'){
      ellipse(ctx,5,7,15,5,'rgba(60,70,45,.15)');rect(ctx,-3,-80,6,88,'#737c61');rect(ctx,-3,-82,25,5,'#737c61');rect(ctx,12,-80,17,8,'#d0c7a5');rect(ctx,15,-72,11,3,'#ede0ae');return;
    }
    if(type==='entrance'){
      rect(ctx,-131,-62,11,73,'#746d4d');rect(ctx,120,-62,11,73,'#746d4d');rect(ctx,-142,-94,284,48,'#53694c');rect(ctx,-138,-90,276,40,'#d4c48f');rect(ctx,-132,-84,264,28,'#e7d8a7');
      text(ctx,'SUNNYVALE',0,-71,26,'#506442');text(ctx,'TRAILER PARK',0,-37,11,'#566c45');
      for(const dx of [-114,114]){rect(ctx,dx-16,-4,33,12,'#8c7952');for(let i=0;i<4;i++){rect(ctx,dx-14+i*8,-15,5,12,'#718d51');rect(ctx,dx-15+i*8,-18,7,5,i%2?'#dfc16f':'#c6966f');}}return;
    }
  }

  drawPickup(ctx,p,objective) {
    const bob=Math.sin(this.time/550+p.x*.13)*2;
    ellipse(ctx,p.x,p.y+8,12,4,'rgba(54,69,43,.16)');
    if(objective){ctx.strokeStyle='rgba(235,213,113,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y+4,17,9,0,0,Math.PI*2);ctx.stroke();}
    ctx.save();ctx.translate(p.x,p.y-4+bob);
    const color=items[p.item].color;
    if(p.item==='cart'){
      line(ctx,-13,-10,-9,-10,'#586f62',3);line(ctx,-9,-10,-5,7,'#5e7568',2);rect(ctx,-7,-6,20,11,'#6e8377');rect(ctx,-5,-4,17,7,'#c6d4b9');for(let i=0;i<4;i++)rect(ctx,-3+i*4,-5,1,9,'#8b9e8b');line(ctx,-5,7,14,7,'#66806d',2);rect(ctx,-4,9,4,4,'#4a6051');rect(ctx,10,9,4,4,'#4a6051');
    }else if(p.item==='bottle'){
      rect(ctx,-3,-12,6,5,'#d5caa0');rect(ctx,-4,-8,8,5,'#628d6d');rect(ctx,-6,-3,12,14,'#5e896b');rect(ctx,-4,1,8,5,'#d3cca2');rect(ctx,-3,-5,2,5,'#95b995');
    }else if(p.item==='burger'){
      rect(ctx,-10,-7,20,5,'#d7ab65');rect(ctx,-7,-10,14,4,'#e8bf74');rect(ctx,-11,-2,23,3,'#859754');rect(ctx,-10,1,21,4,'#77543a');rect(ctx,-10,5,20,5,'#d5a15b');rect(ctx,-5,-8,2,1,'#f6dfa1');rect(ctx,3,-7,2,1,'#f6dfa1');
    }else if(p.item==='tape'){
      rect(ctx,-12,-8,25,17,'#594e62');rect(ctx,-10,-6,21,9,color);rect(ctx,-7,-3,5,5,'#dfd7bb');rect(ctx,3,-3,5,5,'#dfd7bb');rect(ctx,-5,4,12,3,'#a9a18a');
    }else if(p.item==='tool'){
      line(ctx,-7,9,7,-6,'#647464',5);rect(ctx,3,-11,5,10,'#c2c6ad');rect(ctx,8,-11,5,7,'#c2c6ad');rect(ctx,1,-5,11,5,'#9da990');rect(ctx,-9,7,5,5,'#c1b379');
    }else if(p.item==='flyer'){
      rect(ctx,-8,-12,18,24,'#8c9474');rect(ctx,-10,-14,18,24,'#e9d7a6');rect(ctx,-7,-10,12,4,'#b78561');for(let i=0;i<3;i++)rect(ctx,-7,-2+i*4,11-i*2,1,'#9b9976');
    }else if(p.item==='pepperoni'){
      rect(ctx,-12,-4,23,9,'#a9644c');rect(ctx,-9,-7,18,3,'#c68564');rect(ctx,-9,5,18,3,'#8d5945');rect(ctx,7,-4,6,9,'#dcaa7d');rect(ctx,9,-2,2,2,'#a9624b');rect(ctx,-4,-3,3,2,'#e4b087');
    }else if(p.item==='part'){
      rect(ctx,-8,-9,16,19,'#778b79');rect(ctx,-12,-5,24,10,'#778b79');rect(ctx,-3,-12,6,24,'#778b79');rect(ctx,-5,-5,10,10,'#b1bda1');rect(ctx,-2,-2,4,4,'#536f5e');
    }else{
      rect(ctx,-11,-5,20,12,'#687c6b');rect(ctx,-8,-8,18,8,'#a7b19a');rect(ctx,-2,0,15,8,'#8b9e89');rect(ctx,-9,5,12,4,'#b4b99d');
    }
    ctx.restore();
  }

  drawCharacter(ctx,character) {
    this.drawSprite(ctx,character,character.x,character.y,'down',false);
    const name=character.name;const w=name.length*6.4+14;
    rounded(ctx,character.x-w/2,character.y+19,w,17,3,'rgba(54,70,49,.77)');text(ctx,name,character.x,character.y+28,10,'#f3edce');
  }

  drawPlayer(ctx) {
    const player=this.engine.state.player;
    this.drawSprite(ctx,{id:'player',color:'#d8b18b',hair:'#5a4837',shirt:'#526f58'},player.x,player.y,player.facing,this.engine.moving);
    const active=this.engine.moving;
    if(active&&Math.sin(this.time/90)>.7){rect(ctx,player.x-12,player.y+14,5,2,'rgba(211,203,161,.6)');}
  }

  drawSprite(ctx,c,x,y,facing='down',moving=false,shadow=true) {
    if(shadow)ellipse(ctx,x+1,y+10,14,5,'rgba(45,60,39,.24)');
    ctx.save();ctx.translate(Math.round(x-12),Math.round(y-31));ctx.scale(2,2);
    const r=(x,y,w,h,color)=>rect(ctx,x,y,w,h,color);
    const walk=moving?Math.round(Math.sin(this.time/95)*2):0;
    const id=c.id;
    // Shoes, separated legs, body, hands, neck and head use a consistent two-pixel grid.
    r(2,16+walk,3,5,'#3d4d42');r(7,16-walk,3,5,'#3d4d42');r(1,20+walk,4,2,'#35483b');r(7,20-walk,4,2,'#35483b');
    r(2,9,8,8,c.shirt);r(1,10,2,7,c.color);r(10,10,2,7,c.color);r(4,8,4,2,c.color);
    r(3,2,6,7,c.color);r(2,4,8,4,c.color);r(4,8,4,1,'#ba9171');
    r(3,1,6,3,c.hair);r(2,3,2,3,c.hair);r(8,3,2,3,c.hair);
    if(facing==='up'){
      r(3,2,6,7,c.hair);r(2,3,8,4,c.hair);
      if(id==='player'){r(3,10,6,7,'#c9aa62');r(4,11,4,4,'#dcc381');r(3,15,6,2,'#ac8d51');r(2,10,1,7,'#3c5140');r(9,10,1,7,'#3c5140');}
    }else{
      r(4,5,1,1,'#39483b');r(7,5,1,1,'#39483b');r(5,7,2,1,'#a9765a');
      if(facing==='left'){r(2,5,2,2,c.color);r(3,5,1,1,'#39483b');r(7,5,1,1,c.color);}
      if(facing==='right'){r(8,5,2,2,c.color);r(8,5,1,1,'#39483b');r(4,5,1,1,c.color);}
    }
    if(id==='bubbles'){
      r(2,1,8,2,'#c5a163');r(1,2,3,2,'#b7955a');r(8,2,3,2,'#b7955a');
      r(2,4,4,4,'#394b40');r(7,4,4,4,'#394b40');r(3,4,2,3,'#e1dbc1');r(8,4,2,3,'#e1dbc1');r(6,5,1,1,'#394b40');r(4,5,1,1,'#3c4d42');r(8,5,1,1,'#3c4d42');
      r(3,10,6,1,'#a4b3ae');r(4,12,1,3,'#668595');r(7,12,1,3,'#668595');
    }else if(id==='ricky'){
      r(2,0,6,2,'#40362b');r(3,-1,4,2,'#40362b');r(2,1,8,2,'#51402f');r(2,7,2,2,'#624b35');r(8,7,2,2,'#624b35');
      for(let sy=10;sy<17;sy+=2)for(let sx=2;sx<10;sx+=2)r(sx,sy,1,1,'#dfd5b3');
      r(5,10,1,7,'#493e32');r(1,14,2,2,'#ede2c4');r(10,14,2,2,'#ede2c4');
    }else if(id==='julian'){
      r(2,1,8,3,'#292c27');r(3,7,6,2,'#453e30');r(4,6,1,1,'#453e30');r(7,6,1,1,'#453e30');r(1,10,10,4,'#303a33');r(2,14,8,3,'#303a33');
      r(10,13,3,5,'#cbbc88');r(11,13,2,3,'#8e6540');r(10,12,3,1,'#e0d7b1');
    }else if(id==='randy'){
      r(1,10,10,7,c.color);r(0,12,12,4,c.color);r(3,16,7,2,'#c79370');r(5,14,1,1,'#b07d5b');r(2,17,8,2,'#9c9272');r(2,18,3,3,'#afaa88');r(7,18,3,3,'#afaa88');
      r(4,7,4,1,'#775c42');
    }else if(id==='lahey'){
      r(2,1,8,2,'#b2b3a3');r(1,3,2,4,'#aeafa0');r(9,3,2,4,'#aeafa0');r(5,10,1,7,'#d1c69e');r(3,11,2,2,'#e0d3a7');r(7,11,2,2,'#e0d3a7');r(3,15,6,1,'#6b7359');
    }else if(id==='jroc'){
      r(2,0,8,3,'#788f90');r(1,2,11,2,'#98aba0');r(9,2,4,2,'#617e7b');r(4,10,4,1,'#d9d3b1');r(5,11,2,5,'#d9c077');r(5,15,2,2,'#d9c077');r(2,17,8,2,'#647b86');
    }else if(id==='sarah'){
      r(1,1,10,3,'#9e5438');r(1,3,2,8,'#a95d3c');r(9,3,2,8,'#a95d3c');r(4,9,4,2,'#c9aa96');r(3,11,6,6,'#87677d');r(1,14,2,1,'#d9be8f');
    }else if(id==='cory'){
      r(2,1,8,2,'#55715f');r(1,3,10,2,'#819783');r(0,3,4,1,'#a0ae94');r(3,11,1,5,'#89a1ab');r(8,11,1,5,'#89a1ab');
    }else if(id==='player'){
      r(3,10,2,2,'#809172');r(7,10,2,2,'#809172');r(5,10,1,7,'#354b3d');r(3,14,2,2,'#3b5644');r(7,14,2,2,'#3b5644');
      if(facing!=='up'){r(9,10,2,7,'#c5a464');r(10,12,2,5,'#d5b676');r(9,14,2,1,'#8c754c');}r(3,17,7,1,'#a7a187');
    }
    ctx.restore();
  }

  drawMarker(ctx,x,y,type) {
    const bob=Math.sin(this.time/600+x)*2;
    ctx.save();ctx.translate(x,y+bob);
    if(type==='quest'){
      rounded(ctx,-9,-12,18,23,4,'#566747');rounded(ctx,-8,-14,16,22,3,'#e9c65f');text(ctx,'!',0,-2,18,'#485b3e');
      ctx.fillStyle='#e9c65f';ctx.beginPath();ctx.moveTo(-4,8);ctx.lineTo(4,8);ctx.lineTo(0,13);ctx.fill();
    }else{
      ctx.fillStyle='#4d7268';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(10,0);ctx.lineTo(0,12);ctx.lineTo(-10,0);ctx.fill();ctx.fillStyle='#a8ddd1';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(6,0);ctx.lineTo(0,8);ctx.lineTo(-6,0);ctx.fill();
    }
    ctx.restore();
  }

  drawMinimap(canvas,full=false) {
    if(!canvas)return;
    const bounds=canvas.getBoundingClientRect();
    const width=bounds.width||canvas.clientWidth||(full?900:240);
    const height=bounds.height||canvas.clientHeight||(full?640:170);
    const dpr=Math.min(window.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    }
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
    rect(ctx,0,0,width,height,full?'#e9e2c6':'#9eae7a');
    const pad=full?24:8,top=full?46:8;
    const scale=Math.min((width-pad*2)/WORLD.width,(height-top-pad)/WORLD.height);
    const mx=(width-WORLD.width*scale)/2,my=top+(height-top-pad-WORLD.height*scale)/2;
    if(full){text(ctx,'SUNNYVALE / PARK DIRECTORY',pad,22,13,'#4d6246','left');text(ctx,'YOU ARE HERE',width-pad,22,10,'#738064','right');}
    ctx.save();ctx.translate(mx,my);ctx.scale(scale,scale);
    ctx.drawImage(this.terrain,0,0);
    for(const b of locations){rect(ctx,b.x+8,b.y+10,b.w,b.h,'#7d8e64');rect(ctx,b.x,b.y,b.w,b.h,b.roofColor);rect(ctx,b.x,b.y+b.h-30,b.w,30,b.color);rect(ctx,b.door.x-14,b.y+b.h,28,15,'#e2d8b3');}
    for(const prop of this.scenery)if(prop.type==='tree'){rect(ctx,prop.x-19,prop.y-47,38,42,'#6d8950');rect(ctx,prop.x-13,prop.y-57,26,55,'#7d9758');}
    const objectives=this.objectives();
    for(const c of characters){const available=this.engine.getAvailableQuests(c.id).length;const objective=objectives.characters.has(c.id);ellipse(ctx,c.x,c.y,full?13:17,full?13:17,objective?'#9ce0d2':available?'#ffe28a':'#dee5bd');}
    if(full){
      for(const b of locations){
        const labelW=(b.shortName.length*5.5+12)/scale;
        rounded(ctx,b.x+b.w/2-labelW/2,b.y+b.h+47,labelW,17/scale,3/scale,'rgba(52,69,47,.88)');
        text(ctx,b.shortName,b.x+b.w/2,b.y+b.h+47+8.5/scale,9/scale,'#fbf2ce');
      }
      for(const c of characters){text(ctx,c.name,c.x,c.y-30,8/scale,'#364f3c');}
    }
    const camera=this.camera;
    ctx.strokeStyle=full?'rgba(255,250,222,.65)':'rgba(255,250,222,.8)';ctx.lineWidth=1/scale;ctx.strokeRect(camera.x,camera.y,Math.min(camera.w,WORLD.width),Math.min(camera.h,WORLD.height));
    const p=this.engine.state.player;
    ellipse(ctx,p.x,p.y,(full?7:5)/scale,(full?7:5)/scale,'#435d44');ellipse(ctx,p.x,p.y,(full?4:3)/scale,(full?4:3)/scale,'#fff7d9');
    ctx.restore();
    ctx.strokeStyle=full?'#a8b18a':'rgba(245,238,203,.23)';ctx.lineWidth=1;ctx.strokeRect(mx,my,WORLD.width*scale,WORLD.height*scale);
  }

  drawPortrait(canvas,character) {
    if(!canvas||!character)return;
    const bounds=canvas.getBoundingClientRect();const width=bounds.width||112,height=bounds.height||112;
    const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
    rect(ctx,0,0,width,height,'#bdc69a');
    for(let y=0;y<height;y+=8)for(let x=0;x<width;x+=8)if(hash(x,y,9)>.65)rect(ctx,x,y,3,2,'#b0bc8a');
    rect(ctx,0,height*.72,width,height*.28,'#b0b78a');
    const scale=Math.min(width/34,height/45);
    ctx.save();ctx.translate(width/2,height*.76);ctx.scale(scale,scale);this.drawSprite(ctx,character,0,0,'down',false);ctx.restore();
  }

  drawWelcome(canvas) {
    if(!canvas)return;
    const bounds=canvas.getBoundingClientRect();const width=bounds.width||800,height=bounds.height||360;
    const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
    const scale=Math.max(width/1500,height/650);
    ctx.save();ctx.scale(scale,scale);ctx.translate(-450,-125);ctx.drawImage(this.terrain,0,0);
    const scene=[...locations.map(b=>({y:b.y+b.h,draw:()=>this.drawBuilding(ctx,b)})),...this.scenery.map(p=>({y:p.y,draw:()=>this.drawProp(ctx,p)})),...characters.map(c=>({y:c.y,draw:()=>this.drawCharacter(ctx,c)}))];
    scene.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());ctx.restore();
    const glow=ctx.createLinearGradient(0,0,width,height);glow.addColorStop(0,'rgba(246,221,156,.14)');glow.addColorStop(1,'rgba(39,58,34,.10)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
  }
}
