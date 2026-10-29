import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, SAVE_KEY } from '../gameEngine.js';
import { updateNPCs } from '../npcSimulation.js';
import { locations } from '../story/locations.js';
import { interiors } from '../story/interiors.js';
import { pickups } from '../story/items.js';
import { quests } from '../story/quests.js';

const create = () => {
    const engine = new GameEngine({ storage: null, random: () => .99 });
    engine._encounters.cooldown = 1e9;
    return engine;
};
const at = (engine, point, scene = 'park') => {
    engine.state.scene = scene;
    engine.state.player = { x: point.x, y: point.y, facing: 'down' };
};
const tick = (engine, seconds) => { for (let index = 0; index < seconds * 10; index++) engine.update(.1); };
const npcTick = (engine, seconds) => { for (let index = 0; index < seconds * 10; index++) updateNPCs(engine, .1); };
const talk = (engine, id) => {
    const resident = engine.findResident(id);
    at(engine, resident, resident.scene);
    return engine.interact();
};

test('residents visibly walk, navigate buildings, enter through doors, and later come back outside', () => {
    const engine = create();
    const original = new Map(engine.residents.map(resident => [resident.id, { ...resident }]));
    const entered = new Set(), exited = new Set(), moved = new Set();
    for (let index = 0; index < 900; index++) {
        const before = new Map(engine.residents.map(resident => [resident.id, { ...resident }]));
        engine.update(.1);
        for (const resident of engine.residents) {
            const previous = before.get(resident.id);
            assert.equal(engine.isBlocked(resident.x, resident.y, 13, resident.scene), false, `${resident.id} clipped geometry`);
            if (resident.scene === previous.scene) {
                assert.ok(Math.hypot(resident.x - previous.x, resident.y - previous.y) <= 12, `${resident.id} teleported`);
            } else if (resident.scene !== 'park') {
                const door = locations.find(location => location.id === resident.scene).door;
                assert.ok(Math.hypot(previous.x - door.x, previous.y - door.y) < 25);
                entered.add(resident.id);
            } else {
                const exit = interiors[previous.scene].exit;
                assert.ok(Math.hypot(previous.x - exit.x, previous.y - exit.y) < 40);
                exited.add(resident.id);
            }
            const initial = original.get(resident.id);
            if (index < 100 && Math.hypot(resident.x - initial.x, resident.y - initial.y) > 20) moved.add(resident.id);
        }
    }
    assert.ok(moved.size >= 6, 'The park comes alive within ten seconds');
    assert.ok(entered.size >= 6 && exited.size >= 6, 'Residents actually use their homes');
    assert.equal(engine.getCharacters().every(resident => resident.scene === engine.state.scene), true);
});

test('the opening stays lively with several residents walking outdoors throughout the first twelve seconds', () => {
    const engine = create();
    for (let index = 0; index < 120; index++) {
        engine.update(.1);
        if (index >= 49) assert.ok(engine.residents.filter(resident => resident.scene === 'park' && resident.moving).length >= 3,
            `The park emptied out at ${(index + 1) / 10} seconds`);
    }
    engine.state.vehicle.driving = true;
    engine.state.vehicle.speed = 20;
    at(engine, engine.state.vehicle);
    const day = engine.state.day;
    assert.equal(engine.restInCar(), false);
    assert.equal(engine.state.day, day);
    assert.ok(engine.events.some(event => event.type === 'warning' && event.text.includes('Park')));
});

test('conversation pauses a moving resident and quests can be accepted and turned in inside their home', () => {
    const engine = create();
    const bubbles = engine.findResident('bubbles');
    engine.state.minutes = 20 * 60;
    for (let index = 0; index < 300 && bubbles.scene === 'park'; index++) engine.update(.1);
    assert.equal(bubbles.scene, 'bubbles');
    engine.state.minutes = 480;
    const home = locations.find(location => location.id === bubbles.scene);
    at(engine, home.door);
    assert.equal(engine.enterBuilding(home.id), true);
    const dialogue = talk(engine, 'bubbles');
    assert.equal(dialogue.character.id, 'bubbles');
    const quest = dialogue.availableQuests[0];
    assert.ok(quest);
    assert.equal(engine.acceptQuest(quest.id), true);
    const before = { x: bubbles.x, y: bubbles.y, scene: bubbles.scene };
    tick(engine, 3);
    assert.deepEqual({ x: bubbles.x, y: bubbles.y, scene: bubbles.scene }, before);
    engine.paused = true;
    const clock = engine.state.npcClock;
    tick(engine, 3);
    assert.equal(engine.state.npcClock, clock);
    engine.paused = false;
    let attempts = 0;
    while (engine.state.activeQuests[quest.id] && attempts++ < 15) {
        const step = engine.getQuestProgress(quest.id).step;
        if (step.type === 'collect' || step.type === 'deliver') {
            const item = step.type === 'collect' ? step.target : step.item;
            for (const pickup of pickups.filter(pickup => pickup.item === item && !engine.state.collected.includes(pickup.id))) {
                if ((engine.state.inventory[item] || 0) >= (step.count || 1)) break;
                at(engine, pickup); engine.collect(pickup.id);
            }
            if (step.type === 'deliver') assert.equal(talk(engine, step.target).character.id, step.target);
        } else if (step.type === 'talk') talk(engine, step.target);
        else if (step.type === 'visit') {
            const location = locations.find(location => location.id === step.target);
            at(engine, location.door); engine.visit(location.id);
        }
        tick(engine, .3);
    }
    assert.ok(engine.state.completedQuests.includes(quest.id));
    assert.equal(engine.getResidentStatus('bubbles').indoors, true);
    assert.equal(engine.getCharacterStatus('bubbles').locationId, 'bubbles');
});

test('every mission remains completable while its giver moves between outdoor routes and interiors', () => {
    const engine = create();
    tick(engine, 35);
    const remaining = new Set(quests.map(quest => quest.id));
    let passes = 0;
    while (remaining.size && passes++ < quests.length + 1) {
        const available = engine.getAvailableQuests().filter(quest => remaining.has(quest.id));
        assert.ok(available.length, 'Quest dependencies must not deadlock');
        for (const quest of available) {
            const giver = engine.findResident(quest.giver);
            const wrongScene = giver.scene === 'park' ? 'julian' : 'park';
            at(engine, giver, wrongScene);
            assert.equal(engine.acceptQuest(quest.id), false, 'A nearby local coordinate in another scene is not the giver');
            talk(engine, giver.id);
            assert.equal(engine.acceptQuest(quest.id), true);
            let attempts = 0;
            while (engine.state.activeQuests[quest.id] && attempts++ < 30) {
                const step = engine.getQuestProgress(quest.id).step;
                if (step.type === 'collect' || step.type === 'deliver') {
                    const item = step.type === 'collect' ? step.target : step.item;
                    for (const pickup of pickups.filter(pickup => pickup.item === item && !engine.state.collected.includes(pickup.id))) {
                        if ((engine.state.inventory[item] || 0) >= (step.count || 1)) break;
                        at(engine, pickup); engine.collect(pickup.id);
                    }
                    assert.ok((engine.state.inventory[item] || 0) >= (step.count || 1), `Missing ${item} for ${quest.id}`);
                    if (step.type === 'deliver') assert.equal(talk(engine, step.target).character.id, step.target);
                } else if (step.type === 'talk') talk(engine, step.target);
                else if (step.type === 'visit') {
                    const location = locations.find(location => location.id === step.target);
                    at(engine, location.door); engine.visit(location.id);
                }
                tick(engine, .5);
            }
            assert.ok(engine.state.completedQuests.includes(quest.id), `Could not complete ${quest.id}`);
            remaining.delete(quest.id);
        }
    }
    assert.equal(remaining.size, 0);
    assert.ok(engine.state.ending);
});

test('nearby residents react to speeding, horns, and fights without being harmed or duplicated by encounters', () => {
    const engine = create();
    const ricky = engine.findResident('ricky');
    engine.state.vehicle.driving = true; engine.state.vehicle.speed = 180;
    at(engine, engine.state.vehicle);
    const before = { x: ricky.x, y: ricky.y };
    engine.update(.1);
    assert.ok(ricky.reaction.includes('house'));
    assert.equal(ricky.mode, 'react');
    assert.ok(Math.hypot(ricky.x - before.x, ricky.y - before.y) > 0);
    assert.equal(engine.useHorn(), true);
    assert.ok(engine.events.some(event => event.type === 'horn'));
    assert.ok(engine.findResident('bubbles').reaction.length);
    assert.equal(engine.useHorn(), false);
    tick(engine, 1);
    assert.equal(engine.useHorn(), true);
    engine.state.vehicle.driving = false; engine.state.vehicle.speed = 0;
    const bubbles = engine.findResident('bubbles');
    bubbles.reactionCooldown = 0;
    at(engine, { x: bubbles.x + 90, y: bubbles.y });
    engine.encounter = { type: 'cyrus', phase: 'combat', actors: [] };
    updateNPCs(engine, .1);
    assert.ok(bubbles.reaction.includes('kitties'));
    engine.encounter = { type: 'lahey', phase: 'approach', actors: [{ id: 'lahey' }, { id: 'randy' }] };
    updateNPCs(engine, .1);
    assert.equal(engine.getCharacters('park').some(resident => ['lahey', 'randy'].includes(resident.id)), false);
    engine.encounter = null; updateNPCs(engine, .1);
    assert.equal(engine.findResident('lahey').hiddenByEncounter, false);
});

test('night routines use actual homes and Ricky walks back to the actual parked Shitmobile', () => {
    const engine = create();
    engine.state.minutes = 20 * 60;
    npcTick(engine, 15);
    for (const resident of engine.residents) if (resident.id !== 'ricky') assert.equal(resident.scene, resident.home);
    const ricky = engine.findResident('ricky');
    assert.equal(ricky.scene, 'park');
    engine.state.vehicle.x = 1200; engine.state.vehicle.y = 855;
    const previous = { x: ricky.x, y: ricky.y };
    updateNPCs(engine, .1);
    assert.ok(Math.hypot(ricky.x - previous.x, ricky.y - previous.y) <= 12, 'Ricky follows his home on foot');
    npcTick(engine, 25);
    assert.ok(Math.hypot(ricky.x - engine.state.vehicle.x, ricky.y - engine.state.vehicle.y) < 120);
    assert.equal(ricky.scene, 'park');
    engine.state.minutes = 480;
    npcTick(engine, 20);
    assert.ok(engine.residents.filter(resident => resident.scene === 'park').length >= 3);
});

test('Ricky has a walkable yard and car home; old trailer saves migrate without losing progress', () => {
    const engine = create();
    const yard = locations.find(location => location.id === 'ricky');
    assert.equal(yard.solid, false);
    assert.equal(yard.enterable, false);
    assert.equal(interiors.ricky, undefined);
    assert.equal(engine.isBlocked(yard.x + yard.w / 2, yard.y + yard.h / 2), false);
    at(engine, yard.door);
    assert.equal(engine.enterBuilding('ricky'), false);
    assert.equal(engine.findResident('ricky').home, 'shitmobile');
    engine.state.health = 10;
    assert.equal(engine.restInCar(), true);
    assert.equal(engine.state.health, 100);
    assert.equal(engine.state.scene, 'park');
    assert.equal(engine.isBlocked(engine.state.player.x, engine.state.player.y), false);
    at(engine, { x: 8000, y: 5600 });
    assert.equal(engine.restInCar(), false);
    const saved = JSON.stringify({ version: 2, scene: 'ricky', player: { x: 360, y: 430 },
        money: 777, inventory: { burger: 3 }, completedQuests: [quests[0].id], xp: 150,
        vehicle: { x: 740, y: 765, angle: Math.PI / 2 } });
    const loaded = new GameEngine({ storage: { getItem: key => key === SAVE_KEY ? saved : null, setItem() {} } });
    assert.equal(loaded.state.version, 3);
    assert.equal(loaded.state.scene, 'park');
    assert.equal(loaded.state.player.x, yard.door.x);
    assert.equal(loaded.state.player.y, yard.door.y);
    assert.equal(loaded.state.money, 777);
    assert.equal(loaded.state.inventory.burger, 3);
    assert.equal(loaded.state.xp, 150);
    assert.ok(loaded.state.completedQuests.includes(quests[0].id));
});

test('distant destinations have business interiors and their food counters really sell snacks', () => {
    const expected = { mall: /cart|food court/i, gasStation: /fuel|snack/i, cityDiner: /grill|diner/i,
        pawnShop: /record|music/i, liquorStore: /bottle|license/i, quarry: /quarry|weighbridge/i,
        lake: /tackle|fishing/i, cityJunkyard: /scrap|engine/i };
    const engine = create();
    for (const [id, subject] of Object.entries(expected)) {
        const room = interiors[id];
        assert.ok(room.furniture.length >= 4);
        assert.equal(room.furniture.some(prop => ['bed', 'couch'].includes(prop.kind) || prop.action === 'rest'), false,
            `${id} should be a business, not another trailer bedroom`);
        assert.ok(room.furniture.some(prop => subject.test(prop.label)), `${id} needs its own useful furnishings`);
        assert.equal(engine.isBlocked(room.spawn.x, room.spawn.y, 13, id), false);
    }
    for (const id of ['gasStation', 'cityDiner', 'mall']) {
        const building = locations.find(location => location.id === id);
        at(engine, building.door);
        const beforeMoney = engine.state.money, beforeFood = engine.state.inventory.pepperoni || 0;
        assert.equal(engine.buyItem('pepperoni'), true, `The outdoor counter at ${id} works`);
        assert.equal(engine.state.money, beforeMoney - 5);
        assert.equal(engine.enterBuilding(id), true);
        const counter = interiors[id].furniture.find(prop => prop.action === 'shop');
        assert.ok(counter);
        at(engine, { x: counter.x + counter.w / 2, y: counter.y + counter.h + 20 }, id);
        assert.equal(engine.interact().furniture.action, 'shop');
        assert.equal(engine.buyItem('pepperoni'), true, `The indoor counter at ${id} works`);
        assert.equal(engine.state.money, beforeMoney - 10);
        assert.equal(engine.state.inventory.pepperoni, beforeFood + 2);
    }
});
