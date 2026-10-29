import { characters } from './story/characters.js';
import { locations } from './story/locations.js';
import { interiors } from './story/interiors.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const homes = { ricky: 'shitmobile', bubbles: 'bubbles', julian: 'julian', sarah: 'sarah',
    jroc: 'jroc', randy: 'burger', lahey: 'office', cory: 'garage' };
const errands = { ricky: ['julian', 'burger', 'gasStation', 'quarry', 'ricky'], bubbles: ['scrapyard', 'burger', 'mall', 'lake', 'bubbles'],
    julian: ['stage', 'store', 'liquorStore', 'cityDiner', 'julian'], sarah: ['store', 'stage', 'sarah'],
    jroc: ['laundry', 'stage', 'pawnShop', 'jroc'], randy: ['office', 'burger', 'store'],
    lahey: ['burger', 'laundry', 'office'], cory: ['scrapyard', 'store', 'garage'] };
const phrases = {
    fight: { ricky: 'Boys! My car is not a boxing ring!', bubbles: 'Leave the kitties out of this!',
        julian: 'Keep the fundraiser out of this.', sarah: 'Seriously? In the middle of the day?',
        jroc: 'That is not the show we booked.', randy: 'Not near the grill!', lahey: 'I am documenting this.', cory: 'Should I get Jacob?' },
    car: { ricky: 'Watch the paint! That is my house!', bubbles: 'Slow down! There are kitties!',
        julian: 'Easy on the gas, bud.', sarah: 'People live here!', jroc: 'That engine needs a rhythm section.',
        randy: 'You will spill the burgers!', lahey: 'There is a speed limit!', cory: 'The brakes work, right?' },
    horn: { ricky: 'Yeah, yeah, I can hear my own car!', bubbles: 'You will wake the kitties!',
        julian: 'We can hear you, bud.', sarah: 'Use your indoor horn.', jroc: 'Wrong key, but good energy.',
        randy: 'The grill is open!', lahey: 'That counts as a noise complaint.', cory: 'Is that a good engine noise?' }
};
const byId = id => locations.find(location => location.id === id);
const key = (x, y) => `${x},${y}`;

// A cached navigation grid is shared by all residents; exact endpoints and every
// movement segment still use the same collision checks as the player.
class Navigator {
    constructor(engine) { this.engine = engine; this.cell = 40; this.blocked = new Map(); }
    free(x, y, scene) {
        const id = `${scene}:${x},${y}`;
        if (!this.blocked.has(id)) this.blocked.set(id, !this.engine.isBlocked(x * this.cell, y * this.cell, 13, scene));
        return this.blocked.get(id);
    }
    clear(a, b, scene) {
        const steps = Math.max(1, Math.ceil(dist(a, b) / 10));
        for (let index = 1; index <= steps; index++) if (this.engine.isBlocked(
            a.x + (b.x - a.x) * index / steps, a.y + (b.y - a.y) * index / steps, 13, scene)) return false;
        return true;
    }
    node(point, scene) {
        const cx = Math.round(point.x / this.cell), cy = Math.round(point.y / this.cell);
        let best = null, score = Infinity;
        for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
            const x = cx + dx, y = cy + dy, p = { x: x * this.cell, y: y * this.cell };
            const cost = dist(p, point);
            if (cost < score && this.free(x, y, scene) && this.clear(point, p, scene)) { best = { x, y }; score = cost; }
        }
        return best;
    }
    path(start, end, scene) {
        if (this.clear(start, end, scene)) return [{ ...end }];
        const first = this.node(start, scene), last = this.node(end, scene);
        if (!first || !last) return [];
        const heuristic = point => Math.abs(point.x - last.x) + Math.abs(point.y - last.y);
        const heap = [], costs = new Map(), parents = new Map(), visited = new Set();
        const push = node => {
            heap.push(node);
            for (let index = heap.length - 1; index > 0;) {
                const parent = (index - 1) >> 1;
                if (heap[parent].f <= heap[index].f) break;
                [heap[parent], heap[index]] = [heap[index], heap[parent]]; index = parent;
            }
        };
        const pop = () => {
            const head = heap[0], tail = heap.pop();
            if (heap.length) {
                heap[0] = tail;
                for (let index = 0;;) {
                    const left = index * 2 + 1, right = left + 1;
                    let child = index;
                    if (left < heap.length && heap[left].f < heap[child].f) child = left;
                    if (right < heap.length && heap[right].f < heap[child].f) child = right;
                    if (child === index) break;
                    [heap[index], heap[child]] = [heap[child], heap[index]]; index = child;
                }
            }
            return head;
        };
        costs.set(key(first.x, first.y), 0); push({ ...first, f: heuristic(first) });
        while (heap.length && visited.size < 8000) {
            const point = pop(), id = key(point.x, point.y);
            if (visited.has(id)) continue;
            visited.add(id);
            if (point.x === last.x && point.y === last.y) {
                const path = [{ ...end }];
                let cursor = id;
                while (cursor) {
                    const [x, y] = cursor.split(',').map(Number);
                    path.push({ x: x * this.cell, y: y * this.cell }); cursor = parents.get(cursor);
                }
                return path.reverse();
            }
            for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                const x = point.x + dx, y = point.y + dy, next = key(x, y), cost = costs.get(id) + 1;
                if (!this.free(x, y, scene) || cost >= (costs.get(next) ?? Infinity)) continue;
                costs.set(next, cost); parents.set(next, id); push({ x, y, f: cost + heuristic({x,y}) });
            }
        }
        return [];
    }
}

function goal(engine, resident, point, mode, activity) {
    resident.target = { x: point.x, y: point.y };
    resident.mode = mode; resident.activity = activity;
    resident.path = engine._npcNav.path(resident, resident.target, resident.scene);
    resident.repath = 3;
}

function homePoint(engine, resident) {
    if (resident.home === 'shitmobile') {
        const car = engine.state.vehicle;
        return engine.findSafePosition({ x: car.x + Math.cos(car.angle + Math.PI / 2) * 75,
            y: car.y + Math.sin(car.angle + Math.PI / 2) * 75 });
    }
    return byId(resident.home)?.door || { x: resident.startX, y: resident.startY };
}

function headHome(engine, resident) {
    resident.destination = resident.home;
    resident.homeRefresh = 3;
    goal(engine, resident, homePoint(engine, resident), 'home', resident.home === 'shitmobile' ? 'Heading back to the Shitmobile' : 'Heading home');
}

function goErrand(engine, resident) {
    const stops = errands[resident.id] || [resident.home];
    const destination = stops[resident.routineIndex++ % stops.length];
    resident.destination = destination;
    const building = byId(destination);
    if (!building) { headHome(engine, resident); return; }
    goal(engine, resident, building.door, 'errand', `Walking to ${building.name}`);
}

function moveResident(engine, resident, seconds, speed = 62) {
    resident.moving = false;
    if (!resident.target) return false;
    if (!resident.path.length) {
        if (dist(resident, resident.target) < 12) return true;
        resident.repath -= seconds;
        if (resident.repath <= 0) {
            resident.path = engine._npcNav.path(resident, resident.target, resident.scene); resident.repath = 3;
        }
        return false;
    }
    const point = resident.path[0], distance = dist(resident, point);
    if (distance < 3) { resident.path.shift(); return dist(resident, resident.target) < 12; }
    const amount = Math.min(distance, speed * seconds);
    const dx = (point.x - resident.x) / distance * amount, dy = (point.y - resident.y) / distance * amount;
    resident.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    const steps = Math.max(1, Math.ceil(amount / 5));
    for (let index = 0; index < steps; index++) {
        if (!engine.isBlocked(resident.x + dx / steps, resident.y, 13, resident.scene)) { resident.x += dx / steps; resident.moving = true; }
        if (!engine.isBlocked(resident.x, resident.y + dy / steps, 13, resident.scene)) { resident.y += dy / steps; resident.moving = true; }
    }
    if (!resident.moving) { resident.path = []; resident.repath = .5; }
    return dist(resident, resident.target) < 12;
}

function enterRoom(engine, resident, id) {
    const room = interiors[id];
    if (!room) return false;
    resident.scene = id;
    resident.x = room.spawn.x; resident.y = room.spawn.y;
    resident.roomTime = 14 + resident.index * 1.5;
    const lounges = [{x:260,y:330},{x:360,y:330},{x:450,y:220},{x:360,y:100},
        {x:260,y:220},{x:450,y:100},{x:260,y:415},{x:450,y:415}];
    const point = lounges[resident.index % lounges.length];
    goal(engine, resident, engine.findSafePosition(point, 13, id), 'inside', `Inside ${byId(id)?.name || 'a trailer'}`);
    return true;
}

function arrived(engine, resident) {
    resident.path = []; resident.target = null; resident.moving = false;
    if (resident.mode === 'react') { resident.mode = 'pause'; resident.wait = 3; return; }
    if (resident.mode === 'exit') {
        const building = byId(resident.scene);
        resident.scene = 'park';
        resident.x = building.door.x; resident.y = building.door.y;
        resident.mode = 'pause'; resident.wait = 2; resident.next = 'errand';
        resident.activity = 'Stepping outside'; return;
    }
    if (resident.mode === 'inside') return;
    const destination = resident.destination;
    if (destination !== 'shitmobile' && destination && enterRoom(engine, resident, destination)) return;
    resident.mode = 'pause'; resident.wait = resident.destination === 'shitmobile' ? 12 : 3;
    resident.next = resident.destination === 'shitmobile' ? 'errand' : 'home';
    resident.activity = resident.destination === 'shitmobile' ? 'At home by the Shitmobile' : 'Taking a look around';
}

function react(engine, resident, kind, center, stepAside = true) {
    resident.reaction = phrases[kind][resident.id] || 'Easy there, bud.';
    resident.reactionTimer = 4; resident.reactionCooldown = 10;
    if (stepAside) {
        let dx = resident.x - center.x, dy = resident.y - center.y;
        if (Math.hypot(dx, dy) < 1) { dx = 1; dy = .5; }
        const length = Math.hypot(dx, dy);
        const point = engine.findSafePosition({ x: resident.x + dx / length * 85, y: resident.y + dy / length * 85 });
        goal(engine, resident, point, 'react', kind === 'fight' ? 'Giving the fight some space' : 'Stepping out of the way');
        resident.next = 'home';
    }
}

export function reactToHorn(engine) {
    if (engine.state.scene !== 'park') return;
    for (const resident of engine.residents || []) if (resident.scene === 'park' && !resident.hiddenByEncounter &&
        dist(resident, engine.state.vehicle) < 340) react(engine, resident, 'horn', engine.state.vehicle, true);
}

export function initializeNPCs(engine) {
    engine._npcNav = new Navigator(engine);
    const earlyErrands = new Set(['bubbles', 'julian', 'lahey', 'jroc', 'cory']);
    engine.residents = characters.map((character, index) => ({ ...character,
        scene: 'park', home: homes[character.id] || character.id, startX: character.x, startY: character.y,
        index, facing: 'down', moving: false, activity: 'Starting the day', mode: 'pause', next: earlyErrands.has(character.id) ? 'errand' : 'local',
        wait: .8 + index * .4, routineIndex: 0, target: null, path: [], repath: 0,
        reaction: '', reactionTimer: 0, reactionCooldown: 0, conversation: 0, hiddenByEncounter: false }));
    for (const resident of engine.residents) {
        const safe = engine.findSafePosition(resident); resident.x = safe.x; resident.y = safe.y;
    }
}

export function updateNPCs(engine, seconds) {
    if (engine.paused || !Number.isFinite(seconds) || seconds <= 0) return;
    engine.state.npcClock = (engine.state.npcClock || 0) + seconds;
    const encounter = engine.encounter;
    const fighting = encounter && ['attack', 'combat'].includes(encounter.phase);
    const car = engine.state.vehicle;
    const night = engine.state.minutes >= 20 * 60;
    for (const resident of engine.residents || []) {
        resident.reactionTimer = Math.max(0, resident.reactionTimer - seconds);
        if (!resident.reactionTimer) resident.reaction = '';
        resident.reactionCooldown = Math.max(0, resident.reactionCooldown - seconds);
        resident.hiddenByEncounter = !!encounter?.actors?.some(actor => actor.id === resident.id ||
            resident.id === 'bubbles' && actor.id === 'bubbles-rescue');
        if (resident.hiddenByEncounter) { resident.moving = false; continue; }
        if (resident.conversation > 0) {
            resident.conversation = Math.max(0, resident.conversation - seconds); resident.moving = false;
            resident.activity = resident.conversation ? 'Having a chat' : resident.activityBeforeChat || 'Getting back to it'; continue;
        }
        if (resident.scene === 'park' && !resident.reactionCooldown) {
            if (fighting && engine.state.scene === 'park' && dist(resident, engine.state.player) < 310) react(engine, resident, 'fight', engine.state.player);
            else if (car.driving && Math.abs(car.speed) > 85 && dist(resident, car) < 170) react(engine, resident, 'car', car);
            else if (car.driving && Math.abs(car.speed) < 65 && dist(resident, car) < 110) {
                resident.reaction = 'All right, bud?'; resident.reactionTimer = 3; resident.reactionCooldown = 14;
            }
        }
        if (night && resident.scene === 'park' && resident.mode !== 'home' && resident.mode !== 'react' &&
            !(resident.home === 'shitmobile' && resident.destination === 'shitmobile' && dist(resident, homePoint(engine, resident)) < 25)) headHome(engine, resident);
        if (resident.scene !== 'park' && resident.mode === 'inside') {
            moveResident(engine, resident, seconds, 48);
            resident.roomTime -= seconds;
            if (resident.roomTime <= 0 && (!night || resident.scene !== resident.home)) {
                const room = interiors[resident.scene];
                goal(engine, resident, { x: room.exit.x, y: room.exit.y - 20 }, 'exit', 'Heading outside');
            }
            continue;
        }
        if (resident.mode === 'pause') {
            resident.moving = false; resident.wait -= seconds;
            if (resident.wait > 0) continue;
            if (resident.next === 'local') {
                resident.destination = null;
                const home = homePoint(engine, resident);
                const point = engine.findSafePosition({ x: home.x + (resident.index % 2 ? -65 : 65), y: home.y + 55 });
                goal(engine, resident, point, 'local', 'Stretching their legs');
            } else if (resident.next === 'home') headHome(engine, resident);
            else goErrand(engine, resident);
        }
        if (resident.home === 'shitmobile' && resident.mode === 'home') {
            resident.homeRefresh -= seconds;
            if (resident.homeRefresh <= 0) {
                const home = homePoint(engine, resident);
                if (resident.target && dist(home, resident.target) > 100) goal(engine, resident, home, 'home', 'Walking back to the Shitmobile');
                resident.homeRefresh = 3;
            }
        }
        if (resident.target && moveResident(engine, resident, seconds, resident.mode === 'react' ? 115 : 62)) arrived(engine, resident);
    }
}
