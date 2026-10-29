import { locations } from './locations.js';

const prop = (id, label, x, y, w, h, kind, color, text, action) =>
    ({ id, label, x, y, w, h, kind, color, text, solid: kind !== 'rug', ...(action ? { action } : {}) });
const couch = (text = 'The cushions have seen better decades.') => prop('couch', 'Questionable couch', 55, 105, 195, 85, 'couch', '#84724f', text);
const fridge = () => prop('fridge', 'Snack cupboard', 585, 65, 80, 100, 'fridge', '#c6cdb8', 'Nothing in here belongs to you. Randy sells fresh snacks at the Dirty Burger.');
const bed = () => prop('bed', 'A place to crash', 475, 295, 180, 105, 'bed', '#8eaaa0', 'A proper rest will restore your health, headspace, and energy. Tomorrow can have its own problems.', 'rest');
const table = (label, text) => prop('table', label, 300, 170, 125, 90, 'table', '#9e7951', text);
const profiles = {
    ricky: { floor: '#987653', wall: '#d0c6a1', props: [couch('The couch doubles as a filing cabinet for pepperoni wrappers.'), fridge(), bed(), table('The master plan', 'A cereal box says FIX CAR. Underneath it says GET CEREAL.'), prop('tv', 'Borrowed television', 70, 290, 115, 70, 'tv', '#464c46', 'The antenna is a bent shopping-cart handle. The picture is surprisingly decent.')] },
    julian: { floor: '#79634a', wall: '#bdc7b2', props: [couch('Julian insists this is a business lounge.'), fridge(), bed(), table('Business ledger', 'Park repairs: $1,500. Complications: several. Coaster budget: non-negotiable.'), prop('bar', 'The good glasses', 500, 200, 150, 55, 'counter', '#655440', 'Every glass has a coaster. None of the paperwork has a receipt.')] },
    bubbles: { floor: '#aa8c60', wall: '#cfb88b', props: [prop('cats', 'Kitty corner', 70, 65, 175, 110, 'cats', '#d7bd83', 'Tiny beds, clean bowls, and three cats judging your handbag.'), prop('bench', 'Cart repair bench', 470, 75, 180, 85, 'workbench', '#8b9e91', 'Bubbles has rebuilt this wheel so many times it is technically a new wheel.'), table('Kitty shelter plans', 'Dry roof, warm blankets, enough room for every kitty. A scheme with a genuinely decent purpose.'), bed(), prop('shelf', 'Perfectly sorted bolts', 65, 280, 140, 115, 'shelf', '#8c7153', 'Every jar is labelled. This is the most organized square metre in Sunnyvale.')] },
    sarah: { floor: '#9e806a', wall: '#dbc3b3', props: [prop('salon', 'Haircut station', 70, 75, 155, 95, 'mirror', '#b69cb3', 'A mirror, a sharp pair of scissors, and a firm policy against paying in cart parts.'), fridge(), table('Fundraiser schedule', 'The sensible plan has times, names, and a separate column for people who will forget their jobs.'), bed(), prop('sofa', 'Waiting bench', 75, 285, 165, 80, 'couch', '#9c758c', 'An excellent place to wait while Sarah explains why your plan needs work.')] },
    jroc: { floor: '#756b67', wall: '#b6c5cb', props: [prop('decks', 'Sunnyvale Sound desk', 75, 75, 240, 95, 'studio', '#677d88', 'Two turntables, a cassette deck, and a handwritten warning: CORY, DO NOT TOUCH.'), prop('speaker', 'Big speaker', 560, 85, 90, 120, 'speaker', '#4a5151', 'Rated for one block party and several noise complaints.'), table('Mixtape archive', 'A stack of handwritten track lists. J-Roc is taking the liner notes very seriously.'), bed(), prop('couch', 'Studio couch', 70, 300, 175, 90, 'couch', '#707e9d', 'If you fall asleep here, you will end up on a backing track.')] },
    office: { floor: '#81846b', wall: '#c7cfb3', props: [prop('desk', 'Park manager desk', 65, 65, 220, 100, 'desk', '#9c8256', 'A stack of notices says NO SCHEMES. A smaller stack says PENDING INVESTIGATION.'), prop('files', 'Incident files', 570, 65, 95, 140, 'shelf', '#9b9f8c', 'Each folder contains one incident and approximately six opinions.'), table('Park rules', 'No littering. No speeding. No unauthorized satellite dishes. The list continues onto the back.'), prop('chair', 'Randy\'s spare chair', 80, 290, 120, 95, 'couch', '#aa9a6b', 'The chair is structurally sound. The lunch stains are historic.'), bed()] },
    burger: { floor: '#9c8d6e', wall: '#d9bc88', props: [prop('grill', 'Dirty Burger grill', 65, 65, 245, 110, 'grill', '#606f67', 'Hot griddle, warm buns, and a proud disregard for measuring ingredients.'), prop('counter', 'Burger counter', 470, 80, 190, 100, 'counter', '#b58953', 'The menu has two options: cheeseburger and additional cheeseburger.', 'shop'), table('Patio menu', 'Cheeseburger $8. Pepperoni $5. Questions about the specials: ask Randy.'), prop('freezer', 'Industrial freezer', 65, 285, 125, 110, 'fridge', '#bdc5ad', 'Randy has labelled one entire shelf QUALITY CONTROL.')] },
    store: { floor: '#a99b75', wall: '#d8d0ab', props: [prop('shelf-a', 'Snacks aisle', 60, 70, 190, 90, 'shelf', '#a89264', 'Salty, chewy, individually wrapped. The foundations of a balanced Sunnyvale lunch.'), prop('shelf-b', 'Household goods', 470, 70, 190, 90, 'shelf', '#9aa282', 'Extension cords, duct tape, and other temporary permanent repairs.'), prop('counter', 'General store till', 475, 285, 185, 95, 'counter', '#a88756', 'A receipt is optional. Paying is considerably less optional.', 'shop'), prop('cooler', 'Cold drinks', 65, 280, 125, 115, 'fridge', '#9eb4ae', 'The compressor hums in the exact key of the laundromat dryer.')] },
    garage: { floor: '#858a7a', wall: '#c3c8b6', props: [prop('bench', 'Odd-job workbench', 65, 65, 215, 110, 'workbench', '#8e9d8c', 'Sort some parts for Cory: $35, 45 minutes, and just enough effort to count as work.', 'work'), prop('tools', 'Tool wall', 475, 65, 185, 85, 'shelf', '#a18b62', 'The outlines are labelled. Most tools are in entirely different outlines.'), table('Generator diagram', 'Jacob drew arrows from THE THING to THE OTHER THING. Cory has added a question mark.'), prop('tires', 'Spare tires', 65, 300, 150, 95, 'tires', '#555f58', 'Four tires. Three sizes. One ambitious business.'), prop('lift', 'Engine stand', 490, 280, 160, 110, 'workbench', '#7f9688', 'It is not quite an engine yet. It is more of an engine-themed collection.')] },
    laundry: { floor: '#a3aba1', wall: '#d6ddcc', props: [prop('washers', 'Working washing machines', 65, 65, 240, 115, 'washers', '#b6c9c4', 'Two machines wash clothes. The third mostly makes suggestions.'), prop('dryer', 'The loud dryer', 490, 65, 165, 115, 'washers', '#b9c3b2', 'A missing cassette rattles somewhere in the drum. J-Roc will not be pleased.'), table('Folding table', 'A clean shirt has been here so long it now qualifies as community property.'), prop('basket', 'Lost and found', 75, 300, 140, 95, 'crate', '#b29c74', 'Single socks, a bent key, and absolutely no matching explanations.')] },
    scrapyard: { floor: '#8d8972', wall: '#aeb59b', props: [prop('scrap', 'Sorted salvage', 60, 65, 215, 115, 'crate', '#929f91', 'Bubbles sees shelter brackets. Ricky sees car parts. Cory sees several sharp edges.'), prop('press', 'Retired metal press', 485, 65, 170, 130, 'workbench', '#70857a', 'Disconnected for the protection of literally everyone.'), table('Salvage ledger', 'Nothing is worthless if someone is stubborn enough.'), prop('crates', 'Spare fittings', 65, 300, 165, 95, 'crate', '#a58b61', 'Future repairs, waiting politely in a pile.')] },
    stage: { floor: '#a88d60', wall: '#c0a977', props: [prop('amp', 'Amplifier stack', 65, 65, 145, 120, 'speaker', '#525f5b', 'The sound check has already upset a goose at the far end of the park.'), prop('lights', 'Lighting desk', 480, 65, 175, 95, 'studio', '#869e91', 'The big switch says SHOWTIME. The little switch says ALSO SHOWTIME.'), table('Running order', 'Welcome speech. Local music. Burger break. A much longer burger break.'), prop('cases', 'Road cases', 65, 300, 175, 100, 'crate', '#7f8d7a', 'Borrowed equipment, borrowed cables, and an unusual amount of hope.')] },
    mall: { floor: '#c2c4b3', wall: '#d9dbce', props: [
        prop('cart-desk', 'Shopping cart service desk', 65, 70, 200, 95, 'desk', '#829b91', 'Bubbles left a business card here. It is mostly a very detailed drawing of a properly repaired wheel.'),
        prop('food-court', 'Food court counter', 475, 75, 185, 90, 'counter', '#b99a65', 'Road-trip food: cheeseburgers $8, pepperoni $5. Keep the receipt out of the grease.', 'shop'),
        table('Mall directory', 'Food court to the right, cart returns to the left. The YOU ARE HERE sticker has been moved three times.'),
        prop('retail', 'Small shop displays', 65, 300, 160, 95, 'shelf', '#9da5b2', 'Discount sunglasses, phone cases, and a suspiciously familiar brand of speakers.'),
        prop('returns', 'Cart return office', 495, 300, 150, 95, 'crate', '#829c94', 'A clipboard records every missing cart. Bubbles would like to discuss the word missing.')
    ] },
    gasStation: { floor: '#aaa999', wall: '#d9d3b7', props: [
        prop('cooler', 'Highway drink cooler', 65, 70, 120, 110, 'fridge', '#a4beb4', 'Cold drinks and the loudest refrigeration unit on this stretch of highway.'),
        prop('snacks', 'Travel snack shelf', 475, 70, 185, 85, 'shelf', '#bca070', 'A whole aisle dedicated to foods Ricky can eat without putting down a wrench.'),
        table('Road map and service notices', 'Halifax to the southeast. Quarry to the east. Sunnyvale back up the winding road.'),
        prop('fuel-desk', 'Fuel receipt desk', 65, 300, 170, 95, 'desk', '#9b8962', 'A paper sign asks customers to stop using the windshield squeegee as a car wash.'),
        prop('counter', 'Gas station snack counter', 480, 285, 180, 100, 'counter', '#a3885e', 'Cheeseburgers $8. Pepperoni $5. Long drives are easier with lunch.', 'shop')
    ] },
    cityDiner: { floor: '#b3a48c', wall: '#e0ceb0', props: [
        prop('grill', 'Diner kitchen grill', 65, 70, 240, 100, 'grill', '#78867a', 'A proper griddle, clean spatulas, and a cook who has heard every road-trip excuse.'),
        prop('counter', 'Diner service counter', 480, 75, 180, 90, 'counter', '#b88b61', 'Cheeseburgers $8, pepperoni $5. The staff has learned what the Sunnyvale crowd orders.', 'shop'),
        table('Window table', 'Julian has circled a few numbers on a napkin. He has also circled the coffee stain.'),
        prop('booth', 'Roadside diner booth', 65, 300, 170, 95, 'bench', '#af735b', 'Vinyl seating, a laminated menu, and a view of everyone parking badly.'),
        prop('specials', 'Daily specials board', 495, 295, 155, 95, 'desk', '#7a8e7b', 'The lunch special is lunch. The evening special is the same lunch with different handwriting.')
    ] },
    pawnShop: { floor: '#93836b', wall: '#c8c5ac', props: [
        prop('records', 'Secondhand record crates', 65, 70, 190, 100, 'crate', '#9b815a', 'J-Roc has sorted these records into samples, potential samples, and absolutely samples.'),
        prop('gear', 'Used music equipment', 480, 75, 180, 100, 'studio', '#879b94', 'A drum machine, two microphones, and a keyboard missing one extremely specific note.'),
        table('Appraisal desk', 'The owner has written WORKS MOSTLY on nearly every price tag.'),
        prop('amplifier', 'Pawned amplifier', 65, 300, 135, 90, 'speaker', '#56625c', 'It hums when unplugged. Nobody wants to explain that.'),
        prop('counter', 'Pawn shop till', 485, 290, 170, 95, 'counter', '#a28a61', 'Cash trades only. J-Roc insists his next mixtape counts as a future cash equivalent.')
    ] },
    liquorStore: { floor: '#a39778', wall: '#d2cfb6', props: [
        prop('bottles-a', 'Glass bottle shelves', 65, 70, 240, 95, 'shelf', '#9c916d', 'Neatly arranged bottles. Someone has asked Julian to leave the display coasters where they are.'),
        prop('bottles-b', 'Stock room shelves', 480, 75, 180, 95, 'shelf', '#7f9788', 'Everything is labelled. Even Lahey would have trouble arguing with this filing system.'),
        table('License and store notices', 'Valid identification required. No open containers. No negotiating the rules with a speech.'),
        prop('returns', 'Empty bottle returns', 65, 300, 150, 90, 'crate', '#9fac91', 'Returns are sorted by size. Lahey would appreciate the numbers on this clipboard.'),
        prop('counter', 'Licensed checkout counter', 480, 290, 180, 95, 'counter', '#a6875a', 'Julian is checking fundraiser supplies. Your handbag is already full enough without adding glass.')
    ] },
    quarry: { floor: '#9a9884', wall: '#c5c6ad', props: [
        prop('bench', 'Quarry maintenance bench', 65, 70, 220, 100, 'workbench', '#889b8a', 'Heavy tools and proper safety guards. Cory would like to borrow the illustrated instructions.'),
        prop('safety', 'Hard hats and safety gear', 480, 70, 180, 85, 'shelf', '#b9ab6d', 'Hard hats required beyond the office. Ricky says the rule is surprisingly specific about what counts as a hat.'),
        table('Quarry load ledger', 'Crushed stone by the load. One handwritten order simply reads: enough to fix a terrible driveway.'),
        prop('weighbridge', 'Weighbridge console', 65, 300, 170, 90, 'studio', '#7f938d', 'A large red number explains exactly how much gravel weighs more than the Shitmobile.'),
        prop('tools', 'Equipment storage chest', 490, 300, 160, 90, 'crate', '#a28b64', 'Spare fittings, gloves, and a sign asking everyone to return the gloves.')
    ] },
    lake: { floor: '#a89a73', wall: '#c8ceb2', props: [
        prop('tackle', 'Lake tackle counter', 65, 70, 190, 100, 'counter', '#9c855c', 'Hooks, floats, and a patient handwritten explanation of which end goes in the water.'),
        prop('rods', 'Fishing rod rack', 480, 70, 180, 85, 'shelf', '#7f9b8c', 'A row of rods ready for a quieter kind of afternoon. Bubbles prefers this to most business meetings.'),
        table('Lake map and catch log', 'The best fishing spot has been circled by six different people in six different places.'),
        prop('bench', 'Tackle shack waiting bench', 65, 300, 170, 90, 'bench', '#8d9572', 'Dry wood, muddy boot prints, and the sound of the lake outside.'),
        prop('jackets', 'Life jacket chest', 490, 300, 150, 90, 'crate', '#b5a16c', 'Life jackets are not optional, even when Ricky says the boat is practically a dock.')
    ] },
    cityJunkyard: { floor: '#8c8b76', wall: '#b6bca1', props: [
        prop('engines', 'Salvaged engine workbench', 65, 70, 220, 110, 'workbench', '#7d9287', 'Engine blocks wait for a second chance. Most of them still look more hopeful than Ricky\'s old starter.'),
        prop('parts', 'Sorted scrap crates', 480, 70, 180, 95, 'crate', '#9d9b80', 'Bolts, brackets, and exactly the sort of useful junk Bubbles refuses to call junk.'),
        table('Salvage scales ledger', 'Metal by weight, parts by condition, and no refunds for things described as probably fine.'),
        prop('gearboxes', 'Transmission parts crate', 65, 300, 170, 95, 'crate', '#a18e65', 'A maze of gears. Cory has wisely left the lids on these ones.'),
        prop('bench', 'Parts inspection bench', 490, 300, 160, 95, 'workbench', '#839b8c', 'A lamp, a vise, and enough space to find out whether a bargain is actually a bargain.')
    ] }
};

export const interiors = Object.fromEntries(locations.filter(location => location.enterable !== false && location.id !== 'ricky').map((location, index) => {
    const profile = profiles[location.id] || {
        floor: ['#a38b65', '#8e876c', '#a18b7a'][index % 3], wall: location.color || '#d4c7a7',
        props: [couch('A lived-in trailer with a remarkably ambitious collection of throw pillows.'), fridge(), bed(),
            table('Resident noticeboard', `Welcome to ${location.name}. A handwritten note asks visitors to wipe their feet.`),
            prop('shelf', 'Personal odds and ends', 65, 290, 130, 95, 'shelf', '#9d815b', 'Family photos, a chipped mug, and a tiny model of a much nicer trailer.')]
    };
    return [location.id, { id: location.id, name: location.name, width: 720, height: 520,
        floor: profile.floor, wall: profile.wall, furniture: profile.props,
        spawn: { x: 360, y: 430 }, exit: { x: 360, y: 480 } }];
}));

export default interiors;
