export const WORLD = { width: 3400, height: 2400 };
export const PLAYER_START = { x: 725, y: 815, facing: 'down' };
export const VEHICLE_START = { x: 760, y: 855, angle: 0 };
export const PATROL_ROUTE = [
  {x:320,y:500},{x:900,y:470},{x:1600,y:510},{x:2350,y:470},{x:3020,y:560},
  {x:3120,y:1120},{x:3080,y:1830},{x:2700,y:2010},{x:1900,y:1980},
  {x:1100,y:2040},{x:400,y:1930},{x:260,y:1450},{x:280,y:880},{x:320,y:500},
];
// Roads form an irregular loop with two winding lanes through the neighborhoods.
export const roads = [];
export const roadPaths = [
  { points: PATROL_ROUTE, width: 88 },
  { points: [{x:280,y:880},{x:800,y:850},{x:1300,y:880},{x:1900,y:850},{x:2500,y:880},{x:3100,y:980}], width: 78 },
  { points: [{x:260,y:1450},{x:830,y:1430},{x:1300,y:1400},{x:1900,y:1450},{x:2500,y:1410},{x:3100,y:1450}], width: 78 },
  { points: [{x:1530,y:505},{x:1550,y:880},{x:1500,y:1425},{x:1570,y:2000}], width: 70 },
];
export const landmarks = [
  { id:'entrance',name:'Sunnyvale Park Entrance',x:1660,y:2360,kind:'entrance' },
  { id:'pond',name:'The duck pond',x:3275,y:400,kind:'pond' },
];
const named = [
  ['ricky',"Ricky's trailer",'RICKY',620,625,210,96,'#ddd0a3','#7b5142','trailer','A perfectly good trailer. The car outside is also a perfectly good trailer, according to Ricky.'],
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
export const locations = named.map(([id,name,shortName,x,y,w,h,color,roofColor,kind,description])=>({id,name,shortName,x,y,w,h,color,roofColor,kind,description,door:{x:x+w/2,y:y+h+25}}));
const palette = [ ['#c2d0b5','#65806b'],['#dbccb1','#8d6e54'],['#bcc8cd','#637e85'],['#d3bcab','#986d63'],['#d4d2ad','#7f8055'],['#abbfa9','#587b62'],['#d7c1ab','#855a4b'] ];
const names=['Maple','Willow','Birch','Spruce','Cedar','Aspen','Pine','Juniper','Oak','Elm'];
let lot=1;
for(const [row,y] of [250,625,1160,1620,2140].entries()) for(let col=0;col<10;col++) {
  const x=350+col*270;
  if(col===4&&row>0&&row<4)continue;
  if(locations.some(b=>b.x===x&&Math.abs(b.y-y)<25))continue;
  const p=palette[(col+row*3)%palette.length],w=190+((col+row)%3)*10,h=88+((row+col)%2)*8;
  locations.push({id:`lot${String(lot).padStart(2,'0')}`,name:`${names[col]} Lane / Lot ${String(lot).padStart(2,'0')}`,shortName:`LOT ${String(lot).padStart(2,'0')}`,x,y:y+((col%3)-1)*8,w,h,color:p[0],roofColor:p[1],kind:'trailer',generic:true,lotNumber:lot,description:'A lived-in Sunnyvale home. Come in, look around, and mind the screen door.',door:{x:x+w/2,y:y+((col%3)-1)*8+h+25}});
  lot++;
}
