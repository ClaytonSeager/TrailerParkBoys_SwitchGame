import { WORLD, locations, roads, roadPaths, landmarks, PARK_BOUNDS, REGIONS, getRegionAt } from './story/locations.js';
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
    this.tileSize=1024;this.tiles=new Map();this.maxTerrainTiles=12;
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
    this.zoomLevel = this.zoomLevel || (this.width < 600 ? 1.3 : 1.65);
    this.zoom = this.zoomLevel;
    this.updateCamera(true);
  }

  setZoom(value) {
    this.zoomLevel=clamp(value,.8,2.6);
    this.zoom=this.zoomLevel;
    this.updateCamera(true);
    return this.zoomLevel;
  }

  adjustZoom(delta) { return this.setZoom((this.zoomLevel||1)+delta); }

  updateCamera(snap = false, dt = .016) {
    const player=this.engine.state.player;
    const bounds=this.engine.getWorldBounds?.()||WORLD;
    const inside=this.engine.state.scene&&this.engine.state.scene!=='park';
    const z=this.zoom;
    this.renderZoom=z;
    const w=this.width/z,h=this.height/z;
    const targetX=bounds.width>w?clamp(player.x-w*.5,0,bounds.width-w):(bounds.width-w)/2;
    const targetY=bounds.height>h?clamp(player.y-h*(inside?.57:.65),0,bounds.height-h):(bounds.height-h)/2;
    const scene=this.engine.state.scene||'park';
    const blend=snap||this.lastScene!==scene?1:Math.min(1,dt*9);
    this.camera.x+=(targetX-this.camera.x)*blend;
    this.camera.y+=(targetY-this.camera.y)*blend;
    this.camera.w=w;this.camera.h=h;this.lastScene=scene;
  }

  roadLine(ctx,path,color,width) {
    const pts=path.points;if(!pts.length)return;
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
    // Interpolating curves pass through junctions, so every branch really meets its road.
    for(let i=0;i<pts.length-1;i++){const a=pts[Math.max(0,i-1)],b=pts[i],c=pts[i+1],d=pts[Math.min(pts.length-1,i+2)];ctx.bezierCurveTo(b.x+(c.x-a.x)/6,b.y+(c.y-a.y)/6,c.x-(d.x-b.x)/6,c.y-(d.y-b.y)/6,c.x,c.y);}
    ctx.stroke();
  }

  makeTerrain(tx,ty) {
    const size=this.tileSize,bx=tx*size,by=ty*size;
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d',{alpha:false});
    ctx.translate(-bx,-by);rect(ctx,bx,by,size,size,'#789855');
    if(bx<PARK_BOUNDS.width&&by<PARK_BOUNDS.height)rect(ctx,0,0,PARK_BOUNDS.width,PARK_BOUNDS.height,'#82a05b');
    rect(ctx,7100,4300,2450,2050,'#929c83');
    for(let y=Math.floor(by/12)*12;y<by+size;y+=12)for(let x=Math.floor(bx/12)*12;x<bx+size;x+=12){
      const n=hash(x,y);if(n>.73)rect(ctx,x+n*5,y+3,3,2,'#95af65');
      if(n<.19){rect(ctx,x+4,y+6,2,4,'#708f4c');rect(ctx,x+7,y+7,2,3,'#708f4c');}
      if(n>.96){rect(ctx,x,y,4,2,'#b6bd70');rect(ctx,x+1,y-1,2,4,'#b6bd70');}
    }
    // Lake shoreline and the quarry sit beneath roads and boardwalks.
    ellipse(ctx,4950,5600,650,530,'#b4b07e');ellipse(ctx,4950,5600,615,505,'#426e69');ellipse(ctx,4965,5600,590,480,'#5a9992');ellipse(ctx,4980,5580,550,440,'#6baea2');
    for(let i=0;i<170;i++){const px=4400+hash(i,77)*1100,py=5200+hash(i,63)*800;if(((px-4950)/560)**2+((py-5600)/450)**2<1)rect(ctx,px,py,13+hash(i,2)*24,2,'#90c5b2');}
    ellipse(ctx,5440,2460,530,340,'#a69c76');ellipse(ctx,5440,2460,450,280,'#b8b08b');
    for(const b of locations){
      if(b.x+b.w<bx-80||b.x>bx+size+80||b.y+b.h+130<by||b.y>by+size)continue;
      const lx=b.x-20,ly=b.y-20,lw=b.w+42,lh=b.h+126;
      rect(ctx,lx,ly,lw,lh,b.generic?'#9eb273':'#a5b879');
      for(let i=0;i<60;i++){const x=lx+hash(i,b.x)*lw,y=ly+hash(i,b.y)*lh;rect(ctx,x,y,2+hash(i,4)*3,2,'#8da65e');}
      // Concrete stoop, cracked stepping stones, and private dirt driveway.
      rect(ctx,b.door.x-19,b.y+b.h,38,91,'#bfb38f');
      for(let i=0;i<5;i++){rect(ctx,b.door.x-17,b.y+b.h+7+i*16,34,12,'#d1c39e');line(ctx,b.door.x-12,b.y+b.h+10+i*16,b.door.x+4,b.y+b.h+13+i*16,'#b4a987',1);}
      rect(ctx,b.x+b.w-37,b.y+b.h+10,48,84,'#a49a74');
      for(let i=0;i<25;i++)rect(ctx,b.x+b.w-33+hash(i,34)*42,b.y+b.h+15+hash(i,b.x)*74,2,1,'#c5b68e');
      // Short fences define the narrow lived-in lots, leaving their front completely open.
      for(let fy=b.y-15;fy<b.y+b.h+91;fy+=15){rect(ctx,b.x-18,fy,4,10,'#a9976b');rect(ctx,b.x+b.w+18,fy,4,10,'#a9976b');}
      rect(ctx,b.x-18,b.y-17,b.w+40,4,'#9a8b60');
    }
    rect(ctx,7640,4860,660,190,'#8c9586');for(let i=0;i<12;i++){line(ctx,7660+i*52,4880,7660+i*52,4940,'#dad7b0',2);line(ctx,7660+i*52,4980,7660+i*52,5040,'#dad7b0',2);}
    rect(ctx,3000,3075,430,140,'#9fa38c');rect(ctx,7400,5660,1480,95,'#aeb49d');
    for(let x=7440;x<8870;x+=50)line(ctx,x,5668,x,5725,'#dad9b9',2);
    for(const [cx,cy]of [[7300,5100],[8400,5100],[8400,5840],[9200,5840]])for(let i=0;i<6;i++)rect(ctx,cx-37+i*14,cy-48,7,96,'rgba(232,228,197,.65)');
    for(const path of roadPaths){const paved=path.kind==='highway'||path.kind==='city';this.roadLine(ctx,path,paved?'#a5a68c':'#687b4b',path.width+13);this.roadLine(ctx,path,paved?'#9d9f8d':'#9d9576',path.width+5);this.roadLine(ctx,path,paved?'#667671':'#b4a88a',path.width);if(paved){ctx.setLineDash([23,26]);this.roadLine(ctx,path,path.kind==='highway'?'#d5c17b':'#d4d1ad',2);ctx.setLineDash([]);}}
    // Gravel and worn tracks follow the curves rather than imposing a square road grid.
    for(const path of roadPaths)for(let i=0;i<path.points.length-1;i++){
      const a=path.points[i],b=path.points[i+1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
      if(Math.max(a.x,b.x)<bx-120||Math.min(a.x,b.x)>bx+size+120||Math.max(a.y,b.y)<by-120||Math.min(a.y,b.y)>by+size+120)continue;
      if(path.kind==='highway'||path.kind==='city')continue;
      for(let j=0;j<len*1.4;j++){const t=hash(j,i+13),spread=(hash(j,i+40)-.5)*(path.width-10);rect(ctx,a.x+dx*t+nx*spread,a.y+dy*t+ny*spread,2,1,j%3?'#c2b698':'#a69a7b');}
      for(const offset of [-15,15]){ctx.globalAlpha=.16;line(ctx,a.x+nx*offset,a.y+ny*offset,b.x+nx*offset,b.y+ny*offset,'#736e55',2);ctx.globalAlpha=1;}
    }
    // Small overgrown pond, weathered edge fence, and an open entrance lawn.
    ellipse(ctx,3270,400,82,132,'#5c855b');ellipse(ctx,3270,400,71,119,'#62978e');ellipse(ctx,3276,390,61,104,'#7faf9d');
    for(let i=0;i<22;i++)rect(ctx,3230+hash(i,5)*82,300+hash(i,12)*190,10,2,'#a5c6af');
    for(let x=40;x<PARK_BOUNDS.width-20;x+=24){rect(ctx,x,130,5,24,'#927f57');rect(ctx,x,132,5,2,'#bea476');}rect(ctx,30,140,PARK_BOUNDS.width-60,4,'#a28d60');
    for(let y=160;y<PARK_BOUNDS.height-30;y+=28){rect(ctx,60,y,5,24,'#897c55');rect(ctx,PARK_BOUNDS.width-65,y,5,24,'#897c55');}
    for(let i=0;i<80;i++){const x=1540+hash(i,36)*250,y=2270+hash(i,87)*100;if(Math.abs(x-1660)<75)continue;rect(ctx,x,y,2,6,'#5e8349');rect(ctx,x-2,y-2,5,3,i%2?'#e4ca7e':'#c58d64');}    return canvas;
  }

  drawTerrain(ctx,view=this.camera) {
    const s=this.tileSize,x0=Math.max(0,Math.floor(view.x/s)),y0=Math.max(0,Math.floor(view.y/s)),x1=Math.min(Math.ceil(WORLD.width/s)-1,Math.floor((view.x+view.w)/s)),y1=Math.min(Math.ceil(WORLD.height/s)-1,Math.floor((view.y+view.h)/s));
    const visible=new Set();
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const key=`${x},${y}`;visible.add(key);let tile=this.tiles.get(key);if(!tile)tile=this.makeTerrain(x,y);this.tiles.delete(key);this.tiles.set(key,tile);ctx.drawImage(tile,x*s,y*s);}
    // Wide monitors can need more than twelve tiles at minimum zoom. Keep the
    // visible set so a stationary camera never re-rasterizes its own terrain.
    while(this.tiles.size>Math.max(this.maxTerrainTiles,visible.size)){const key=[...this.tiles.keys()].find(id=>!visible.has(id));if(!key)break;const old=this.tiles.get(key);this.tiles.delete(key);old.width=1;old.height=1;}
  }

  makeScenery() {
    this.scenery=[];const add=(x,y,type,extra={})=>this.scenery.push({x,y,type,...extra});
    for(let x=40;x<WORLD.width-20;x+=67)add(x+hash(x,2)*22,112+hash(x,1)*19,'tree',{size:.82+hash(x,7)*.34});
    for(let y=300;y<WORLD.height-30;y+=128){add(45,y,'tree',{size:1.1});add(WORLD.width-35,y+22,'tree',{size:1.15});}
    for(const [index,b]of locations.entries()){
      const y=b.y+b.h;
      add(b.x-9,y+31,'mailbox');
      if(index%2===0)add(b.x+b.w+3,y+35,'bin');
      if(index%3===0)add(b.x+26,y+56,'picnic');
      if(index%4===0)add(b.x+b.w-14,b.y-2,'tree',{size:.72});
      if(index%3!==0)add(b.x+b.w-12,y+66,'car',{color:['#9b624a','#547a70','#b3a86a','#6d7780'][index%4],dir:'v'});
      if(index%4===1)add(b.x+42,y+76,'laundry');
      if(index%5===0)add(b.x+24,y+14,'planter');
      if(index%7===0)add(b.x+65,y+27,'tires');
    }
    const bubbles=locations.find(b=>b.id==='bubbles');for(const [dx,dy,c]of [[-30,52,'#d7bd87'],[120,61,'#585b4d'],[30,91,'#e7d9b4'],[155,24,'#a3a79a']])add(bubbles.x+dx,bubbles.y+bubbles.h+dy,'cat',{color:c});
    for(const [x,y]of [[2450,1310],[2735,1320],[865,1315]])add(x,y,'cone');
    add(435,1710,'junk');add(2520,1690,'speaker');add(2710,1690,'speaker');add(1660,2360,'entrance');
    for(const [x,y]of [[320,790],[1430,800],[2400,800],[350,1370],[1860,1370],[3040,1370],[1260,1950],[2630,1960]])add(x,y,'lamp');
    // Quiet forest shoulders frame the long drive without placing trees on the asphalt.
    const roadDistance=(x,y)=>{let best=Infinity;for(const path of roadPaths)for(let i=0;i<path.points.length-1;i++){const a=path.points[i],b=path.points[i+1],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);best=Math.min(best,Math.hypot(x-a.x-dx*t,y-a.y-dy*t));}return best;};
    for(let y=2450;y<6320;y+=145)for(let x=190;x<9490;x+=150){const px=x+hash(x,y)*64,py=y+hash(y,x)*55;if(hash(x,y,9)<.35||getRegionAt(px,py).id==='city'||roadDistance(px,py)<115||locations.some(b=>px>b.x-100&&px<b.x+b.w+100&&py>b.y-100&&py<b.y+b.h+180)||((px-4950)/720)**2+((py-5600)/570)**2<1||((px-5440)/570)**2+((py-2460)/390)**2<1)continue;add(px,py,'tree',{size:.9+hash(x,y,8)*.6});}
    for(let x=7380;x<9360;x+=200){add(x,5310,'cityLamp');add(x+70,5940,'cityLamp');}
    for(const [x,y]of [[3200,3180],[4140,3530],[5340,4010],[6900,4590]])add(x,y,'roadSign',{label:x<3500?'GAS + GO  /  CITY →':x<5000?'OLD MILL LAKE  ↓':x<6000?'ROCKY RIDGE  ↑':'DARTMOUTH EAST  →'});
    add(1880,2740,'billboard',{label:'DARTMOUTH EAST',sub:'ROUTE 7 / 6 KM'});add(7040,4490,'billboard',{label:'WELCOME TO DARTMOUTH',sub:'TAKE YOUR TIME. BUY SOMETHING.'});
    add(3150,3150,'gasPump');add(3260,3150,'gasPump');
    add(4440,5210,'dock');add(4525,5350,'bench');
    for(const [x,y]of [[5140,2460],[5460,2520],[5700,2370],[5290,2680]])add(x,y,'gravelPile');
    for(const [x,y]of [[6410,3035],[6630,3055],[6750,3030]]){add(x,y,'tires');add(x+37,y+20,'junk');}
    for(let i=0;i<5;i++)add(7690+i*104,5000,'car',{color:['#84624e','#536f79','#81916f','#b6a16a','#a26650'][i],dir:'v'});
    for(const [x,y]of [[8070,5720],[8280,5720],[8760,5735]])add(x,y,'picnic');

  }

  visible(x,y,pad=160) {
    return x>this.camera.x-pad && x<this.camera.x+this.camera.w+pad && y>this.camera.y-pad && y<this.camera.y+this.camera.h+pad;
  }

  draw(time=0,dt=.016) {
    this.time=time;this.updateCamera(false,dt);
    const ctx=this.ctx,inside=this.engine.state.scene&&this.engine.state.scene!=='park';
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);rect(ctx,0,0,this.width,this.height,inside?'#29392d':C.grass);
    ctx.save();ctx.scale(this.renderZoom||this.zoom,this.renderZoom||this.zoom);ctx.translate(-Math.round(this.camera.x),-Math.round(this.camera.y));ctx.imageSmoothingEnabled=false;
    if(inside){
      const room=this.engine.getInterior?.();if(room)this.drawInterior(ctx,room);this.drawTrackedMarker(ctx);
      const residents=this.engine.getCharacters?.()||[];for(const resident of residents.filter(r=>r.y<=this.engine.state.player.y))this.drawCharacter(ctx,resident);this.drawPlayer(ctx);for(const resident of residents.filter(r=>r.y>this.engine.state.player.y))this.drawCharacter(ctx,resident);this.drawCombatEffects(ctx);ctx.restore();return;
    }
    this.drawTerrain(ctx);
    const collected=new Set(this.engine.state.collected),objectives=this.objectives();
    for(const pickup of pickups)if(!collected.has(pickup.id)&&this.visible(pickup.x,pickup.y,35))this.drawPickup(ctx,pickup,objectives.items.has(pickup.item));
    const scene=[];
    for(const building of locations)if(this.visible(building.x+building.w/2,building.y+building.h))scene.push({y:building.y+building.h,draw:()=>this.drawBuilding(ctx,building)});
    for(const prop of this.scenery)if(this.visible(prop.x,prop.y))scene.push({y:prop.y+(prop.type==='tree'?6:4),draw:()=>this.drawProp(ctx,prop)});
    for(const character of (this.engine.getCharacters?.()||characters))if(this.visible(character.x,character.y)){
      // An encounter actor replaces their ordinary standing sprite.
      if(this.engine.encounter?.actors?.some(actor=>actor.id===character.id))continue;
      scene.push({y:character.y+10,draw:()=>this.drawCharacter(ctx,character)});
    }
    const vehicle=this.engine.state.vehicle;
    if(vehicle&&this.visible(vehicle.x,vehicle.y))scene.push({y:vehicle.y+14,draw:()=>this.drawVehicle(ctx,vehicle)});
    this.drawCombatEffects(ctx,true);
    for(const actor of this.engine.encounter?.actors||[])if(this.visible(actor.x,actor.y))scene.push({y:actor.y+10,draw:()=>this.drawEncounterActor(ctx,actor)});
    if(!vehicle?.driving)scene.push({y:this.engine.state.player.y+10,draw:()=>this.drawPlayer(ctx)});
    scene.sort((a,b)=>a.y-b.y).forEach(obj=>obj.draw());
    const nearest=this.engine.nearestInteractable();
    if(nearest&&nearest.type!=='vehicle'){
      const point=nearest.type==='location'?nearest.entity.door:nearest.entity;
      ctx.strokeStyle='rgba(255,245,207,.8)';ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.ellipse(point.x,point.y+10,24,11,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    }
    for(const character of (this.engine.getCharacters?.()||characters)){if(!this.visible(character.x,character.y))continue;
      if(objectives.characters.has(character.id))this.drawMarker(ctx,character.x,character.y-65,'diamond');
      else if(this.engine.getAvailableQuests(character.id).length)this.drawMarker(ctx,character.x,character.y-65,'quest');
    }
    for(const location of locations)if(objectives.locations.has(location.id)&&this.visible(location.door.x,location.door.y))this.drawMarker(ctx,location.door.x,location.door.y-24,'diamond');
    if(vehicle&&!vehicle.driving&&Math.hypot(vehicle.x-this.engine.state.player.x,vehicle.y-this.engine.state.player.y)<135){rounded(ctx,vehicle.x-49,vehicle.y-46,98,19,3,'#354c37');text(ctx,'E · SHITMOBILE',vehicle.x,vehicle.y-36,9,'#f5dfa4');}
    this.drawTrackedMarker(ctx);this.drawCombatEffects(ctx,false);
    const minute=this.engine.state.minutes;if(minute>1020){ctx.fillStyle=`rgba(112,79,45,${Math.min(.08,(minute-1020)/3000)})`;ctx.fillRect(this.camera.x,this.camera.y,this.camera.w,this.camera.h);}
    ctx.restore();
  }

  drawTrackedMarker(ctx) {
    const target=this.engine.trackedTarget;
    if(!target||target.scene!==this.engine.state.scene||!this.visible(target.x,target.y,70))return;
    ctx.save();ctx.strokeStyle='#b1e3c8';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(target.x,target.y+8,25+Math.sin(this.time/450)*2,12,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(target.x+32,target.y-7);ctx.lineTo(target.x+38,target.y);ctx.lineTo(target.x+32,target.y+7);ctx.lineTo(target.x+26,target.y);ctx.closePath();ctx.fillStyle='#c4ead3';ctx.fill();ctx.restore();
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
    if(b.id==='ricky'){this.drawRickyYard(ctx,b);return;}
    if(b.region){this.drawDestination(ctx,b);return;}
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
    // Satellite dish, weathering and bolted roof trim distinguish individual homes.
    for(let i=0;i<6;i++){const rx=x+55+hash(i,x)*Math.max(5,w-125),ry=y+6+hash(i,y)*Math.max(4,roofH-20);rect(ctx,rx,ry,3+hash(i,8)*7,2,'rgba(148,100,59,.3)');}
    line(ctx,x+14,y+18,x+11,y-15,'#495b45',2);line(ctx,x+1,y-9,x+26,y-9,'#64765a',2);line(ctx,x+4,y-15,x+22,y-15,'#64765a',1);
    if(b.generic||b.kind==='trailer'){ellipse(ctx,x+w-84,y+19,12,7,'#c4c5a7');line(ctx,x+w-84,y+20,x+w-78,y+31,'#6b7c60',2);rect(ctx,x+w-89,y+31,15,3,'#526b51');}
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
      rect(ctx,x+113,y+roofH+7,100,17,'#e4d9b4');text(ctx,'CORY + JACOB',x+163,y+roofH+16,8,'#4c604f');
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
      rect(ctx,x+12,y+22,w-24,24,'#dbbd6d');text(ctx,'SUNNYVALE BLOCK PARTY',x+w/2,y+34,10,'#5b613f');
      for(let i=0;i<7;i++){const bx=x+15+i*29;ctx.fillStyle=i%2?'#e2c661':'#a5735d';ctx.beginPath();ctx.moveTo(bx,y+56);ctx.lineTo(bx+18,y+56);ctx.lineTo(bx+9,y+72);ctx.fill();}
    }
    // Readable, quiet labels sit below each structure.
    const label=b.shortName;const labelW=Math.max(66,label.length*6.6+18);
    rounded(ctx,x+w/2-labelW/2,bottom+40,labelW,21,3,'rgba(54,70,49,.84)');text(ctx,label,x+w/2,bottom+51,10,'#f5edca');
  }

  drawProp(ctx,p) {
    const {x,y,type}=p;
    if(['roadSign','billboard','gasPump','dock','gravelPile','cityLamp','bench'].includes(type)){this.drawTravelProp(ctx,p);return;}
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
    }else if(p.item==='fuelCan'){rect(ctx,-9,-11,18,23,'#a85f3e');rect(ctx,-5,-15,11,4,'#635c3e');rect(ctx,-3,-11,4,4,'#c8aa69');rect(ctx,-6,-3,12,9,'#d4b07c');line(ctx,-4,-1,4,5,'#9c6240',2);
    }else if(p.item==='mallReceipt'){rect(ctx,-8,-13,17,27,'#e5d6ae');for(let i=0;i<5;i++)rect(ctx,-5,-9+i*4,11-i%2*3,1,'#9b9974');
    }else if(p.item==='quarryStone'){rect(ctx,-11,-4,22,14,'#7f8d7a');rect(ctx,-8,-10,15,9,'#b9b99a');rect(ctx,-3,-8,10,4,'#d4cfac');rect(ctx,6,-3,7,9,'#8f9c85');
    }else if(p.item==='fishingTackle'){rect(ctx,-12,-7,25,17,'#5d8373');rect(ctx,-9,-10,18,4,'#95ad8c');rect(ctx,-3,-13,7,3,'#4d6d59');rect(ctx,-11,0,23,2,'#b1c199');rect(ctx,-2,0,4,4,'#ddd09a');
    }else if(p.item==='vinylRecord'){ellipse(ctx,0,0,12,12,'#354b3c');ellipse(ctx,0,0,8,8,'#53674e');ellipse(ctx,0,0,4,4,'#b5a379');rect(ctx,-1,-1,2,2,'#e2d3a4');
    }else if(p.item==='deliveryParcel'){rect(ctx,-12,-11,25,23,'#a8844f');rect(ctx,-10,-9,21,19,'#c19c64');rect(ctx,-2,-10,5,21,'#dfc592');rect(ctx,4,-4,6,7,'#e8d9b1');
    }else if(p.item==='part'){
      rect(ctx,-8,-9,16,19,'#778b79');rect(ctx,-12,-5,24,10,'#778b79');rect(ctx,-3,-12,6,24,'#778b79');rect(ctx,-5,-5,10,10,'#b1bda1');rect(ctx,-2,-2,4,4,'#536f5e');
    }else{
      rect(ctx,-11,-5,20,12,'#687c6b');rect(ctx,-8,-8,18,8,'#a7b19a');rect(ctx,-2,0,15,8,'#8b9e89');rect(ctx,-9,5,12,4,'#b4b99d');
    }
    ctx.restore();
  }

  drawCharacter(ctx,character) {
    this.drawSprite(ctx,character,character.x,character.y,character.facing||'down',!!character.moving);
    const name=character.name;const w=name.length*6.4+14;
    rounded(ctx,character.x-w/2,character.y+24,w,17,3,'rgba(54,70,49,.77)');text(ctx,name,character.x,character.y+33,10,'#f3edce');
    if(character.reaction&&character.reactionTimer>0){const words=character.reaction.split(' ');const lines=[''];for(const word of words){const i=lines.length-1;if((lines[i]+' '+word).length>27)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}const bw=Math.min(188,Math.max(...lines.map(v=>v.length))*6+17),bh=lines.length*13+12,bx=character.x-bw/2,by=character.y-64-bh;rounded(ctx,bx+2,by+3,bw,bh,4,'rgba(33,49,34,.24)');rounded(ctx,bx,by,bw,bh,4,'#f1e3bb');ctx.fillStyle='#f1e3bb';ctx.beginPath();ctx.moveTo(character.x-5,by+bh);ctx.lineTo(character.x+4,by+bh);ctx.lineTo(character.x,by+bh+7);ctx.fill();lines.forEach((t,i)=>text(ctx,t,character.x,by+12+i*13,9,'#445e40'));}
  }

  drawPlayer(ctx) {
    const player=this.engine.state.player;
    ctx.save();if(this.engine.encounter?.invulnerable>0&&Math.sin(this.time/45)>0)ctx.globalAlpha=.55;
    this.drawSprite(ctx,{id:'player',color:'#d8b18b',hair:'#5a4837',shirt:'#526f58'},player.x,player.y,player.facing,this.engine.moving);ctx.restore();
    const active=this.engine.moving;
    if(active&&Math.sin(this.time/90)>.7){rect(ctx,player.x-12,player.y+14,5,2,'rgba(211,203,161,.6)');}
  }

  drawSprite(ctx,c,x,y,facing='down',moving=false,shadow=true) {
    if(shadow)ellipse(ctx,x+2,y+10,17,6,'rgba(31,49,32,.3)');
    ctx.save();ctx.translate(Math.round(x-15),Math.round(y-36));ctx.scale(1.25,1.25);
    const r=(x,y,w,h,color)=>rect(ctx,x,y,w,h,color);
    const tone=(hex,n)=>{const v=parseInt((hex||'#bca782').slice(1),16);return '#'+[v>>16,(v>>8)&255,v&255].map(ch=>clamp(ch+n,0,255).toString(16).padStart(2,'0')).join('');};
    const id=c.id,skin=c.color||'#d7ae85',shirt=c.shirt||'#688b78',hair=c.hair||'#6b5039',ink='#304035';
    const walk=moving?Math.round(Math.sin(this.time/90)*2):0;
    // Hand-placed 24x36 pixel silhouettes: outlines stay one pixel wide at every zoom.
    r(5,27+walk,6,10,ink);r(14,27-walk,6,10,ink);
    r(6,28+walk,4,7,'#657361');r(15,28-walk,4,7,'#596855');
    r(4,35+walk,7,3,ink);r(14,35-walk,8,3,ink);r(6,35+walk,4,1,'#89927b');r(16,35-walk,4,1,'#7d8975');
    r(5,15,15,15,ink);r(3,17,4,11,ink);r(19,17,4,11,ink);
    r(6,16,13,13,shirt);r(6,16,13,3,tone(shirt,16));r(16,19,3,10,tone(shirt,-15));
    r(4,18,2,7,shirt);r(20,18,2,7,shirt);r(4,25,3,4,skin);r(19,25,3,4,skin);r(4,28,3,1,tone(skin,-25));r(19,28,3,1,tone(skin,-25));
    r(9,13,7,4,ink);r(10,13,5,4,skin);r(10,15,5,1,tone(skin,-18));
    r(6,2,12,13,ink);r(5,5,14,7,ink);r(7,3,10,11,skin);r(6,6,12,6,skin);
    r(7,4,3,7,tone(skin,13));r(15,7,3,5,tone(skin,-18));r(9,13,7,1,tone(skin,-22));
    r(6,1,12,4,hair);r(5,3,3,6,hair);r(17,3,2,6,hair);r(7,1,9,1,tone(hair,14));
    if(facing==='up'){
      r(6,3,12,11,hair);r(8,3,8,2,tone(hair,12));r(7,12,10,2,tone(hair,-12));
    }else{
      const eye=facing==='left'?-2:facing==='right'?2:0;
      r(8+eye,7,3,2,'#f1e4c7');r(14+eye,7,3,2,'#f1e4c7');r(9+eye,7,1,2,ink);r(14+eye,7,1,2,ink);
      r(12+eye,9,2,2,tone(skin,-18));r(10+eye,12,5,1,'#976e51');r(8,11,2,1,tone(skin,15));
    }
    // Cuffs, pockets and simple folds remain readable at both mobile and close camera scales.
    r(6,27,13,2,tone(shirt,-22));r(8,21,1,4,tone(shirt,13));r(15,23,1,3,tone(shirt,-14));
    if(id==='bubbles'){
      r(5,1,14,3,'#c4a15b');r(4,3,4,3,'#b28b4c');r(17,3,3,4,'#b28b4c');r(7,0,9,2,'#d7b86f');
      r(3,6,9,7,'#34473d');r(13,6,9,7,'#34473d');r(4,7,7,5,'#f0e8cb');r(14,7,7,5,'#e1dbc0');r(11,8,3,2,'#34473d');r(8,8,2,3,'#3b5141');r(16,8,2,3,'#3b5141');r(5,7,3,1,'#fff4d7');r(15,7,3,1,'#fff4d7');
      r(7,17,5,2,'#a5bbc0');r(13,17,5,2,'#a5bbc0');r(11,19,2,10,'#5c8090');r(8,22,3,3,'#698b9a');r(15,22,3,3,'#698b9a');r(4,23,2,2,'#a6bec1');
    }else if(id==='ricky'){
      r(5,0,11,3,'#3f3428');r(7,-2,8,3,'#4e3b2a');r(10,-3,6,2,'#5a4230');r(6,0,3,1,'#806040');r(5,11,3,4,'#5f4731');r(17,10,2,5,'#5f4731');
      for(let sy=17;sy<29;sy+=3)for(let sx=6;sx<19;sx+=3){r(sx,sy,2,1,'#e0d5b6');r(sx,sy+1,1,1,'#e0d5b6');r(sx+1,sy+2,2,1,'#6b4234');}
      r(11,17,2,12,'#5b4738');r(10,16,2,3,'#d0b690');r(13,16,3,2,'#d0b690');r(4,23,2,2,'#d9cfb2');r(20,23,2,2,'#d9cfb2');
    }else if(id==='julian'){
      r(5,0,13,4,'#242e28');r(6,3,3,2,'#292f28');r(6,10,3,4,'#403d2e');r(9,12,8,3,'#403d2e');r(16,10,2,4,'#403d2e');r(10,11,5,1,'#594633');
      r(3,17,19,5,'#303b32');r(5,22,15,7,'#27382e');r(9,17,6,2,'#4a5140');r(10,19,4,3,'#a8906c');r(7,23,1,5,'#47513e');r(18,21,2,6,'#22352b');
      r(21,24,5,8,'#b8b69a');r(22,26,3,5,'#855d38');r(21,24,5,1,'#e6dfbe');r(21,31,5,1,'#eee4bc');r(22,25,1,5,'#dec997');
    }else if(id==='randy'){
      r(4,17,17,12,skin);r(3,20,19,7,skin);r(5,19,5,7,tone(skin,12));r(18,20,3,7,tone(skin,-19));r(7,27,12,2,tone(skin,-23));r(12,25,2,1,'#a87857');r(7,18,3,1,'#a97b5a');r(16,18,3,1,'#a97b5a');r(9,12,7,1,'#775a40');
      r(5,29,15,3,'#9e956f');r(5,31,6,5,'#b7ad85');r(14,31,6,5,'#ada580');r(11,29,3,2,'#d5c595');
    }else if(id==='lahey'){
      r(5,1,14,3,'#babbae');r(4,4,3,7,'#acb0a2');r(18,4,2,7,'#acb0a2');r(8,1,7,1,'#d0d0bc');r(8,12,7,1,'#a09072');
      r(6,17,13,11,'#a8b693');r(11,17,2,12,'#d1c7a0');r(7,21,3,3,'#d8cfaa');r(15,21,3,3,'#d8cfaa');r(6,28,13,2,'#5c6c4e');r(11,28,3,2,'#c4ae66');r(16,18,2,2,'#d9c773');
    }else if(id==='jroc'){
      r(4,0,15,4,'#597a7c');r(5,0,12,1,'#94aaa0');r(3,4,18,2,'#a4b4a6');r(18,3,6,3,'#506d6d');r(18,5,5,1,'#374f4c');
      r(8,17,9,2,'#e0d8b8');r(9,19,2,5,'#d7bd6a');r(15,19,2,5,'#d7bd6a');r(11,24,4,3,'#e2c779');r(6,28,13,2,'#a6a78a');
    }else if(id==='sarah'){
      r(4,1,16,4,'#975034');r(4,4,3,12,'#a55b3c');r(18,4,3,12,'#a55b3c');r(5,2,3,3,'#ba7349');r(6,15,3,2,'#a55b3c');r(18,13,3,4,'#82462f');r(8,16,9,3,'#cbae98');
      r(7,19,11,9,'#8b657c');r(8,20,2,5,'#a07991');r(16,20,2,7,'#73536b');r(4,25,2,1,'#dfc188');
    }else if(id==='cory'){
      r(4,1,15,4,'#4e6c59');r(5,2,12,2,'#789278');r(2,4,19,2,'#9cac8c');r(1,5,7,2,'#72866e');r(7,18,2,9,'#8aa4ad');r(17,18,2,9,'#8aa4ad');r(9,23,8,6,'#516e7e');
    }else if(c.kind==='kid'){
      r(5,0,14,4,c.hair||'#79532f');r(5,16,15,13,c.shirt||'#a46b4c');r(9,19,7,7,'#c5b67a');r(10,20,5,1,'#735f47');
    }else if(id==='cyrus'||c.kind==='cyrus'){
      r(4,1,16,3,'#2f3027');r(5,6,15,4,'#263e33');r(6,7,5,1,'#9aada2');r(14,7,5,1,'#9aada2');r(6,16,14,13,'#884331');r(10,17,4,11,'#272f27');
    }else if(id==='player'){
      r(6,17,5,3,'#829573');r(14,17,5,3,'#829573');r(11,18,2,11,'#324c39');r(7,23,4,4,'#425c42');r(14,23,4,4,'#425c42');r(7,23,4,1,'#a2ad7e');r(14,23,4,1,'#a2ad7e');
      if(facing==='up'){r(7,17,11,13,'#8b733f');r(8,18,9,11,'#c6aa5e');r(9,19,7,7,'#dfc581');r(9,26,7,2,'#a68846');r(8,18,1,11,'#e5cb86');}
      else{r(18,18,3,12,'#aa8b49');r(20,21,4,9,'#ccb065');r(20,23,4,1,'#e7cf87');r(20,29,4,1,'#7a6941');}
      r(6,29,13,1,'#a9a78b');
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
    const bounds=canvas.getBoundingClientRect(),width=bounds.width||canvas.clientWidth||(full?900:240),height=bounds.height||canvas.clientHeight||(full?640:170),dpr=Math.min(window.devicePixelRatio||1,2);
    if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;rect(ctx,0,0,width,height,full?'#e5dfc0':'#8ca764');
    const inside=this.engine.state.scene&&this.engine.state.scene!=='park',p=inside?(this.engine.state.outdoorPosition||locations.find(b=>b.id===this.engine.state.scene)?.door||this.engine.state.player):this.engine.state.player;
    const region=getRegionAt(p.x,p.y);
    let range=full?{x:0,y:0,width:WORLD.width,height:WORLD.height}:region.id==='sunnyvale'?PARK_BOUNDS:region.id==='city'?REGIONS.find(r=>r.id==='city'):{x:clamp(p.x-1400,0,WORLD.width-2800),y:clamp(p.y-950,0,WORLD.height-1900),width:2800,height:1900};
    if(full&&this.mapRegion&&this.mapRegion!=='world')range=REGIONS.find(r=>r.id===this.mapRegion)||range;
    const pad=full?18:5,top=full?39:5,scale=Math.min((width-pad*2)/range.width,(height-top-pad)/range.height),mx=(width-range.width*scale)/2,my=top+(height-top-pad-range.height*scale)/2;
    if(full){text(ctx,this.mapRegion&&this.mapRegion!=='world'?getRegionAt(range.x+10,range.y+10).name.toUpperCase():'SUNNYVALE / THE LONG WAY HOME',pad,20,12,'#425e3b','left');text(ctx,'ROUTE 7 + DARTMOUTH EAST',width-pad,20,9,'#788367','right');}
    ctx.save();ctx.beginPath();ctx.rect(mx,my,range.width*scale,range.height*scale);ctx.clip();ctx.translate(mx-range.x*scale,my-range.y*scale);ctx.scale(scale,scale);
    rect(ctx,range.x,range.y,range.width,range.height,'#7e9c5d');rect(ctx,0,0,3400,2400,'#9bb378');rect(ctx,7100,4300,2450,2050,'#b6b598');ellipse(ctx,4950,5600,650,530,'#739f91');ellipse(ctx,5440,2460,530,340,'#b5ad88');
    for(const path of roadPaths){this.roadLine(ctx,path,path.kind==='highway'||path.kind==='city'?'#657c70':'#c9ba95',Math.max(path.width,full?3/scale:1.3/scale));}
    for(const b of locations){if(b.x+b.w<range.x||b.x>range.x+range.width||b.y+b.h<range.y||b.y>range.y+range.height)continue;rect(ctx,b.x+5,b.y+7,b.w,b.h,'#6e8654');rect(ctx,b.x,b.y,b.w,b.h,b.id==='ricky'?'#b6b785':b.roofColor);}
    if(full&&range.width>5000){
      for(const b of locations.filter(l=>l.region)){
        ellipse(ctx,b.door.x,b.door.y,4/scale,4/scale,'#efd28b');const labelW=(b.shortName.length*4.8+12)/scale;rounded(ctx,b.x+b.w/2-labelW/2,b.y-24/scale,labelW,16/scale,2/scale,'#3c5c42');text(ctx,b.shortName,b.x+b.w/2,b.y-16/scale,8/scale,'#f7ecca');
      }
      text(ctx,'SUNNYVALE',1700,1180,14/scale,'#39583a');text(ctx,'TRAILER PARK',1700,1390,9/scale,'#56724a');text(ctx,'ROUTE 7',4300,3550,9/scale,'#ecdfb3');text(ctx,'DARTMOUTH EAST',8260,6190,12/scale,'#4c6650');
    }else if(full){
      for(const b of locations){if(b.x<range.x||b.x>range.x+range.width||b.y<range.y||b.y>range.y+range.height)continue;if(b.generic){text(ctx,String(b.lotNumber).padStart(2,'0'),b.x+b.w/2,b.y+b.h/2,7/scale,'#f3e8bd');continue;}const lw=(b.shortName.length*4.7+10)/scale;rounded(ctx,b.x+b.w/2-lw/2,b.y+b.h+52,lw,15/scale,2/scale,'rgba(42,63,39,.92)');text(ctx,b.shortName,b.x+b.w/2,b.y+b.h+52+7.5/scale,8/scale,'#f7ecca');}
    }
    const objectives=this.objectives();
    for(const c of(this.engine.residents||characters)){if(c.hiddenByEncounter)continue;const point=c.scene&&c.scene!=='park'?locations.find(b=>b.id===c.scene)?.door:c;if(!point)continue;const available=this.engine.getAvailableQuests(c.id).length,objective=objectives.characters.has(c.id);ellipse(ctx,point.x,point.y,(full?2.5:2)/scale,(full?2.5:2)/scale,objective?'#a4e3d4':available?'#ffe18a':'#d2d7ad');}
    if(!inside){ctx.strokeStyle='rgba(255,249,216,.8)';ctx.lineWidth=1/scale;ctx.strokeRect(this.camera.x,this.camera.y,this.camera.w,this.camera.h);}
    const pin=this.engine.trackedTarget;
    const pinPoint=pin&&(pin.scene==='park'?pin:locations.find(l=>l.id===pin.scene)?.door);
    if(pinPoint){ellipse(ctx,pinPoint.x,pinPoint.y,7/scale,7/scale,'#355d4c');ellipse(ctx,pinPoint.x,pinPoint.y,4/scale,4/scale,'#b4ead3');if(full)text(ctx,'PIN',pinPoint.x,pinPoint.y+15/scale,8/scale,'#2e5140');}
    const car=this.engine.state.vehicle;if(car)rect(ctx,car.x-12,car.y-7,24,14,'#542f29');ellipse(ctx,p.x,p.y,(full?6:5)/scale,(full?6:5)/scale,'#314e34');ellipse(ctx,p.x,p.y,(full?3.5:3)/scale,(full?3.5:3)/scale,'#fff4cb');
    ctx.restore();ctx.strokeStyle=full?'#9eae80':'rgba(245,238,203,.25)';ctx.lineWidth=1;ctx.strokeRect(mx,my,range.width*scale,range.height*scale);
  }

  drawPortrait(canvas,character) {
    if(!canvas||!character)return;
    const bounds=canvas.getBoundingClientRect();const width=bounds.width||112,height=bounds.height||112;
    const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
    rect(ctx,0,0,width,height,'#bdc69a');
    for(let y=0;y<height;y+=8)for(let x=0;x<width;x+=8)if(hash(x,y,9)>.65)rect(ctx,x,y,3,2,'#b0bc8a');
    rect(ctx,0,height*.72,width,height*.28,'#b0b78a');
    const scale=Math.min(width/39,height/55);
    ctx.save();ctx.translate(width/2,height*.73);ctx.scale(scale,scale);this.drawSprite(ctx,character,0,0,'down',false);ctx.restore();
  }

  drawWelcome(canvas) {
    if(!canvas)return;
    const bounds=canvas.getBoundingClientRect();const width=bounds.width||800,height=bounds.height||360;
    const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false;
    const scale=Math.max(width/1500,height/650);
    ctx.save();ctx.scale(scale,scale);ctx.translate(-450,-125);this.drawTerrain(ctx,{x:450,y:125,w:1500,h:650});
    const scene=[...locations.map(b=>({y:b.y+b.h,draw:()=>this.drawBuilding(ctx,b)})),...this.scenery.map(p=>({y:p.y,draw:()=>this.drawProp(ctx,p)})),...characters.map(c=>({y:c.y,draw:()=>this.drawCharacter(ctx,c)}))];
    scene.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());ctx.restore();
    const glow=ctx.createLinearGradient(0,0,width,height);glow.addColorStop(0,'rgba(246,221,156,.14)');glow.addColorStop(1,'rgba(39,58,34,.10)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
  }

  drawVehicle(ctx,vehicle,patrol=false) {
    ctx.save();ctx.translate(Math.round(vehicle.x),Math.round(vehicle.y));ctx.rotate(vehicle.angle||0);
    ellipse(ctx,4,7,49,24,'rgba(29,45,30,.3)');
    const r=(x,y,w,h,c)=>rect(ctx,x,y,w,h,c),body=patrol?'#596d4d':'#7e4439';
    // Long boxy New Yorker silhouette: mismatched panels and an absent driver's door.
    r(-35,-26,16,7,'#263c30');r(22,-26,16,7,'#263c30');r(-35,19,16,7,'#263c30');r(22,19,16,7,'#263c30');
    r(-48,-18,96,36,'#293c30');r(-44,-22,86,44,body);r(-48,-17,96,34,body);
    r(15,-18,27,36,patrol?'#667b58':'#303f32');r(18,-15,22,2,patrol?'#8c9a72':'#526047');
    r(-43,-17,25,34,patrol?'#516644':'#865b48');r(-42,-14,20,2,'#a38261');
    r(-17,-19,36,38,'#263b32');r(-10,-16,24,32,'#415e50');r(-10,-16,21,4,'#9bad91');
    r(-6,-14,15,28,patrol?'#81906c':'#9c8270');r(-6,-14,15,3,'#b6a88c');r(-6,11,15,3,'#6e6751');
    r(-17,-16,7,31,'#8fae98');r(10,-15,7,29,'#7e9d89');r(11,-11,2,20,'#a8bd9e');
    r(-3,-21,13,3,'#d1c4a0');r(-3,18,13,3,patrol?'#d1c4a0':'#2a3e31');
    if(!patrol){r(-14,17,29,5,'#253a2e');r(-12,17,21,2,'#9d9270');r(-40,10,11,5,'#ab8e65');r(24,14,12,3,'#6b7b58');r(31,-12,4,3,'#a77d51');r(-26,-17,8,2,'#c4a16d');}
    r(-50,-15,4,30,'#9b9e85');r(46,-16,5,32,'#b8b8a0');r(47,-15,4,8,'#e8d997');r(47,7,4,8,'#e8d997');r(-49,-14,3,7,'#b66649');r(-49,8,3,7,'#b66649');
    r(-44,-21,86,2,'rgba(234,219,178,.35)');r(-43,20,86,2,'#4a4b36');
    if(vehicle.driving){r(-14,-7,4,5,'#d5af7c');r(-14,-2,4,4,'#658557');}
    if(patrol){r(-5,-13,13,5,'#435d45');r(-5,-13,6,5,'#a4684d');r(2,-13,6,5,'#8baeb0');text(ctx,'PARK',-29,0,7,'#e2d9ad');}
    ctx.restore();
  }

  drawEncounterActor(ctx,actor) {
    const kind=actor.kind;
    if(kind==='car'){this.drawVehicle(ctx,actor,true);return;}
    if(kind==='cart'){this.drawPickup(ctx,{...actor,item:'cart'},true);return;}
    if(kind==='kitty'){this.drawProp(ctx,{...actor,type:'cat',color:actor.color||'#d4bb8c'});return;}
    const resident=characters.find(c=>c.id===actor.id||c.id===kind);
    const c={...(resident||{}),...actor,id:resident?.id||actor.id,color:actor.color||resident?.color||'#d9af85',shirt:actor.shirt||resident?.shirt||'#937854',hair:actor.hair||resident?.hair||'#675038'};
    if(kind==='kid'){ctx.save();ctx.translate(actor.x,actor.y);ctx.scale(.82,.82);this.drawSprite(ctx,c,0,0,actor.facing||'down',actor.state==='approach'||actor.state==='flee');ctx.restore();}
    else this.drawSprite(ctx,c,actor.x,actor.y,actor.facing||'down',actor.state==='approach'||actor.state==='flee');
    if(actor.telegraphUntil>(this.engine.encounter?.age||0)){
      ctx.strokeStyle='#da8455';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(actor.x,actor.y+8,24,12,0,0,Math.PI*2);ctx.stroke();this.drawMarker(ctx,actor.x,actor.y-64,'quest');
    }
    if(Number.isFinite(actor.health)&&actor.maxHealth&&actor.enemy===true){
      rect(ctx,actor.x-19,actor.y-55,38,5,'#354c38');rect(ctx,actor.x-18,actor.y-54,36*clamp(actor.health/actor.maxHealth,0,1),3,'#d99769');
    }
  }

  drawCombatEffects(ctx,ground=false) {
    const encounter=this.engine.encounter;
    for(const effect of encounter?.effects||[]){
      const alpha=clamp(effect.life/(effect.maxLife||1),0,1),r=effect.radius||25;
      if(ground&&effect.kind==='telegraph'){
        ctx.fillStyle=`rgba(179,78,47,${alpha*.22})`;ctx.strokeStyle=`rgba(213,125,69,${alpha})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(effect.x,effect.y,r,r*.55,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      }else if(!ground){
        ctx.globalAlpha=alpha;
        if(effect.kind==='hit')for(let i=0;i<7;i++){const a=i*Math.PI*2/7,d=(1-alpha)*r;rect(ctx,effect.x+Math.cos(a)*d,effect.y+Math.sin(a)*d,4,3,i%3?'#a3c0a2':'#efd39a');}
        if(effect.kind==='punch'){ctx.strokeStyle='#f6e6ad';ctx.lineWidth=3;ctx.beginPath();ctx.arc(effect.x,effect.y,r*(1-alpha*.35),-.7,1.5);ctx.stroke();rect(ctx,effect.x-4,effect.y-3,9,7,'#e5bd89');}
        if(effect.kind==='dodge'||effect.kind==='block'){ctx.strokeStyle=effect.kind==='block'?'#b7d9a0':'#d9edba';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(effect.x,effect.y,r,r*.6,0,0,Math.PI*2);ctx.stroke();}
        ctx.globalAlpha=1;
      }
    }
    if(ground)return;
    for(const bottle of encounter?.projectiles||[]){
      ctx.save();ctx.translate(bottle.x,bottle.y);ctx.rotate(Math.atan2(bottle.vy||0,bottle.vx||1)+Math.PI/2);rect(ctx,-3,-9,6,16,'#50845f');rect(ctx,-2,-14,4,6,'#779b65');rect(ctx,-3,-2,6,5,'#d2c69a');rect(ctx,-1,-8,1,7,'#a4bb7a');ctx.restore();
    }
    const combat=this.engine.encounter;
    if(combat?.blockTime>0){const p=this.engine.state.player;ctx.strokeStyle='#b9d5a1';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y-9,29,-2.7,-.4);ctx.stroke();}
  }

  drawInterior(ctx,room) {
    const w=room.width,h=room.height;
    rect(ctx,-8,-8,w+16,h+16,'#202f24');rect(ctx,0,0,w,h,room.floor);
    const tile=['laundry','burger','store','office'].includes(room.id);
    for(let y=30;y<h-16;y+=tile?30:18)for(let x=18;x<w-16;x+=tile?30:74){
      const n=hash(x,y,5);rect(ctx,x,y,tile?29:73,tile?29:17,n>.5?'rgba(246,224,177,.08)':'rgba(39,46,31,.08)');
      if(!tile){rect(ctx,x+5,y+9,35,1,'rgba(55,51,33,.14)');rect(ctx,x+48,y+4,16,1,'rgba(238,213,166,.14)');}
    }
    // Raised exterior walls, baseboards, windows, and soft sunlight.
    rect(ctx,0,0,w,39,room.wall);rect(ctx,0,0,w,7,'#65745b');rect(ctx,0,33,w,6,'#9d9676');
    rect(ctx,0,0,18,h,'#6b765d');rect(ctx,w-18,0,18,h,'#586b52');rect(ctx,18,39,4,h-57,'rgba(25,43,29,.18)');
    for(const wx of [110,500]){
      rect(ctx,wx,7,104,25,'#f0dfb7');rect(ctx,wx+5,9,94,18,'#6d998f');rect(ctx,wx+10,10,39,15,'#abc3a6');rect(ctx,wx+52,10,42,15,'#93b29c');rect(ctx,wx+49,9,4,19,'#dbd2aa');
      ctx.fillStyle='rgba(245,227,166,.06)';ctx.beginPath();ctx.moveTo(wx+5,39);ctx.lineTo(wx+100,39);ctx.lineTo(wx+175,200);ctx.lineTo(wx+40,200);ctx.fill();
    }
    rect(ctx,18,h-18,w/2-48,18,'#8b8e6c');rect(ctx,w/2+30,h-18,w/2-48,18,'#8b8e6c');rect(ctx,w/2-30,h-7,60,7,'#c2b28b');
    rounded(ctx,275,320,175,77,3,'#7c7c57');rect(ctx,281,326,163,65,'#b7a36c');rect(ctx,288,332,149,53,'#8f8b5c');
    for(let i=0;i<6;i++)line(ctx,291+i*27,334,291+i*27,380,'#b8ad77',2);
    // A framed park photograph, a clock, and an entry mat make every room feel inhabited.
    rect(ctx,329,5,65,26,'#6a6048');rect(ctx,334,9,55,17,'#a1b48b');rect(ctx,338,18,24,7,'#7e895d');rect(ctx,360,15,25,10,'#c9bc8e');ellipse(ctx,432,18,10,10,'#e0d4ac');line(ctx,432,18,432,11,'#68735a',1);line(ctx,432,18,438,20,'#68735a',1);
    const furniture=[...room.furniture].sort((a,b)=>a.y+a.h-b.y-b.h);
    for(const f of furniture)this.drawFurniture(ctx,f);
    const exit=room.exit;rect(ctx,exit.x-28,exit.y-16,56,27,'#736e4b');rect(ctx,exit.x-24,exit.y-12,48,19,'#a39c6a');text(ctx,'EXIT',exit.x,exit.y-2,10,'#e5d7ac');
    const near=this.engine.nearestInteractable?.();
    if(near?.type==='furniture'){const f=near.entity;ctx.strokeStyle='rgba(239,216,145,.8)';ctx.lineWidth=2;ctx.setLineDash([5,4]);ctx.strokeRect(f.x-4,f.y-4,f.w+8,f.h+8);ctx.setLineDash([]);}
  }

  drawFurniture(ctx,f) {
    const {x,y,w,h,kind}=f,c=f.color||'#a68b60';
    rect(ctx,x+5,y+7,w,h,'rgba(29,43,29,.22)');rect(ctx,x-2,y-2,w+4,h+4,'#48543c');rect(ctx,x,y,w,h,c);
    if(kind==='couch'){
      rect(ctx,x+7,y+6,w-14,h-12,'#5d6548');rect(ctx,x+10,y+8,w-20,h-20,c);rect(ctx,x+9,y+7,w-18,18,'rgba(238,215,172,.22)');rect(ctx,x+7,y+8,17,h-12,c);rect(ctx,x+w-24,y+8,17,h-12,c);
      for(let i=0;i<3;i++){const cw=(w-48)/3;rect(ctx,x+25+i*cw,y+28,cw-3,h-38,'rgba(224,209,159,.2)');line(ctx,x+29+i*cw,y+h-14,x+20+(i+1)*cw,y+h-14,'rgba(58,66,39,.22)',2);}
      rect(ctx,x+32,y+31,22,23,'#b5a37d');rect(ctx,x+35,y+35,16,15,'#c6b48a');rect(ctx,x+w-60,y+33,23,22,'#73846b');
    }else if(kind==='bed'){
      rect(ctx,x+5,y+3,w-10,h-6,'#d8cfac');rect(ctx,x+4,y+2,14,h-4,'#776c4f');rect(ctx,x+w-18,y+2,14,h-4,'#7f7352');rect(ctx,x+22,y+8,42,26,'#ebe0ba');rect(ctx,x+w-65,y+8,42,26,'#e6d7af');
      rect(ctx,x+21,y+38,w-42,h-44,c);rect(ctx,x+21,y+37,w-42,9,'#b1bf9c');for(let i=0;i<4;i++)rect(ctx,x+25+i*(w-46)/4,y+48,2,h-59,'rgba(236,228,185,.27)');rect(ctx,x+24,y+h-18,w-48,3,'rgba(58,79,55,.25)');
    }else if(kind==='fridge'){
      rect(ctx,x+5,y+5,w-10,h-10,'#d2d8bb');rect(ctx,x+8,y+8,w-16,24,'#b0be9f');rect(ctx,x+7,y+34,w-14,2,'#6e826b');rect(ctx,x+w-16,y+13,4,14,'#697e66');rect(ctx,x+w-16,y+43,4,24,'#697e66');rect(ctx,x+12,y+48,19,21,'#dec58b');rect(ctx,x+15,y+53,13,1,'#9f946b');rect(ctx,x+13,y+58,13,1,'#9f946b');
    }else if(kind==='table'||kind==='desk'||kind==='counter'||kind==='workbench'){
      rect(ctx,x+4,y+4,w-8,h-8,'rgba(228,208,156,.17)');rect(ctx,x+4,y+h-9,w-8,5,'#786544');for(let i=0;i<3;i++)line(ctx,x+8,y+12+i*(h-22)/3,x+w-8,y+12+i*(h-22)/3,'rgba(75,69,39,.2)',1);
      for(const [dx,dy]of [[4,4],[w-11,4],[4,h-11],[w-11,h-11]])rect(ctx,x+dx,y+dy,7,7,'#6a6244');
      if(kind==='workbench'){
        rect(ctx,x+16,y+18,46,25,'#758b77');rect(ctx,x+20,y+23,38,3,'#a4b99a');for(let i=0;i<4;i++)rect(ctx,x+20+i*10,y+30,5,6,'#4c6852');line(ctx,x+w-65,y+20,x+w-25,y+h-18,'#c6c4a5',5);rect(ctx,x+w-61,y+16,18,12,'#657e66');
      }else{
        rect(ctx,x+15,y+14,32,27,'#e7d6ab');rect(ctx,x+18,y+18,23,2,'#a3946b');rect(ctx,x+18,y+24,19,1,'#a3946b');rect(ctx,x+18,y+29,22,1,'#a3946b');ellipse(ctx,x+w-25,y+24,8,8,'#e0cfa4');ellipse(ctx,x+w-25,y+24,5,5,'#74533b');line(ctx,x+w-17,y+22,x+w-13,y+27,'#d1bd93',3);
      }
      if(f.action==='shop'){rect(ctx,x+w-56,y+h-36,39,24,'#718571');rect(ctx,x+w-51,y+h-31,29,8,'#bac99f');rect(ctx,x+w-50,y+h-20,6,4,'#d7c893');rect(ctx,x+w-40,y+h-20,6,4,'#d7c893');}
    }else if(kind==='shelf'||kind==='crate'){
      const rows=kind==='crate'?2:3;
      for(let row=0;row<rows;row++){
        const sy=y+8+row*(h-12)/rows;rect(ctx,x+5,sy,w-10,5,'#6e6042');
        for(let i=0;i<Math.floor(w/24);i++){const bx=x+11+i*23,by=sy+9;rect(ctx,bx,by,14,Math.min(19,h/rows-12),['#a7b18a','#c2a267','#8a9f91','#b68d70'][(i+row)%4]);rect(ctx,bx+4,by+3,6,3,'#d8cea7');}
      }
    }else if(kind==='speaker'){
      rect(ctx,x+6,y+6,w-12,h-12,'#3b4d3e');ellipse(ctx,x+w/2,y+h*.65,w*.3,w*.3,'#223a2f');ellipse(ctx,x+w/2,y+h*.65,w*.16,w*.16,'#697d64');ellipse(ctx,x+w/2,y+h*.24,w*.17,w*.17,'#263e31');
    }else if(kind==='studio'){
      rect(ctx,x+6,y+6,w-12,h-12,'#495f53');for(const cx of [x+w*.25,x+w*.72]){ellipse(ctx,cx,y+h*.43,h*.31,h*.31,'#253b30');ellipse(ctx,cx,y+h*.43,h*.18,h*.18,'#84977d');ellipse(ctx,cx,y+h*.43,4,4,'#d5c98c');}
      for(let i=0;i<11;i++){rect(ctx,x+10+i*(w-20)/11,y+h-16,3,8,'#c2bd8d');rect(ctx,x+11+i*(w-20)/11,y+h-20-(i%3)*3,3,3,i%2?'#b7805b':'#a2b479');}
    }else if(kind==='washers'){
      const count=Math.max(1,Math.round(w/80));for(let i=0;i<count;i++){const ww=w/count;rect(ctx,x+i*ww+4,y+4,ww-8,h-8,'#c6d2b9');ellipse(ctx,x+i*ww+ww/2,y+h*.58,ww*.3,ww*.3,'#577c71');ellipse(ctx,x+i*ww+ww/2,y+h*.58,ww*.2,ww*.2,'#a4bdaa');rect(ctx,x+i*ww+12,y+12,ww-24,9,'#829b87');}
    }else if(kind==='tv'){
      rect(ctx,x+6,y+6,w-12,h-12,'#293f32');rect(ctx,x+13,y+12,w-36,h-25,'#6f947e');rect(ctx,x+18,y+16,w-46,h-33,'#9db48c');for(let i=0;i<5;i++)rect(ctx,x+18,y+18+i*6,w-46,1,'#849d7c');rect(ctx,x+w-17,y+22,5,5,'#b6b28a');line(ctx,x+w/2,y,x+w/2-23,y-16,'#68745c',2);line(ctx,x+w/2,y,x+w/2+20,y-20,'#68745c',2);
    }else if(kind==='grill'){
      rect(ctx,x+8,y+8,w-16,h-16,'#354b3a');for(let i=0;i<10;i++)rect(ctx,x+13+i*(w-26)/10,y+14,2,h-33,'#83947a');for(let i=0;i<4;i++){ellipse(ctx,x+38+i*48,y+h*.47,15,10,'#8b5a38');rect(ctx,x+29+i*48,y+h*.47-5,19,3,'#b7844d');}rect(ctx,x+12,y+h-16,w-24,6,'#a9ad8b');
    }else if(kind==='mirror'){
      rect(ctx,x+9,y+7,w-18,h-14,'#cfba9e');rect(ctx,x+16,y+13,w-32,h-26,'#a6c0b2');rect(ctx,x+20,y+17,w-40,4,'#d8e4c5');line(ctx,x+29,y+h-21,x+w-33,y+23,'#c4d5bd',4);
    }else if(kind==='cats'){
      for(let i=0;i<3;i++){ellipse(ctx,x+30+i*53,y+h*.55,23,18,['#9aa875','#b39b6a','#9a8266'][i]);this.drawProp(ctx,{type:'cat',x:x+29+i*53,y:y+h*.55+3,color:i%2?'#5e6658':'#d8c699'});ellipse(ctx,x+28+i*53,y+h-14,7,4,'#c9d0af');}
    }else if(kind==='tires'){
      for(let i=0;i<3;i++){ctx.save();ctx.translate(x+26+i*46,y+h-16);this.drawProp(ctx,{type:'tires',x:0,y:0});ctx.restore();}
    }
    if(f.action){const label=f.action==='rest'?'REST':f.action==='shop'?'SHOP':'WORK';rounded(ctx,x+w/2-23,y+h+5,46,16,2,'#4f6648');text(ctx,label,x+w/2,y+h+13,8,'#e8d7a5');}
  }


  drawRickyYard(ctx,b) {
    const {x,y,w,h}=b;
    // This is a yard, not a disguised trailer: Ricky actually sleeps in the car.
    rect(ctx,x-11,y-12,w+24,h+100,'#9eaa69');
    for(let i=0;i<90;i++){const px=x-7+hash(i,x)*(w+15),py=y-6+hash(i,y)*(h+90);rect(ctx,px,py,3,2,i%3?'#8a9d5d':'#b6b477');}
    for(let fx=x-15;fx<x+w+18;fx+=18){rect(ctx,fx,y-19,6,28,'#a08b5a');rect(ctx,fx,y-18,6,3,'#c0a876');}rect(ctx,x-15,y-9,w+35,4,'#927d4f');
    rect(ctx,x+20,y+17,88,46,'#46563d');rect(ctx,x+23,y+18,82,13,'#7d7150');rect(ctx,x+25,y+34,78,26,'#99835a');rect(ctx,x+23,y+29,12,34,'#756844');rect(ctx,x+95,y+29,12,34,'#756844');rect(ctx,x+40,y+35,24,21,'#ac996b');rect(ctx,x+67,y+35,23,21,'#9b8e60');
    // A blue tarp, cooler, milk crate, and laundry establish the improvised living room.
    ctx.fillStyle='#638f8a';ctx.beginPath();ctx.moveTo(x+123,y+15);ctx.lineTo(x+w-9,y+23);ctx.lineTo(x+w-20,y+70);ctx.lineTo(x+118,y+61);ctx.fill();line(ctx,x+122,y+20,x+w-23,y+66,'#82aaa0',2);
    rect(ctx,x+127,y+29,35,30,'#8b9c76');rect(ctx,x+131,y+32,27,3,'#bbbd91');rect(ctx,x+173,y+68,31,25,'#b16848');rect(ctx,x+170,y+64,37,7,'#d4cfaa');rect(ctx,x+184,y+73,6,3,'#e2d9b4');
    ellipse(ctx,x+35,y+113,23,14,'#777c56');for(let i=0;i<7;i++){const a=i*Math.PI*2/7;rect(ctx,x+30+Math.cos(a)*20,y+109+Math.sin(a)*10,10,7,'#a4a78a');}
    line(ctx,x+25,y+111,x+44,y+118,'#5d5337',5);line(ctx,x+26,y+119,x+44,y+109,'#685639',5);
    const flick=Math.sin(this.time/150)*3;rect(ctx,x+31,y+99-flick,8,15+flick,'#d9964c');rect(ctx,x+34,y+105-flick,5,11+flick,'#edc66d');
    for(const [dx,dy]of [[12,82],[180,10],[194,119]]){rect(ctx,x+dx,y+dy,10,13,'#a28a56');rect(ctx,x+dx+2,y+dy-13,3,17,'#547b40');rect(ctx,x+dx-4,y+dy-9,7,4,'#698c44');rect(ctx,x+dx+4,y+dy-6,8,4,'#6d9148');}
    rounded(ctx,x-3,y+h+83,w+6,23,3,'#425d3d');text(ctx,'RICKY / HOME IS THE CAR',x+w/2,y+h+95,10,'#f0dfae');
  }

  drawDestination(ctx,b) {
    const {x,y,w,h,kind}=b,roofH=h-52;
    rect(ctx,x+12,y+16,w,h,'rgba(30,48,31,.24)');rect(ctx,x-3,y-3,w+6,h+6,'#3e5743');rect(ctx,x,y,w,h,b.color);rect(ctx,x-5,y-6,w+10,roofH,b.roofColor);rect(ctx,x-5,y-6,w+10,5,'#c5c5a6');rect(ctx,x-5,y+roofH-5,w+10,7,'#465b48');
    for(let rx=x+14;rx<x+w-10;rx+=26){line(ctx,rx,y+4,rx,y+roofH-10,'rgba(231,231,190,.15)',2);}
    for(let i=0;i<Math.max(1,Math.floor(w/150));i++){const ax=x+35+i*125;rect(ctx,ax,y+20,48,30,'#b0b59c');rect(ctx,ax+4,y+24,40,22,'#738c79');for(let j=0;j<5;j++)rect(ctx,ax+8,y+27+j*4,32,1,'#4f705c');}
    const front=y+h-46;
    for(let wx=x+18;wx<x+w-40;wx+=61){rect(ctx,wx-3,front-3,50,39,'#ece0b9');rect(ctx,wx,front,44,31,'#527e75');rect(ctx,wx+3,front+3,18,25,'#9dbfb0');rect(ctx,wx+24,front+3,17,25,'#83a89b');rect(ctx,wx+21,front,3,31,'#dbd5b1');}
    const dx=b.door.x;rect(ctx,dx-21,y+h-46,43,46,'#dcd4ad');rect(ctx,dx-17,y+h-42,35,42,'#426958');rect(ctx,dx-13,y+h-37,27,23,'#a1bb9d');rect(ctx,dx+11,y+h-14,3,4,'#e8cb7e');rect(ctx,dx-31,y+h+2,63,8,'#d4c49c');rect(ctx,dx-36,y+h+10,73,7,'#aaa583');
    const signW=Math.min(w-24,b.shortName.length*8+24),signY=y+roofH-29;
    rounded(ctx,x+w/2-signW/2,signY,signW,25,2,'#ede0b5');text(ctx,b.shortName,x+w/2,signY+13,kind==='mall'?17:11,'#41644d');
    if(kind==='mall'){
      rect(ctx,x+10,y+h-4,w-20,6,'#b9b797');rect(ctx,x+12,y+roofH+4,w-24,5,'#8ba39b');
      rounded(ctx,x+w-128,y+h+49,108,20,2,'#496e57');text(ctx,'CART RETURNS',x+w-74,y+h+59,9,'#eadcb4');
      for(let i=0;i<6;i++)this.drawPickup(ctx,{item:'cart',x:x+w-120+i*16,y:y+h+90},false);
    }else if(kind==='gas'){
      rect(ctx,x+20,y+h+42,w-40,7,'#4f604b');rect(ctx,x+20,y+h+35,w-40,13,'#b6553e');rect(ctx,x+24,y+h+35,w-48,3,'#d59b6b');rect(ctx,x+30,y+h+48,5,40,'#8e9b7d');rect(ctx,x+w-35,y+h+48,5,40,'#8e9b7d');
      text(ctx,'FUEL / COFFEE / BAD IDEAS',x+w/2,y+h+41,8,'#f4e6b7');
    }else if(kind==='diner'){
      rect(ctx,x-4,y+h-6,w+8,6,'#a1b9ab');rect(ctx,x+5,y+roofH+6,w-10,4,'#d1c89d');for(let i=0;i<w-12;i+=14)rect(ctx,x+6+i,y+h-17,7,7,'#648779');
      text(ctx,'BREAKFAST ALL DAY',x+w/2,y+roofH-11,9,'#597b6e');
    }else if(kind==='pawn'){
      rect(ctx,x-7,y+roofH+1,w+14,17,'#b69cae');for(let i=0;i<w;i+=24)rect(ctx,x+i,y+roofH+1,12,17,'#756785');
      text(ctx,'VINYL / ELECTRONICS / TRADES',x+w/2,y+h+31,9,'#455f45');
    }else if(kind==='liquor'){
      for(let i=0;i<9;i++){const bx=x+25+i*24;rect(ctx,bx,front+13,7,15,i%2?'#8d9a56':'#7d6348');rect(ctx,bx+2,front+8,3,6,'#d5c88f');}
    }else if(kind==='quarry'){
      rect(ctx,x+32,y+h-65,96,64,'#677867');for(let i=0;i<6;i++)rect(ctx,x+36,y+h-61+i*10,88,2,'#8b987c');
      this.drawTravelProp(ctx,{x:x+w+77,y:y+h+71,type:'gravelPile'});
    }else if(kind==='dock'){
      for(let row=0;row<5;row++)rect(ctx,x+4,y+roofH+4+row*8,w-8,2,'#7d8c60');text(ctx,'TACKLE / COFFEE / QUIET',x+w/2,y+h+32,8,'#435f40');
    }else if(kind==='salvage'){
      for(let i=0;i<7;i++){rect(ctx,x+10+i*49,y+h+44,4,42,'#aab18e');line(ctx,x+10+i*49,y+h+45,x+55+i*49,y+h+84,'#718564',1);}
    }
  }

  drawTravelProp(ctx,p) {
    const {x,y,type}=p;
    if(type==='roadSign'||type==='billboard'){
      const big=type==='billboard',w=big?245:220,h=big?70:35;rect(ctx,x-w/2+18,y-12,6,38,'#7c8062');rect(ctx,x+w/2-24,y-12,6,38,'#7c8062');rect(ctx,x-w/2-3,y-h-3,w+6,h+6,'#d0cca2');rect(ctx,x-w/2,y-h,w,h,big?'#497362':'#3f6d56');text(ctx,p.label,x,y-h+(big?25:18),big?13:10,'#f0e6bc');if(big)text(ctx,p.sub,x,y-h+49,10,'#d7d5a6');return;
    }
    if(type==='gasPump'){
      ellipse(ctx,x,y+9,20,8,'rgba(43,61,38,.2)');rect(ctx,x-16,y-50,32,58,'#506450');rect(ctx,x-13,y-46,26,51,'#c3c7a8');rect(ctx,x-11,y-43,22,17,'#e1d8ad');rect(ctx,x-8,y-39,16,8,'#6c8d73');text(ctx,'7.9',x,y-35,6,'#d4dcb5');rect(ctx,x-13,y-17,26,21,'#b4694d');line(ctx,x+17,y-34,x+23,y+2,'#3e5845',3);line(ctx,x+23,y+2,x+15,y+5,'#3e5845',3);return;
    }
    if(type==='dock'){
      rect(ctx,x-40,y-21,80,190,'#4e6b50');rect(ctx,x-36,y-24,72,190,'#9b8755');for(let i=0;i<18;i++){rect(ctx,x-35,y-23+i*10,70,2,'#c1a877');rect(ctx,x-29,y-21+i*10,2,2,'#6c6b47');rect(ctx,x+28,y-21+i*10,2,2,'#6c6b47');}
      for(const dy of [-20,70,160])for(const dx of [-42,38]){rect(ctx,x+dx,y+dy,6,17,'#625d3e');rect(ctx,x+dx-1,y+dy-2,8,4,'#c6b386');}line(ctx,x+16,y+125,x+89,y+69,'#e1d0a0',1);return;
    }
    if(type==='gravelPile'){
      ellipse(ctx,x+5,y+9,66,25,'rgba(51,65,41,.18)');ctx.fillStyle='#8d947e';ctx.beginPath();ctx.moveTo(x-68,y+5);ctx.lineTo(x-14,y-53);ctx.lineTo(x+18,y-48);ctx.lineTo(x+66,y+9);ctx.closePath();ctx.fill();ctx.fillStyle='#b9b596';ctx.beginPath();ctx.moveTo(x-63,y);ctx.lineTo(x-14,y-53);ctx.lineTo(x+19,y-43);ctx.lineTo(x+32,y-6);ctx.closePath();ctx.fill();for(let i=0;i<23;i++)rect(ctx,x-44+hash(i,x)*83,y-32+hash(i,y)*40,4,3,i%2?'#969b82':'#ccc5a3');return;
    }
    if(type==='cityLamp'){
      ellipse(ctx,x+2,y+12,19,6,'rgba(44,60,40,.18)');rect(ctx,x-4,y-114,8,126,'#455e4c');rect(ctx,x-19,y-116,38,6,'#526e59');rect(ctx,x-28,y-114,18,12,'#b8c6a5');rect(ctx,x+10,y-114,18,12,'#b8c6a5');rect(ctx,x-25,y-102,12,3,'#e3d6a0');rect(ctx,x+13,y-102,12,3,'#e3d6a0');return;
    }
    if(type==='bench'){
      rect(ctx,x-26,y-14,53,27,'#5b6d4b');for(let i=0;i<3;i++)rect(ctx,x-29,y-18+i*8,59,5,'#b99c65');rect(ctx,x-24,y+6,5,15,'#586b4b');rect(ctx,x+20,y+6,5,15,'#586b4b');
    }
  }

}
