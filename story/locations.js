export const WORLD = { width: 9600, height: 6400 };
export const PARK_BOUNDS = { x: 0, y: 0, width: 3400, height: 2400 };
export const REGIONS = [
 {id:'sunnyvale',name:'Sunnyvale Trailer Park',x:0,y:0,width:3400,height:2400},
 {id:'forest',name:'Route 7 / Pine Barrens',x:0,y:2400,width:7100,height:2100},
 {id:'quarryDistrict',name:'Rocky Ridge Quarry',x:4650,y:1450,width:2350,height:1750},
 {id:'lakeDistrict',name:'Old Mill Lake',x:3500,y:4500,width:2600,height:1850},
 {id:'city',name:'Dartmouth East / Commercial District',x:7100,y:4200,width:2450,height:2150},
];
export const DISTRICTS = REGIONS;
export const getRegionAt = (x,y) => REGIONS.find(r=>r.id!=='forest'&&x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height)||REGIONS.find(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height)||{id:'countryside',name:'Nova Scotia Back Roads',x:0,y:0,width:9600,height:6400};
export const PLAYER_START = { x: 725, y: 815, facing: 'down' };
export const VEHICLE_START = { x: 740, y: 765, angle: Math.PI / 2 };
export const PATROL_ROUTE = [
  {x:320,y:500},{x:900,y:470},{x:1600,y:510},{x:2350,y:470},{x:3020,y:560},
  {x:3120,y:1120},{x:3080,y:1830},{x:2700,y:2010},{x:1900,y:1980},
  {x:1100,y:2040},{x:220,y:1930},{x:260,y:1450},{x:280,y:880},{x:320,y:500},
];
// Roads form an irregular loop with two winding lanes through the neighborhoods.
export const roads = [];
export const roadPaths = [
  { points: PATROL_ROUTE, width: 88 },
  { points: [{x:280,y:880},{x:800,y:850},{x:1300,y:880},{x:1900,y:850},{x:2500,y:880},{x:3100,y:980}], width: 78 },
  { points: [{x:260,y:1450},{x:830,y:1430},{x:1300,y:1400},{x:1900,y:1450},{x:2500,y:1410},{x:3100,y:1450}], width: 78 },
  { points: [{x:1530,y:505},{x:1550,y:880},{x:1500,y:1425},{x:1570,y:2000}], width: 70 },
  { points:[{x:1660,y:2000},{x:1660,y:2320},{x:1660,y:2550},{x:2100,y:3000},{x:3100,y:3300},{x:4200,y:3200},{x:5300,y:3800},{x:6500,y:4100},{x:7100,y:4600},{x:7600,y:5100},{x:9180,y:5100}],width:90,kind:'highway'},
  { points:[{x:3100,y:3300},{x:3200,y:3150},{x:3390,y:3130}],width:80,kind:'access'},
  { points:[{x:5300,y:3800},{x:5400,y:3000},{x:5400,y:2380}],width:85,kind:'gravel'},
  { points:[{x:5400,y:3000},{x:5900,y:3080},{x:6550,y:3100}],width:75,kind:'gravel'},
  { points:[{x:4200,y:3200},{x:4080,y:4100},{x:4190,y:4800},{x:4170,y:5310},{x:4440,y:5310}],width:80,kind:'access'},
  { points:[{x:7300,y:5100},{x:7300,y:5840},{x:9200,y:5840},{x:9200,y:5100}],width:100,kind:'city'},
  { points:[{x:8400,y:5100},{x:8400,y:5840}],width:90,kind:'city'},
];
export const landmarks = [
  { id:'entrance',name:'Sunnyvale Park Entrance',x:1660,y:2360,kind:'entrance' },
  { id:'pond',name:'The duck pond',x:3275,y:400,kind:'pond' },
];
const named = [
  ['ricky',"Ricky's yard",'RICKY / HOME BASE',620,625,210,96,'#ddd0a3','#7b5142','yard','Ricky lives in the Shitmobile. The yard is his living room: a borrowed couch, a cooler, and a driveway full of plans.'],
  ['bubbles',"Bubbles' shed",'BUBBLES',890,640,170,90,'#bd9763','#74513a','shed','Shopping carts, rescued kitties, and the only sensible person within walking distance.'],
  ['julian',"Julian's trailer",'JULIAN',1160,625,210,96,'#aaba9d','#4c6652','trailer','Headquarters of several extremely temporary business ventures. Coasters are mandatory.'],
  ['sarah',"Sarah's trailer",'SARAH',1970,625,210,96,'#cab5a6','#875d70','trailer','Haircuts, practical advice, and no patience for another one of the boys\' schemes.'],
  ['jroc',"J-Roc's trailer",'J-ROC',2510,625,210,96,'#9fbfc2','#44777d','trailer','Sunnyvale Sound Studio. Open whenever someone remembers where the extension cord went.'],
  ['office',"Lahey's park office",'PARK OFFICE',350,1160,220,110,'#d8c69d','#53684a','office','A notice reads: NO SCHEMES. A second notice reads: ESPECIALLY THAT ONE.'],
  ['burger','The Dirty Burger','DIRTY BURGER',890,1160,200,105,'#d7b46f','#a34e37','burger','Hot grill. Questionable accounting. The best cheeseburger in this particular parking lot.'],
  ['store','Sunnyvale general store','GENERAL STORE',1970,1160,210,110,'#d8c69b','#7b6348','store','Cold drinks and hot gossip. Stock up on snacks and make yourself at home.'],
  ['garage','Cory & Jacob repair shop','REPAIR SHOP',2510,1160,220,110,'#b5bdab','#526e64','garage','FULL SERVICE, says the sign. Neither mechanic is entirely sure what services those are.'],
  ['laundry','Park laundromat','LAUNDROMAT',2780,1160,210,110,'#ccd4bd','#5c8273','laundry','Three washing machines, two working sockets, and a remarkable number of lost cassette tapes.'],
  ['scrapyard','Sunnyvale salvage yard','SALVAGE YARD',350,1620,220,105,'#aba18b','#706653','yard','One person\'s junk is Bubbles\' next business model. Watch your step around the mufflers.'],
  ['stage','Community stage','COMMUNITY STAGE',2510,1620,220,105,'#b99760','#695039','stage','A plywood stage with big ambitions. The entire park is counting on a very small generator.'],
];
export const locations = named.map(([id,name,shortName,x,y,w,h,color,roofColor,kind,description])=>({id,name,shortName,x,y,w,h,color,roofColor,kind,description,solid:id!=='ricky',enterable:id!=='ricky',door:{x:x+w/2,y:y+h+25}}));
const palette = [ ['#c2d0b5','#65806b'],['#dbccb1','#8d6e54'],['#bcc8cd','#637e85'],['#d3bcab','#986d63'],['#d4d2ad','#7f8055'],['#abbfa9','#587b62'],['#d7c1ab','#855a4b'] ];
const names=['Maple','Willow','Birch','Spruce','Cedar','Aspen','Pine','Juniper','Oak','Elm'];
let lot=1;
for(const [row,y] of [250,625,1160,1620,2140].entries()) for(let col=0;col<10;col++) {
  const x=350+col*270;
  if(col===4&&row>0&&row<4)continue;
  if(locations.some(b=>b.x===x&&Math.abs(b.y-y)<25))continue;
  const p=palette[(col+row*3)%palette.length],w=row===4&&col===4?170:190+((col+row)%3)*10,h=88+((row+col)%2)*8;
  locations.push({id:`lot${String(lot).padStart(2,'0')}`,name:`${names[col]} Lane / Lot ${String(lot).padStart(2,'0')}`,shortName:`LOT ${String(lot).padStart(2,'0')}`,x,y:y+((col%3)-1)*8,w,h,color:p[0],roofColor:p[1],kind:'trailer',generic:true,lotNumber:lot,description:'A lived-in Sunnyvale home. Come in, look around, and mind the screen door.',door:{x:x+w/2,y:y+((col%3)-1)*8+h+25}});
  lot++;
}


// Distant destinations are connected by actual drivable roads, not map shortcuts.
const destinations = [
 ['mall','Eastgate Mall & Cart Corral','EASTGATE MALL',7750,4610,430,200,'#c7c6ae','#59717b','mall','A modest shopping mall with an ambitious car park. Bubbles knows every cart here personally.'],
 ['gasStation','Last Chance Gas & Go','GAS + GO',3070,2940,260,130,'#dfc5a2','#9e4c3c','gas','The last reliable fuel stop before the highway. The coffee is a less reliable proposition.'],
 ['quarry','Rocky Ridge Gravel Pit','ROCKY RIDGE',5220,2060,380,170,'#a69d84','#737365','quarry','Gravel, big machinery, and the occasional very small business opportunity.'],
 ['lake','Old Mill Lake Fishing Dock','OLD MILL LAKE',4320,5050,240,110,'#b4b995','#5d7d6c','dock','A quiet public fishing shack and wooden dock. Even Sunnyvale needs a break sometimes.'],
 ['cityDiner','The Bluebird Diner','BLUEBIRD DINER',8000,5480,300,150,'#bfcec3','#4e8b8e','diner','Hot coffee, breakfast all day, and a courier box that needs a ride back to Sunnyvale.'],
 ['pawnShop','Second Time Around Pawn','SECOND TIME AROUND',8540,5480,280,150,'#c2b09b','#725882','pawn','Vinyl, used electronics, and somebody else\'s extremely temporary possessions.'],
 ['liquorStore','Harbour Spirits','HARBOUR SPIRITS',7460,5480,260,150,'#d4cbb4','#64795a','liquor','Julian calls this procurement. Sarah calls it a very long drive for something he already has.'],
 ['cityJunkyard','Highway Auto Salvage','AUTO SALVAGE',6370,2820,360,160,'#a2ae9b','#626a50','salvage','A commercial salvage yard, full of possible replacement doors for Ricky\'s car.'],
];
for(const [id,name,shortName,x,y,w,h,color,roofColor,kind,description] of destinations) locations.push({id,name,shortName,x,y,w,h,color,roofColor,kind,description,solid:true,enterable:true,region:getRegionAt(x,y).id,door:{x:x+w/2,y:y+h+25}});
