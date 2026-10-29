export const items = {
  mallReceipt: {name:'Cart deposit receipt',description:'A slightly crumpled mall cart deposit slip. Bubbles will know exactly what it is worth.',icon:'▤',color:'#e1d3ab'},
  fuelCan: {name:'Fuel can',description:'A sealed can from Gas & Go. Ricky calls it a mobility investment.',icon:'▣',color:'#ba7050'},
  quarryStone: {name:'Quarry stone sample',description:'A surprisingly useful piece of Rocky Ridge gravel. Sarah asked for a proper sample.',icon:'◆',color:'#b2b19a'},
  fishingTackle: {name:'Fishing tackle',description:'A tidy little tackle tin from Old Mill Lake. Keep the hooks away from your bag lining.',icon:'⚒',color:'#759d8b'},
  vinylRecord: {name:'Vintage vinyl',description:'A dusty local pressing from Second Time Around. J-Roc calls that texture.',icon:'●',color:'#8e779f'},
  deliveryParcel: {name:'City delivery parcel',description:'A sealed Bluebird courier box addressed to Sunnyvale. It smells faintly of coffee.',icon:'▥',color:'#c39e68'},
  cart: { name: 'Shopping cart', description: 'A cart ready for a second career at Bubbles\' repair service.', icon: '▥', color: '#b8c7c6' },
  scrap: { name: 'Salvage scrap', description: 'Useful metal for the kitty shelter and stage supports.', icon: '◆', color: '#929d91' },
  tool: { name: 'Lost tool', description: 'A wrench from Ricky\'s extremely informal lending library.', icon: '⚒', color: '#d1ae6d' },
  part: { name: 'Spare part', description: 'A generator or car part. Cory is optimistic about both.', icon: '⚙', color: '#9aac9d' },
  tape: { name: 'Cassette tape', description: 'One of J-Roc\'s missing masters. Keep away from magnets.', icon: '▣', color: '#b193bd' },
  flyer: { name: 'Fundraiser flyer', description: 'Hand-lettered invitations to a slightly organized block party.', icon: '▤', color: '#e4cd8f' },
  bottle: { name: 'Returnable bottle', description: 'Ten cents of park beautification. Lahey is keeping count.', icon: '♧', color: '#8bb494' },
  burger: { name: 'Cheeseburger', description: 'A Dirty Burger special. Eat one from your handbag to feel better.', icon: '≋', color: '#dca157', cost: 8, effect: { health: 18, energy: 35, mentalState: 8 } },
  pepperoni: { name: 'Pepperoni', description: 'A pocket-sized snack. Restores a little health, energy, and perspective.', icon: '●', color: '#c77c61', cost: 5, effect: { health: 10, energy: 20, mentalState: 5 } },
};

// Hand placed in open space: enough supplies for every mission, plus extras.
const groups = {
  mallReceipt:[[7730,4865],[8040,4870],[8210,4865]],
  fuelCan:[[3030,3120],[3270,3130],[3390,3085]],
  quarryStone:[[5180,2270],[5360,2300],[5640,2260]],
  fishingTackle:[[4320,5210],[4520,5215],[4630,5180]],
  vinylRecord:[[8520,5710],[8740,5690],[8860,5695]],
  deliveryParcel:[[8010,5690],[8200,5705],[8330,5685]],
  cart: [[920,800],[1060,795],[810,795],[1210,805],[1660,790],[2150,795],[2910,805],[670,1350],[2440,1355]],
  scrap: [[315,1780],[410,1800],[545,1775],[610,1840],[650,1745],[690,1880],[2390,1800],[2490,1780],[2750,1790],[2810,1850],[3020,1785]],
  tool: [[610,785],[850,780],[1250,800],[2460,1320],[2520,1380],[2750,1320],[590,1780]],
  part: [[2520,1335],[2580,1380],[2725,1330],[2780,1380],[2395,1320],[3025,1320],[630,1800],[720,1860],[890,1790],[2750,1840]],
  tape: [[2825,1320],[2970,1335],[2750,1200],[2480,795],[2700,790],[2870,800]],
  flyer: [[1950,790],[2150,805],[2230,780],[2060,1340],[1910,1330],[2390,1790],[2780,1795]],
  bottle: [[415,800],[570,830],[1370,785],[1730,815],[2300,800],[3000,805],[800,1330],[1860,1810],[1170,1795]],
  burger: [[930,1315],[1060,1320],[880,1370],[1120,1355],[1935,1330],[2190,1335]],
  pepperoni: [[660,805],[790,810],[1135,805],[2240,815],[3010,1360],[1330,1820]],
};

export const pickups = Object.entries(groups).flatMap(([item, positions]) =>
  positions.map(([x, y], index) => ({ id: `${item}-${index + 1}`, item, x, y, respawn: false }))
);
