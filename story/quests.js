// Deliveries consume their item/count. Collect targets are item ids; visit targets are location ids.
export const quests = [
  {
    id: 'cart_service', title: 'A cart with a heart', giver: 'bubbles', requires: [],
    description: 'Bubbles can turn a few stray carts into a proper repair business. Round up his first batch.',
    steps: [
      { type: 'collect', target: 'cart', count: 3, text: 'Find 3 shopping carts around Sunnyvale.' },
      { type: 'deliver', target: 'bubbles', item: 'cart', count: 3, text: 'Bring the carts back to Bubbles.' },
      { type: 'visit', target: 'scrapyard', text: 'Scout the salvage yard for the next project.' },
    ],
    reward: { money: 110, reputation: 8 },
    completion: 'Bubbles gets his cart service rolling. He already has a more important job in mind: housing the kitties.',
  },
  {
    id: 'kitty_shelter', title: 'Home is where the kitties are', giver: 'bubbles', requires: ['cart_service'],
    description: 'The shed is full. Help Bubbles put together a weatherproof shelter for his rescued cats.',
    steps: [
      { type: 'collect', target: 'scrap', count: 4, text: 'Collect 4 pieces of salvage scrap.' },
      { type: 'deliver', target: 'bubbles', item: 'scrap', count: 4, text: 'Deliver the scrap to Bubbles.' },
      { type: 'talk', target: 'sarah', text: 'Ask Sarah to help finish the kitty shelter.' },
    ],
    reward: { money: 150, reputation: 12 },
    completion: 'Sarah helps Bubbles weatherproof the shelter. The kitties approve by ignoring everyone and moving in.',
  },
  {
    id: 'cart_fleet', title: 'The cart-astrophic expansion', giver: 'bubbles', requires: ['kitty_shelter'],
    description: 'Business is picking up. Bubbles needs more carts to deliver supplies for the fundraiser.',
    steps: [
      { type: 'collect', target: 'cart', count: 4, text: 'Find 4 more shopping carts.' },
      { type: 'deliver', target: 'bubbles', item: 'cart', count: 4, text: 'Take the new fleet to Bubbles.' },
      { type: 'talk', target: 'julian', text: 'Tell Julian the delivery fleet is ready.' },
    ],
    reward: { money: 190, reputation: 10 },
    completion: 'Four squeaky carts become Sunnyvale\'s logistics department. Julian calls it a fleet acquisition.',
  },
  {
    id: 'tool_time', title: 'Tools of the trade', giver: 'ricky', requires: [],
    description: 'Ricky has borrowed his own tools so successfully that he no longer has any. Find them.',
    steps: [
      { type: 'collect', target: 'tool', count: 3, text: 'Find 3 lost tools around the park.' },
      { type: 'deliver', target: 'ricky', item: 'tool', count: 3, text: 'Return the tools to Ricky.' },
      { type: 'visit', target: 'garage', text: 'Check out Cory and Jacob\'s repair shop.' },
    ],
    reward: { money: 100, reputation: 7 },
    completion: 'Ricky has a full toolkit again. He immediately lends it to Cory and forgets he did it.',
  },
  {
    id: 'car_parts', title: 'Mostly roadworthy', giver: 'ricky', requires: ['tool_time'],
    description: 'The car needs repairs before it can carry supplies. Four spare parts should make it less stationary.',
    steps: [
      { type: 'collect', target: 'part', count: 4, text: 'Collect 4 spare parts near the repair shop.' },
      { type: 'deliver', target: 'cory', item: 'part', count: 4, text: 'Bring the spare parts to Cory.' },
      { type: 'talk', target: 'ricky', text: 'Tell Ricky his car is almost ready.' },
    ],
    reward: { money: 170, reputation: 10 },
    completion: 'The engine turns over. Ricky declares a mechanical miracle. Cory quietly removes the extra wrench.',
  },
  {
    id: 'stage_support', title: 'Structurally optimistic', giver: 'ricky', requires: ['car_parts'],
    description: 'Ricky volunteered to fix the stage. Bring materials before his first idea becomes permanent.',
    steps: [
      { type: 'collect', target: 'scrap', count: 3, text: 'Find 3 sturdy pieces of salvage scrap.' },
      { type: 'deliver', target: 'ricky', item: 'scrap', count: 3, text: 'Bring the stage materials to Ricky.' },
      { type: 'visit', target: 'stage', text: 'Inspect the repaired community stage.' },
    ],
    reward: { money: 180, reputation: 11 },
    completion: 'The stage is standing, level, and no longer supported by a shopping cart. An excellent day for construction.',
  },
  {
    id: 'word_out', title: 'A slightly organized event', giver: 'julian', requires: [],
    description: 'Julian is putting together a fundraiser for park repairs. Sarah has the flyers; you have the legs.',
    steps: [
      { type: 'talk', target: 'sarah', text: 'Talk to Sarah about the fundraiser.' },
      { type: 'collect', target: 'flyer', count: 3, text: 'Collect 3 fundraiser flyers.' },
      { type: 'deliver', target: 'julian', item: 'flyer', count: 3, text: 'Bring the flyers to Julian for distribution.' },
    ],
    reward: { money: 120, reputation: 8 },
    completion: 'The fundraiser has a date, a name, and three enthusiastic flyers. Sunnyvale is officially invited.',
  },
  {
    id: 'generator', title: 'Power to the park', giver: 'julian', requires: ['word_out'],
    description: 'No generator, no music. Help Cory get the old unit running before J-Roc tries an acoustic set.',
    steps: [
      { type: 'collect', target: 'part', count: 3, text: 'Find 3 more spare parts for the generator.' },
      { type: 'deliver', target: 'cory', item: 'part', count: 3, text: 'Take the generator parts to Cory.' },
      { type: 'talk', target: 'jroc', text: 'Tell J-Roc the stage will have power.' },
    ],
    reward: { money: 200, reputation: 12 },
    completion: 'The generator roars to life. Every porch light flickers. J-Roc calls it a sound check.',
  },
  {
    id: 'block_party', title: 'One last scheme', giver: 'julian', requires: ['generator', 'stage_support', 'mixtape'],
    description: 'The stage is fixed, the music is ready, and Julian can almost see this working. Rally the crew.',
    steps: [
      { type: 'talk', target: 'randy', text: 'Make sure Randy has the grill ready.' },
      { type: 'talk', target: 'bubbles', text: 'Ask Bubbles to bring the crew.' },
      { type: 'visit', target: 'stage', text: 'Head to the community stage for the fundraiser.' },
    ],
    reward: { money: 350, reputation: 20 },
    completion: 'Music, burgers, kitties, and one minor electrical incident. The fundraiser succeeds. You helped the whole park pull it off.',
  },
  {
    id: 'mixtape', title: 'The lost Sunnyvale sessions', giver: 'jroc', requires: [],
    description: 'J-Roc\'s master tapes went missing between his trailer and the laundromat. Find the sound of Sunnyvale.',
    steps: [
      { type: 'visit', target: 'laundry', text: 'Check the laundromat for the missing tapes.' },
      { type: 'collect', target: 'tape', count: 3, text: 'Recover 3 cassette tapes.' },
      { type: 'deliver', target: 'jroc', item: 'tape', count: 3, text: 'Return the masters to J-Roc.' },
    ],
    reward: { money: 140, reputation: 10 },
    completion: 'The Sunnyvale Sessions are recovered. Your executive producer credit is payable entirely in respect.',
  },
  {
    id: 'grill_duty', title: 'A man\'s gotta cater', giver: 'randy', requires: [],
    description: 'Randy is short on burgers for the fundraiser. Quality control has been unusually thorough today.',
    steps: [
      { type: 'visit', target: 'store', text: 'Visit the general store for supplies.' },
      { type: 'collect', target: 'burger', count: 2, text: 'Pick up 2 cheeseburgers. Save them for Randy.' },
      { type: 'deliver', target: 'randy', item: 'burger', count: 2, text: 'Deliver the burgers to Randy.' },
    ],
    reward: { money: 90, reputation: 8 },
    completion: 'Randy promises these burgers are for the guests. He puts them somewhere safe, which appears to be his plate.',
  },
  {
    id: 'bottle_patrol', title: 'A cleaner kind of scheme', giver: 'lahey', requires: [],
    description: 'Lahey wants the park respectable before the party. Pick up returnables and earn his grudging approval.',
    steps: [
      { type: 'collect', target: 'bottle', count: 6, text: 'Collect 6 returnable bottles.' },
      { type: 'deliver', target: 'lahey', item: 'bottle', count: 6, text: 'Take the bottles to Mr. Lahey.' },
      { type: 'talk', target: 'sarah', text: 'Let Sarah know the park is cleaned up.' },
    ],
    reward: { money: 100, reputation: 14 },
    completion: 'Lahey inspects the paths. After a long pause, he admits they look all right. Sarah translates: he\'s impressed.',
  },
];
