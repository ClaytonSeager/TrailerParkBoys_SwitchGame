export const items = {
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
  cart: [[980,520],[1285,525],[590,590],[1600,565],[2130,570],[470,1190],[1040,1180],[1490,1195],[2180,1190]],
  scrap: [[225,1385],[310,1385],[465,1400],[595,1515],[640,1580],[685,1440],[1650,1500],[1720,1590],[2155,1515],[2260,1450],[2250,1575]],
  tool: [[215,435],[480,480],[665,560],[1440,1150],[1510,1210],[1905,1150],[530,1400]],
  part: [[1550,1140],[1620,1180],[1840,1170],[1880,1230],[1495,995],[2050,1140],[650,1430],[730,1530],[900,1450],[2040,1630]],
  tape: [[2150,1135],[2300,1160],[2070,970],[1850,530],[2100,465],[2230,565]],
  flyer: [[1430,480],[1650,480],[1520,550],[1310,1140],[1130,1170],[2050,1410],[2220,1385]],
  bottle: [[250,580],[440,640],[820,535],[1290,620],[1740,640],[2210,660],[595,1180],[1460,1400],[1130,1530]],
  burger: [[675,1115],[830,1125],[625,1200],[840,1190],[1080,1130],[1400,1165]],
  pepperoni: [[200,500],[385,545],[550,540],[1415,570],[2210,1220],[1010,1470]],
};

export const pickups = Object.entries(groups).flatMap(([item, positions]) =>
  positions.map(([x, y], index) => ({ id: `${item}-${index + 1}`, item, x, y, respawn: false }))
);
