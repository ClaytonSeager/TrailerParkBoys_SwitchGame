import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, SAVE_KEY } from '../gameEngine.js';
import { WORLD, locations } from '../story/locations.js';
import { characters } from '../story/characters.js';
import { items, pickups } from '../story/items.js';
import { quests } from '../story/quests.js';

const create = () => new GameEngine({ storage: null });
const memory = () => {
    const data = new Map();
    return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
};
const at = (game, point) => { game.state.player.x = point.x; game.state.player.y = point.y; };
const talk = (game, id) => { at(game, characters.find(character => character.id === id)); return game.interact(); };

test('movement is normalized, respects buildings and world bounds, and cannot tunnel', () => {
    const straight = create();
    const diagonal = create();
    const start = { ...straight.state.player };
    straight.move(1, 0, 0.1);
    diagonal.move(1, 1, 0.1);
    assert.ok(Math.abs(Math.hypot(straight.state.player.x - start.x, straight.state.player.y - start.y) -
        Math.hypot(diagonal.state.player.x - start.x, diagonal.state.player.y - start.y)) < 0.001);
    const building = locations[0];
    at(straight, { x: building.x - 20, y: building.y + building.h / 2 });
    straight.move(1, 0, 1, true);
    assert.ok(straight.state.player.x <= building.x - 13);
    at(straight, { x: 14, y: WORLD.height - 14 });
    straight.move(-1, 1, 1);
    assert.ok(straight.state.player.x >= 13 && straight.state.player.y <= WORLD.height - 13);
    const before = { ...straight.state.player };
    straight.move(NaN, 1, 1);
    assert.deepEqual(straight.state.player, before);
});

test('collectibles require proximity, can be collected once, and persist', () => {
    const store = memory();
    const game = new GameEngine({ storage: store });
    const pickup = pickups.find(entry => Math.hypot(entry.x - game.state.player.x, entry.y - game.state.player.y) > 100);
    assert.equal(game.collect(pickup.id), false);
    at(game, pickup);
    assert.equal(game.collect(pickup.id), true);
    assert.equal(game.collect(pickup.id), false);
    const loaded = new GameEngine({ storage: store });
    assert.equal(loaded.state.inventory[pickup.item], 1);
    assert.ok(loaded.state.collected.includes(pickup.id));
});

test('unavailable or remote jobs cannot be accepted', () => {
    const game = create();
    const locked = quests.find(quest => quest.requires.length);
    assert.ok(locked);
    assert.equal(game.acceptQuest(locked.id), false);
    const available = game.getAvailableQuests()[0];
    const giver = characters.find(character => character.id === available.giver);
    at(game, { x: giver.x > 500 ? 50 : 2000, y: 1550 });
    assert.equal(game.acceptQuest(available.id), false);
    at(game, giver);
    assert.equal(game.acceptQuest(available.id), true);
    assert.equal(game.acceptQuest(available.id), false);
});

test('every published quest is completable with real world pickups and rewards only once', () => {
    const game = create();
    const remaining = new Set(quests.map(quest => quest.id));
    let iterations = 0;
    while (remaining.size && iterations < quests.length + 1) {
        iterations += 1;
        const available = game.getAvailableQuests().filter(quest => remaining.has(quest.id));
        assert.ok(available.length, `Quest dependency deadlock: ${[...remaining]}`);
        for (const quest of available) {
            at(game, characters.find(character => character.id === quest.giver));
            assert.equal(game.acceptQuest(quest.id), true);
            let attempts = 0;
            while (game.state.activeQuests[quest.id] && attempts < 30) {
                attempts += 1;
                const { step } = game.getQuestProgress(quest.id);
                if (step.type === 'collect' || step.type === 'deliver') {
                    const itemId = step.type === 'collect' ? step.target : step.item;
                    const needed = step.count || 1;
                    for (const pickup of pickups.filter(entry => entry.item === itemId && !game.state.collected.includes(entry.id))) {
                        if ((game.state.inventory[itemId] || 0) >= needed) break;
                        at(game, pickup);
                        assert.equal(game.collect(pickup.id), true);
                    }
                    assert.ok((game.state.inventory[itemId] || 0) >= needed, `Not enough ${itemId} for ${quest.id}`);
                    if (step.type === 'deliver') talk(game, step.target);
                    else game.refreshQuests();
                } else if (step.type === 'talk') talk(game, step.target);
                else if (step.type === 'visit') {
                    const location = locations.find(entry => entry.id === step.target);
                    at(game, location.door);
                    game.visit(location.id);
                } else assert.fail(`Unknown step type ${step.type}`);
            }
            assert.ok(game.state.completedQuests.includes(quest.id), `Could not finish ${quest.id}`);
            const earned = game.state.money;
            talk(game, quest.giver);
            assert.equal(game.state.money, earned, `Duplicate reward in ${quest.id}`);
            assert.equal(game.acceptQuest(quest.id), false);
            remaining.delete(quest.id);
        }
    }
    assert.equal(remaining.size, 0);
    assert.ok(game.state.money >= 1500);
    assert.ok(game.state.ending);
    assert.ok(Object.values(game.state.inventory).every(count => count >= 0));
});

test('world data has no overlapping buildings and all interaction points are reachable', () => {
    const game = create();
    const size = 20;
    const key = (x, y) => `${x},${y}`;
    const origin = { x: Math.round(game.state.player.x / size), y: Math.round(game.state.player.y / size) };
    const queue = [origin];
    const seen = new Set([key(origin.x, origin.y)]);
    for (let index = 0; index < queue.length; index += 1) {
        const point = queue[index];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = point.x + dx, y = point.y + dy;
            const id = key(x, y);
            if (!seen.has(id) && !game.isBlocked(x * size, y * size)) { seen.add(id); queue.push({ x, y }); }
        }
    }
    assert.ok(queue.length > 1000, 'Spawn has no route out');
    const reachable = point => queue.some(cell => Math.hypot(cell.x * size - point.x, cell.y * size - point.y) < 65);
    for (const location of locations) assert.ok(reachable(location.door), `Unreachable location ${location.id}`);
    for (const character of characters) assert.ok(reachable(character), `Unreachable character ${character.id}`);
    for (const pickup of pickups) assert.ok(reachable(pickup), `Unreachable pickup ${pickup.id}`);
    for (let a = 0; a < locations.length; a += 1) for (let b = a + 1; b < locations.length; b += 1) {
        const first = locations[a], second = locations[b];
        assert.ok(!(first.x < second.x + second.w && first.x + first.w > second.x && first.y < second.y + second.h && first.y + first.h > second.y), `Overlapping buildings ${first.id}, ${second.id}`);
    }
});

test('snacks restore capped stats, are consumed once, and rest preserves missions', () => {
    const game = create();
    const [id, food] = Object.entries(items).find(([, item]) => item.effect?.energy > 0);
    game.state.inventory[id] = 1;
    assert.equal(game.useItem(id), false);
    assert.equal(game.state.inventory[id], 1);
    game.state.energy = 10;
    game.state.mentalState = 45;
    game.state.health = 90;
    assert.equal(game.useItem(id), true);
    assert.equal(game.useItem(id), false);
    assert.equal(game.state.energy, Math.min(100, 10 + food.effect.energy));
    assert.ok(game.state.health <= 100);
    const available = game.getAvailableQuests()[0];
    at(game, characters.find(character => character.id === available.giver));
    game.acceptQuest(available.id);
    game.state.minutes = 1319.95;
    game.update(0.1);
    assert.equal(game.state.day, 2);
    assert.equal(game.state.minutes, 480);
    assert.equal(game.state.mentalState, 100);
    assert.ok(game.state.activeQuests[available.id]);
});

test('corrupt, stale, and unavailable storage never crash the game', () => {
    for (const value of ['bad json', '{"version":99}', 'null']) {
        assert.doesNotThrow(() => new GameEngine({ storage: { getItem: () => value } }));
    }
    const broken = new GameEngine({ storage: { getItem() { throw new Error('disabled'); }, setItem() { throw new Error('full'); } } });
    assert.equal(broken.save(), false);
    assert.doesNotThrow(() => broken.reset());
    const storage = memory();
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, player: { x: -500, y: Infinity }, health: -200,
        mentalState: 700, money: -4, energy: 'abc', inventory: { fake: 400 }, completedQuests: ['fake'], activeQuests: { fake: { step: 1000 } } }));
    const loaded = new GameEngine({ storage });
    assert.equal(loaded.state.health, 0);
    assert.equal(loaded.state.mentalState, 100);
    assert.equal(loaded.state.money, 0);
    assert.equal(loaded.state.energy, 100);
    assert.deepEqual(loaded.state.completedQuests, []);
    assert.deepEqual(loaded.state.inventory, {});
    assert.ok(loaded.state.player.x >= 13 && Number.isFinite(loaded.state.player.y));
    assert.equal(create().save(), false, 'Disabled storage cannot report a successful save');
    const working = new GameEngine({ storage: memory() });
    assert.equal(working.save(), true, 'A real storage write reports success');
});

test('odd jobs require Cory or the garage, spend needs, and allow recovery of campaign cash', () => {
    const game = create();
    assert.equal(game.work(), false);
    assert.equal(game.state.money, 80);
    at(game, characters.find(character => character.id === 'cory'));
    assert.equal(game.work(), true);
    assert.equal(game.state.money, 115);
    assert.equal(game.state.energy, 85);
    assert.equal(game.state.mentalState, 96);
    assert.equal(game.state.health, 98);
    assert.equal(game.state.minutes, 525);
    game.state.energy = 14;
    assert.equal(game.work(), false);
    assert.equal(game.state.money, 115);
    game.state.completedQuests = quests.slice(0, 6).map(quest => quest.id);
    game.state.money = 1490;
    game.rest();
    at(game, locations.find(location => location.id === 'garage').door);
    assert.equal(game.work(), true);
    assert.ok(game.state.ending);
    assert.equal(game.state.money, 1525);
    assert.equal(game.state.completedQuests.length, 6);
    game.state.health = 1;
    game.state.mentalState = 1;
    assert.equal(game.work(), true);
    assert.equal(game.state.health, 1);
    assert.equal(game.state.mentalState, 0);
});

test('walking, sprinting, and time gently use needs without passive death', () => {
    const walking = create();
    const running = create();
    walking.move(1, 0, 0.25);
    running.move(1, 0, 0.25, true);
    assert.ok(walking.state.mentalState < 100);
    assert.ok(running.state.mentalState < walking.state.mentalState);
    const game = create();
    game.state.minutes = 600;
    game.state.health = 15.001;
    game.state.mentalState = 10.001;
    game.update(0.25);
    game.move(1, 0, 0.25, true);
    assert.equal(game.state.health, 15);
    assert.equal(game.state.mentalState, 10);
    game.rest();
    assert.equal(game.state.health, 100);
    assert.equal(game.state.mentalState, 100);
    at(game, locations.find(location => location.id === 'garage').door);
    assert.equal(game.buyItem('burger'), false, 'Repair shop does not sell burgers');
    at(game, characters.find(character => character.id === 'randy'));
    assert.equal(game.buyItem('burger'), true);
    const randy = characters.find(character => character.id === 'randy');
    at(game, { x: randy.x, y: randy.y + 80 });
    assert.equal(game.nearestInteractable().entity.id, 'randy');
    assert.equal(game.buyItem('burger'), true, 'Randy can sell food throughout his interaction range');
});
