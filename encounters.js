import * as world from './story/locations.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const direction = facing => ({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[facing] || [0, 1]);
const TYPES = ['bottlekids', 'lahey', 'cyrus', 'carts', 'kitty'];
const aliases = { kids: 'bottlekids', patrol: 'lahey', stampede: 'carts', bubbles: 'kitty' };
const roll = engine => clamp(Number(engine._encounters.random()) || 0, 0, .999999999);
const outdoors = engine => (!engine.state.scene || engine.state.scene === 'park') &&
    !engine.state.vehicle?.driving && !engine.state.inVehicle && !engine.paused;
const emit = (engine, type, text) => engine.emit?.(type, text);
const save = engine => engine.save?.();

function open(engine, x, y, radius = 15) {
    return x >= radius && y >= radius && x <= world.WORLD.width - radius && y <= world.WORLD.height - radius &&
        !engine.isBlocked(x, y, radius, 'park');
}

function safePoint(engine, center, angle = 0, range = 180) {
    for (let ring = 0; ring < 6; ring++) {
        const radius = Math.max(35, range - ring * 35);
        for (let attempt = 0; attempt < 24; attempt++) {
            const a = angle + attempt * Math.PI / 12;
            const point = { x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius };
            if (open(engine, point.x, point.y)) return point;
        }
    }
    return { x: center.x, y: center.y };
}

function clearLine(engine, a, b) {
    const steps = Math.max(1, Math.ceil(dist(a, b) / 15));
    for (let i = 1; i <= steps; i++) if (!open(engine, a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false;
    return true;
}

// A small cached A* route is enough to get residents around a trailer instead of
// sliding against its wall forever. Only active encounter actors use this grid.
function routeAround(engine, start, goal) {
    const size = 40, columns = Math.ceil(world.WORLD.width / size) + 1;
    const cells = new Map();
    const key = (x, y) => y * columns + x;
    const free = (x, y) => {
        if (x <= 0 || y <= 0 || x >= columns - 1 || y >= Math.ceil(world.WORLD.height / size)) return false;
        const id = key(x, y);
        if (!cells.has(id)) cells.set(id, open(engine, x * size, y * size));
        return cells.get(id);
    };
    const nearest = point => {
        const gx = Math.round(point.x / size), gy = Math.round(point.y / size);
        const choices = [];
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
            const x = gx + dx, y = gy + dy, p = { x: x * size, y: y * size };
            if (free(x, y)) choices.push({ x, y, point: p, distance: dist(point, p) });
        }
        return choices.sort((a, b) => a.distance - b.distance).find(c => clearLine(engine, point, c.point));
    };
    const from = nearest(start), to = nearest(goal);
    if (!from || !to) return [];
    const frontier = [], scores = new Map(), parents = new Map(), nodes = new Map();
    const add = node => {
        frontier.push(node);
        for (let i = frontier.length - 1; i > 0;) {
            const parent = (i - 1) >> 1;
            if (frontier[parent].f <= frontier[i].f) break;
            [frontier[parent], frontier[i]] = [frontier[i], frontier[parent]]; i = parent;
        }
    };
    const take = () => {
        const result = frontier[0], tail = frontier.pop();
        if (frontier.length) {
            frontier[0] = tail;
            for (let i = 0;;) {
                const left = i * 2 + 1, right = left + 1;
                let smallest = i;
                if (left < frontier.length && frontier[left].f < frontier[smallest].f) smallest = left;
                if (right < frontier.length && frontier[right].f < frontier[smallest].f) smallest = right;
                if (smallest === i) break;
                [frontier[i], frontier[smallest]] = [frontier[smallest], frontier[i]]; i = smallest;
            }
        }
        return result;
    };
    const startKey = key(from.x, from.y), goalKey = key(to.x, to.y);
    scores.set(startKey, 0); nodes.set(startKey, from);
    add({ ...from, id: startKey, g: 0, f: Math.hypot(from.x - to.x, from.y - to.y) });
    let visits = 0;
    while (frontier.length && visits++ < 2200) {
        const current = take();
        if (current.g !== scores.get(current.id)) continue;
        if (current.id === goalKey) {
            const result = [{ x: goal.x, y: goal.y }];
            for (let id = goalKey; id !== undefined; id = parents.get(id)) {
                const n = nodes.get(id); result.push({ x: n.x * size, y: n.y * size });
            }
            return result.reverse();
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const x = current.x + dx, y = current.y + dy, id = key(x, y);
            if (!free(x, y) || (dx && dy && (!free(current.x + dx, current.y) || !free(current.x, current.y + dy)))) continue;
            if (!clearLine(engine, { x: current.x * size, y: current.y * size }, { x: x * size, y: y * size })) continue;
            const g = current.g + (dx && dy ? Math.SQRT2 : 1);
            if (g >= (scores.get(id) ?? Infinity)) continue;
            scores.set(id, g); parents.set(id, current.id); nodes.set(id, { x, y });
            add({ id, x, y, g, f: g + Math.hypot(x - to.x, y - to.y) });
        }
    }
    return [];
}

function walk(engine, actor, target, speed, dt) {
    const distance = dist(actor, target);
    if (distance < 1) return;
    actor._navTime = (actor._navTime || 0) - dt;
    if (distance > 70 && (actor._navTime <= 0 || !actor._navGoal || dist(actor._navGoal, target) > 72)) {
        actor._navTime = .85;
        actor._navGoal = { x: target.x, y: target.y };
        actor._path = clearLine(engine, actor, target) ? [] : routeAround(engine, actor, target);
    }
    while (actor._path?.length && dist(actor, actor._path[0]) < 9) actor._path.shift();
    const waypoint = distance > 70 && actor._path?.[0] || target, remaining = dist(actor, waypoint);
    if (remaining < 1) return;
    const amount = Math.min(remaining, speed * dt);
    const vx = (waypoint.x - actor.x) / remaining * amount;
    const vy = (waypoint.y - actor.y) / remaining * amount;
    actor.facing = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
    actor.angle = Math.atan2(vy, vx);
    if (open(engine, actor.x + vx, actor.y)) actor.x += vx;
    if (open(engine, actor.x, actor.y + vy)) actor.y += vy;
}

function actor(engine, id, name, kind, center, angle, range, extra = {}) {
    return { id, name, kind, ...safePoint(engine, center, angle, range), facing: 'down',
        color: '#d9ad89', hair: '#5e4733', shirt: '#879b78', state: 'approach', health: 1, maxHealth: 1, ...extra };
}

function effect(encounter, kind, x, y, radius = 28, life = .35) {
    encounter.effects.push({ kind, x, y, radius, life, maxLife: life });
}

function xp(engine, amount) {
    if (typeof engine.gainXP === 'function') engine.gainXP(amount);
    else {
        engine.state.xp = (engine.state.xp || 0) + amount;
        engine.state.level = 1 + Math.floor(engine.state.xp / 100);
    }
}

function reward(engine, encounter, { experience = 0, money = 0, reputation = 0, win = false } = {}) {
    if (encounter.rewarded) return;
    encounter.rewarded = true;
    engine.state.money = Math.max(0, engine.state.money || 0) + money;
    engine.state.reputation = (engine.state.reputation || 0) + reputation;
    if (win) engine.state.wins = (engine.state.wins || 0) + 1;
    if (experience) xp(engine, experience);
    engine.checkEnding?.();
    save(engine);
}

function depart(engine, text, rewards) {
    const e = engine.encounter;
    if (!e || e.phase === 'depart') return;
    if (rewards) reward(engine, e, rewards);
    e.phase = 'depart'; e.departTime = 3; e.text = text; e.choices = []; e.projectiles = [];
    for (const a of e.actors) { a.state = 'flee'; a.windup = 0; }
    emit(engine, rewards ? 'reward' : 'info', text);
}

function hitPlayer(engine, health, mental, source) {
    const e = engine.encounter;
    if (!e || e.invulnerable > 0 || e.dodgeTime > 0) return false;
    const blocking = e.blockTime > 0;
    const actualHealth = blocking ? Math.max(1, Math.round(health * .25)) : health;
    const actualMental = blocking ? 0 : mental;
    e.invulnerable = .85;
    effect(e, blocking ? 'block' : 'hit', engine.state.player.x, engine.state.player.y, 26, .28);
    if (typeof engine.damage === 'function') engine.damage(actualHealth, actualMental, source);
    else {
        engine.state.health = Math.max(0, engine.state.health - actualHealth);
        engine.state.mentalState = Math.max(0, engine.state.mentalState - actualMental);
        if (!engine.state.health) {
            engine.state.health = 50; engine.state.energy = 35;
            engine.state.money = Math.max(0, engine.state.money - 15);
            engine.encounter = null;
            emit(engine, 'warning', 'You took a breather. A bruised ego beats a hospital bill.');
        }
    }
    return true;
}

function closestRoad(engine) {
    const player = engine.state.player;
    const fallback = world.PATROL_ROUTE || (world.roads || []).flatMap(r => [
        { x: r.x + 25, y: r.y + r.h / 2 }, { x: r.x + r.w - 25, y: r.y + r.h / 2 }
    ]);
    const routes = world.roadPaths?.length ? world.roadPaths.map(path => path.points) : [fallback];
    let nearest = null;
    for (const route of routes) {
    for (let index = 1; index < route.length; index++) {
        const a = route[index - 1], b = route[index];
        const vx = b.x - a.x, vy = b.y - a.y, length = Math.hypot(vx, vy);
        if (!length) continue;
        const t = clamp(((player.x - a.x) * vx + (player.y - a.y) * vy) / (length * length), .08, .92);
        const stop = { x: a.x + vx * t, y: a.y + vy * t };
        const startT = Math.max(0, t - 270 / length);
        const start = { x: a.x + vx * startT, y: a.y + vy * startT };
        if (!open(engine, stop.x, stop.y, 30) || !open(engine, start.x, start.y, 30)) continue;
        if (!nearest || dist(stop, player) < nearest.distance) nearest = { stop, start, distance: dist(stop, player) };
    }
    }
    return nearest || { stop: safePoint(engine, player, 0, 180), start: safePoint(engine, player, Math.PI, 260) };
}

/** Encounter state is deliberately runtime-only: a reloaded save never resumes an ambush. */
export function initializeEncounters(engine, random = Math.random) {
    engine.encounter = null;
    engine._encounters = { random: typeof random === 'function' ? random : Math.random, cooldown: 20, count: 0, deck: [], lastType: null };
    engine._encounters.cooldown = 20 + roll(engine) * 15;
}

export function startEncounter(engine, type, { force = false } = {}) {
    if (!engine._encounters) initializeEncounters(engine);
    type = aliases[type] || type;
    if (!TYPES.includes(type) || engine.encounter || !outdoors(engine)) return false;
    if (!force && engine._encounters.cooldown > 0) return false;
    const e = { type, phase: 'approach', age: 0, phaseAge: 0, actors: [], projectiles: [], effects: [],
        title: '', text: '', choices: [], origin: { ...engine.state.player }, rewarded: false,
        invulnerable: 0, punchCooldown: 0, dodgeTime: 0, blockTime: 0 };
    engine.encounter = e;
    engine._encounters.count++;
    // Also protects a player who is knocked out before the normal departure.
    engine._encounters.cooldown = 45 + roll(engine) * 25;
    const player = engine.state.player;
    const angle = roll(engine) * Math.PI * 2;
    if (type === 'bottlekids') {
        e.title = 'The bottle kids!';
        e.text = 'Four kids. Too many bottles. Keep moving, dodge the throws, or scare them off with a punch.';
        e.actors = [0, 1, 2, 3].map(index => actor(engine, `kid-${index + 1}`, `Bottle kid ${index + 1}`, 'kid', player,
            angle + index * Math.PI / 2, 235 + index * 18,
            { enemy: true, health: 12, maxHealth: 12, shirt: ['#b86a48', '#6c88a7', '#bb9c4e', '#899761'][index], throwCooldown: .8 + index * .45 }));
    } else if (type === 'lahey') {
        e.title = 'A friendly park inspection';
        e.text = 'Lahey’s patrol car is pulling over. This seems entirely routine.';
        const road = closestRoad(engine);
        e.carStop = road.stop;
        e.actors = [{ id: 'patrol-car', name: 'Park patrol', kind: 'car', ...road.start,
            angle: Math.atan2(road.stop.y - road.start.y, road.stop.x - road.start.x), color: '#56664b', state: 'driving', health: 1, maxHealth: 1 }];
    } else if (type === 'cyrus') {
        e.title = 'Cyrus has a business proposition';
        e.text = 'Cyrus is heading your way. His negotiating technique appears to be scowling.';
        e.actors = [actor(engine, 'cyrus', 'Cyrus', 'cyrus', player, angle, 260,
            { health: 70, maxHealth: 70, shirt: '#b9463e', hair: '#362c27', attackCooldown: 1.3 })];
    } else if (type === 'carts') {
        e.title = 'Runaway shopping carts!';
        e.text = 'Someone forgot the brakes. Step out of the way of the cart stampede!';
        e.phase = 'attack';
        e.actors = [0, 1, 2].map(index => {
            const a = actor(engine, `cart-${index}`, 'Runaway cart', 'cart', player, angle + (index - 1) * .26, 300 + index * 65,
                { health: 1, maxHealth: 1 });
            const d = Math.max(1, dist(a, player));
            a.vx = (player.x - a.x) / d * 225; a.vy = (player.y - a.y) / d * 225;
            a.angle = Math.atan2(a.vy, a.vx); a.state = 'rolling'; return a;
        });
    } else {
        e.title = 'A tiny neighbourhood emergency';
        e.text = 'Bubbles is trying to coax a nervous kitty out of a hedge. He could use a spare pair of hands.';
        e.actors = [actor(engine, 'bubbles-rescue', 'Bubbles', 'bubbles', player, angle, 170,
            { shirt: '#7994a5', hair: '#b68d54' }), actor(engine, 'rescue-kitty', 'A nervous kitty', 'kitty', player, angle + .45, 210)];
    }
    emit(engine, 'encounter', e.text);
    return true;
}

function choice(engine, choices, text) {
    const e = engine.encounter;
    e.phase = 'choice'; e.phaseAge = 0; e.text = text; e.choices = choices;
    emit(engine, 'encounter', text);
}

function beginFight(engine, target, text) {
    const e = engine.encounter;
    e.phase = 'combat'; e.phaseAge = 0; e.text = text; e.choices = [];
    target.enemy = true; target.attackCooldown = 1.1; target.state = 'approach';
    emit(engine, 'warning', text);
}

export function chooseEncounter(engine, choiceId) {
    const e = engine.encounter;
    if (!e || e.phase !== 'choice' || !e.choices.some(c => c.id === choiceId)) return false;
    if (e.type === 'lahey') {
        if (choiceId === 'calm') depart(engine, 'You explain the fundraiser. Lahey makes a note. Randy asks about the catering.', { experience: 15, reputation: 2 });
        if (choiceId === 'insult') beginFight(engine, e.actors.find(a => a.id === 'randy'), 'Randy is coming over. F / punch · Q / block · Space / dodge. You can also run away.');
    } else if (e.type === 'cyrus') {
        if (choiceId === 'pay') {
            if (engine.state.money < 25) { emit(engine, 'warning', 'You do not have $25. Stand your ground, or walk away.'); return false; }
            engine.state.money -= 25;
            depart(engine, 'Cyrus takes the $25 and decides he has urgent business somewhere else.', { experience: 8 });
        } else beginFight(engine, e.actors[0], 'Cyrus squares up. Keep your distance, watch his wind-up, and fight back.');
    } else if (e.type === 'kitty') {
        if (choiceId === 'help') {
            if (engine.state.energy < 8) { emit(engine, 'warning', 'You need 8 energy to help. Rest or grab a snack first.'); return false; }
            engine.state.energy -= 8;
            engine.state.mentalState = Math.min(100, engine.state.mentalState + 14);
            depart(engine, 'One rescued kitty. Bubbles is delighted. Somehow your whole day feels a little better.', { experience: 25, money: 10, reputation: 3 });
        } else depart(engine, 'Bubbles keeps talking softly to the kitty. He has the patience for this.');
    }
    save(engine);
    return true;
}

export function combatAction(engine, action) {
    const e = engine.encounter;
    if (!e || !outdoors(engine) || !['approach', 'attack', 'combat'].includes(e.phase)) return false;
    const player = engine.state.player;
    if (action === 'block') {
        if (e.blockTime > .2 || engine.state.energy < 2) return false;
        engine.state.energy -= 2; e.blockTime = .85;
        effect(e, 'block', player.x, player.y, 28, .85); return true;
    }
    if (action === 'dodge') {
        if (e.dodgeTime > 0 || engine.state.energy < 8) return false;
        engine.state.energy -= 8; e.dodgeTime = .45;
        const [dx, dy] = direction(player.facing);
        for (let step = 0; step < 12; step++) {
            const x = player.x + dx * 5, y = player.y + dy * 5;
            if (!open(engine, x, y)) break;
            player.x = x; player.y = y;
        }
        effect(e, 'dodge', player.x, player.y, 32, .35); return true;
    }
    if (action !== 'punch' || e.punchCooldown > 0 || engine.state.energy < 4) return false;
    if (!['bottlekids', 'cyrus', 'lahey'].includes(e.type) || (e.type !== 'bottlekids' && e.phase !== 'combat')) return false;
    e.punchCooldown = .42; engine.state.energy -= 4;
    const [dx, dy] = direction(player.facing);
    effect(e, 'punch', player.x + dx * 28, player.y + dy * 28, 42, .2);
    const target = e.actors.filter(a => a.enemy && a.health > 0 && dist(a, player) <= 78 && clearLine(engine, player, a) &&
        (dx * (a.x - player.x) + dy * (a.y - player.y)) / Math.max(1, dist(a, player)) >= -.15)
        .sort((a, b) => dist(a, player) - dist(b, player))[0];
    if (target) {
        target.health = Math.max(0, target.health - (12 + Math.min(8, Math.max(0, (engine.state.level || 1) - 1) * 2)));
        effect(e, 'hit', target.x, target.y, 24, .25);
        target.windup = 0; target.attackCooldown = Math.max(.6, target.attackCooldown || 0);
        if (!target.health) target.state = 'flee';
        const away = Math.atan2(target.y - player.y, target.x - player.x);
        walk(engine, target, { x: target.x + Math.cos(away) * 18, y: target.y + Math.sin(away) * 18 }, 120, .15);
        if (!e.actors.some(a => a.enemy && a.health > 0)) {
            depart(engine, e.type === 'bottlekids' ? 'The bottle kids scatter. You have survived another perfectly normal afternoon.' : `${target.name} backs off. That is quite enough neighbourhood diplomacy.`,
                { experience: e.type === 'cyrus' ? 65 : e.type === 'bottlekids' ? 35 : 45, money: e.type === 'cyrus' ? 45 : e.type === 'bottlekids' ? 8 : 30, reputation: 2, win: true });
        }
    }
    return true;
}

function updateKids(engine, e, dt) {
    if (e.phase === 'approach') { e.phase = 'attack'; e.phaseAge = 0; }
    const player = engine.state.player;
    for (const a of e.actors) {
        if (a.health <= 0) {
            walk(engine, a, { x: a.x + (a.x - player.x), y: a.y + (a.y - player.y) }, 145, dt); continue;
        }
        if (dist(a, player) > 155) walk(engine, a, player, 90, dt);
        if (a.windup > 0) {
            a.windup -= dt;
            if (a.windup <= 0) {
                const distance = Math.max(1, dist(a, a.aim));
                e.projectiles.push({ x: a.x, y: a.y - 8, vx: (a.aim.x - a.x) / distance * 240,
                    vy: (a.aim.y - a.y) / distance * 240, radius: 7, life: 2.2, kind: 'bottle', rotation: e.age * 7 });
                a.state = 'attack'; a.throwCooldown = 2.4 + roll(engine) * .8;
            }
        } else {
            a.throwCooldown -= dt;
            if (a.throwCooldown <= 0 && dist(a, player) < 370) {
                a.aim = { x: player.x, y: player.y }; a.windup = .65; a.state = 'windup'; a.telegraphUntil = e.age + .65;
                effect(e, 'telegraph', player.x, player.y, 26, .65);
            }
        }
    }
    if (e.phaseAge >= 18) depart(engine, 'The bottle kids run out of bottles and scatter. Great work keeping your head down.', { experience: 20 });
    else if (dist(player, e.origin) > 700) depart(engine, 'You leave the bottle kids behind. Sometimes the best move is leaving.');
}

function updateMelee(engine, e, dt) {
    const player = engine.state.player;
    for (const a of e.actors.filter(a => a.enemy && a.health > 0)) {
        if (a.windup > 0) {
            a.windup -= dt;
            if (a.windup <= 0) {
                a.state = 'attack';
                if (dist(a, player) < 79 && clearLine(engine, a, player)) hitPlayer(engine, a.id === 'cyrus' ? 11 : 8, a.id === 'cyrus' ? 6 : 4, `${a.name}'s shove`);
                a.attackCooldown = 1.6;
            }
        } else {
            a.attackCooldown -= dt;
            if (dist(a, player) > 51) walk(engine, a, player, a.id === 'cyrus' ? 103 : 88, dt);
            if (a.attackCooldown <= 0 && dist(a, player) <= 82 && clearLine(engine, a, player)) {
                a.windup = .65; a.state = 'windup'; a.telegraphUntil = e.age + .65;
                effect(e, 'telegraph', a.x, a.y, 72, .65);
            }
        }
    }
    if (engine.encounter === e && (dist(player, e.origin) > 650 || e.phaseAge > 60)) depart(engine, 'You put some distance between yourself and the argument. Everyone gets to cool off.');
}

function updateApproach(engine, e, dt) {
    const player = engine.state.player;
    if (e.type === 'lahey') {
        const car = e.actors[0];
        if (car.state === 'driving') {
            walk(engine, car, e.carStop, 175, dt);
            if (dist(car, e.carStop) < 12) {
                car.state = 'parked';
                e.actors.push(actor(engine, 'lahey', 'Mr. Lahey', 'lahey', car, Math.PI / 2, 45,
                    { shirt: '#aab89b', hair: '#aaa49a' }), actor(engine, 'randy', 'Randy', 'randy', car, Math.PI / 2 + .8, 60,
                    { health: 50, maxHealth: 50, shirt: '#d9a784', hair: '#66513d' }));
            }
        } else {
            for (const a of e.actors.slice(1)) if (dist(a, player) > 100) walk(engine, a, player, 95, dt);
            if (e.actors.slice(1).some(a => a.id === 'lahey' && dist(a, player) <= 115 && clearLine(engine, a, player))) {
                choice(engine, [{ id: 'calm', text: 'Show some respect', description: 'Explain the fundraiser and keep things friendly.' },
                    { id: 'insult', text: 'Frig off, Randy!', description: 'Randy takes it personally. Expect a scrap.' }],
                'Lahey steps out of the patrol car. “What exactly is going on here?” Randy folds his arms.');
            }
        }
    } else if (e.type === 'cyrus') {
        const a = e.actors[0]; if (dist(a, player) > 100) walk(engine, a, player, 115, dt);
        if (dist(a, player) <= 115 && clearLine(engine, a, player)) choice(engine,
            [{ id: 'pay', text: 'Pay him $25', description: 'An irritating but peaceful solution.', disabled: engine.state.money < 25 },
                { id: 'fight', text: 'Stand your ground', description: 'Settle the argument with a very small fight.' }],
            '“Twenty-five bucks for parking here,” says Cyrus. You are fairly sure he does not work here.');
    } else if (e.type === 'kitty') {
        if (e.phaseAge > 1.2) choice(engine, [{ id: 'help', text: 'Help Bubbles rescue the kitty', description: '8 energy · +25 XP · +14 mental state · $10', disabled: engine.state.energy < 8 },
            { id: 'leave', text: 'Let Bubbles handle it', description: 'No pressure. He has done this before.' }],
            '“There you are, little buddy. Could you hold this blanket while I reach under the hedge?”');
    }
}

/** Called by the engine while gameplay is active. All attack cues use simulation seconds. */
export function updateEncounters(engine, dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    if (!engine._encounters) initializeEncounters(engine);
    if (!outdoors(engine)) return;
    const seconds = Math.min(dt, .25);
    let e = engine.encounter;
    if (!e) {
        engine._encounters.cooldown -= seconds;
        if (engine._encounters.cooldown <= 0) {
            const schedule = engine._encounters;
            if (!schedule.deck.length) {
                schedule.deck = [...TYPES];
                for (let index = schedule.deck.length - 1; index > 0; index--) {
                    const other = Math.floor(roll(engine) * (index + 1));
                    [schedule.deck[index], schedule.deck[other]] = [schedule.deck[other], schedule.deck[index]];
                }
                // Keep a fresh bag from repeating the event that just finished.
                if (schedule.deck.at(-1) === schedule.lastType) [schedule.deck[0], schedule.deck[4]] = [schedule.deck[4], schedule.deck[0]];
            }
            const type = schedule.deck.pop();
            if (startEncounter(engine, type)) schedule.lastType = type;
        }
        return;
    }
    e.age += seconds; e.phaseAge += seconds;
    for (const timer of ['invulnerable', 'punchCooldown', 'dodgeTime', 'blockTime']) e[timer] = Math.max(0, e[timer] - seconds);
    for (const fx of e.effects) fx.life -= seconds;
    e.effects = e.effects.filter(fx => fx.life > 0);
    if (e.phase === 'depart') {
        e.departTime -= seconds;
        for (const a of e.actors) walk(engine, a, { x: a.x + (a.x - engine.state.player.x || 1), y: a.y + (a.y - engine.state.player.y || 1) }, a.kind === 'car' ? 180 : 125, seconds);
        if (e.departTime <= 0) {
            engine.encounter = null;
            engine._encounters.cooldown = 45 + roll(engine) * 25;
        }
        return;
    }
    if (e.phase === 'choice') {
        if (dist(engine.state.player, e.origin) > 600) depart(engine, 'You carry on down the lane. The conversation can wait.');
        return;
    }
    if (e.type === 'bottlekids') updateKids(engine, e, seconds);
    else if (e.phase === 'approach') updateApproach(engine, e, seconds);
    else if (e.phase === 'combat') updateMelee(engine, e, seconds);
    else if (e.type === 'carts') {
        for (const a of e.actors) {
            if (a.state !== 'rolling') continue;
            const target = { x: a.x + a.vx * seconds, y: a.y + a.vy * seconds };
            if (!open(engine, target.x, target.y, 20)) a.state = 'stopped';
            else { a.x = target.x; a.y = target.y; }
            if (dist(a, engine.state.player) < 29) hitPlayer(engine, 6, 3, 'A runaway shopping cart');
        }
        if (engine.encounter === e && e.phaseAge > 7) depart(engine, 'The carts roll to a stop. Bubbles calls that a delivery service.', { experience: 25 });
    }
    if (engine.encounter !== e || e.phase === 'depart') return;
    for (const projectile of e.projectiles) {
        projectile.life -= seconds;
        const steps = Math.max(1, Math.ceil(Math.hypot(projectile.vx, projectile.vy) * seconds / 10));
        for (let step = 0; step < steps && projectile.life > 0; step++) {
            projectile.x += projectile.vx * seconds / steps; projectile.y += projectile.vy * seconds / steps;
            projectile.rotation = (projectile.rotation || 0) + seconds * 9 / steps;
            if (!open(engine, projectile.x, projectile.y, 5)) { projectile.life = 0; effect(e, 'glass', projectile.x, projectile.y, 16, .3); }
            else if (dist(projectile, engine.state.player) < projectile.radius + 13) {
                hitPlayer(engine, 4, 2, 'The bottle kids'); projectile.life = 0;
                effect(e, 'glass', projectile.x, projectile.y, 16, .3);
            }
        }
        if (engine.encounter !== e) return;
    }
    e.projectiles = e.projectiles.filter(p => p.life > 0);
}
