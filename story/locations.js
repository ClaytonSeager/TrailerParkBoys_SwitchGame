export const WORLD = { width: 2400, height: 1700 };

export const roads = [
  { x: 55, y: 710, w: 2290, h: 110 },
  { x: 55, y: 1260, w: 2290, h: 110 },
  { x: 55, y: 480, w: 100, h: 890 },
  { x: 875, y: 480, w: 100, h: 890 },
  { x: 1940, y: 480, w: 100, h: 890 },
];

export const landmarks = [
  { id: 'entrance', name: 'Sunnyvale Park Entrance', x: 1200, y: 1510, kind: 'entrance' },
];

// Building rectangles are solid. Doors sit in open space beneath their fronts.
export const locations = [
  { id: 'ricky', name: "Ricky's trailer", shortName: 'RICKY', x: 165, y: 210, w: 300, h: 175, color: '#d9d2ad', roofColor: '#826d59', kind: 'trailer', description: 'A perfectly good trailer. The car on the lawn is also a perfectly good trailer, according to Ricky.', door: { x: 315, y: 410 } },
  { id: 'julian', name: "Julian's trailer", shortName: 'JULIAN', x: 560, y: 210, w: 300, h: 175, color: '#b6c4b3', roofColor: '#566853', kind: 'trailer', description: 'Headquarters of several extremely temporary business ventures. Coasters are mandatory.', door: { x: 710, y: 410 } },
  { id: 'bubbles', name: "Bubbles' shed", shortName: 'BUBBLES', x: 1000, y: 230, w: 255, h: 155, color: '#bd9a6a', roofColor: '#705341', kind: 'shed', description: 'Shopping carts, rescued kitties, and the only sensible person within walking distance.', door: { x: 1127, y: 410 } },
  { id: 'sarah', name: "Sarah's trailer", shortName: 'SARAH', x: 1390, y: 210, w: 290, h: 175, color: '#c9b6a4', roofColor: '#8c6571', kind: 'trailer', description: 'Haircuts, practical advice, and no patience for another one of the boys\' schemes.', door: { x: 1535, y: 410 } },
  { id: 'jroc', name: "J-Roc's trailer", shortName: 'J-ROC', x: 1820, y: 210, w: 310, h: 175, color: '#a4bbbf', roofColor: '#597c80', kind: 'trailer', description: 'Sunnyvale Sound Studio. Open whenever someone remembers where the extension cord went.', door: { x: 1975, y: 410 } },
  { id: 'office', name: "Lahey's park office", shortName: 'PARK OFFICE', x: 205, y: 875, w: 320, h: 205, color: '#d6caa5', roofColor: '#606f59', kind: 'office', description: 'A notice reads: NO SCHEMES. A second notice reads: ESPECIALLY THAT ONE.', door: { x: 365, y: 1105 } },
  { id: 'burger', name: 'The Dirty Burger', shortName: 'DIRTY BURGER', x: 625, y: 920, w: 235, h: 150, color: '#d0b57c', roofColor: '#ab5d44', kind: 'burger', description: 'Hot grill. Questionable accounting. The best cheeseburger in this particular parking lot.', door: { x: 742, y: 1095 } },
  { id: 'store', name: 'Sunnyvale general store', shortName: 'GENERAL STORE', x: 1080, y: 890, w: 310, h: 190, color: '#d9caa6', roofColor: '#80745b', kind: 'store', description: 'Cold drinks and hot gossip. Pick up snacks outside to keep your energy up.', door: { x: 1235, y: 1105 } },
  { id: 'garage', name: 'Cory & Jacob repair shop', shortName: 'REPAIR SHOP', x: 1550, y: 890, w: 340, h: 190, color: '#b8bdb0', roofColor: '#687a72', kind: 'garage', description: 'The sign says FULL SERVICE. Neither mechanic is entirely sure what services those are.', door: { x: 1720, y: 1105 } },
  { id: 'laundry', name: 'Park laundromat', shortName: 'LAUNDROMAT', x: 2110, y: 890, w: 225, h: 185, color: '#d3d9c6', roofColor: '#718b80', kind: 'laundry', description: 'Three washing machines, two working sockets, and a remarkable number of lost cassette tapes.', door: { x: 2222, y: 1100 } },
  { id: 'scrapyard', name: 'Sunnyvale salvage yard', shortName: 'SALVAGE YARD', x: 195, y: 1450, w: 360, h: 140, color: '#a6a092', roofColor: '#766e60', kind: 'yard', description: 'One person\'s junk is Bubbles\' next business model. Watch your step around the mufflers.', door: { x: 375, y: 1615 } },
  { id: 'stage', name: 'Community stage', shortName: 'COMMUNITY STAGE', x: 1775, y: 1450, w: 330, h: 130, color: '#b89b69', roofColor: '#6e5940', kind: 'stage', description: 'A plywood stage with big ambitions. The entire park is counting on a very small generator.', door: { x: 1940, y: 1605 } },
];
