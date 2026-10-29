import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, SAVE_KEY } from '../gameEngine.js';
import { locations, PLAYER_START, VEHICLE_START } from '../story/locations.js';
import { interiors } from '../story/interiors.js';
import { characters } from '../story/characters.js';
import { pickups } from '../story/items.js';
import { quests } from '../story/quests.js';

const create = () => new GameEngine({ storage: null, random: () => 0.99 });
const at = (game, point) => Object.assign(game.state.player, point);
const memory = () => { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; };

test('every building has a furnished interior with a clear spawn and reachable exit', () => {
    const game = create();
    assert.equal(Object.keys(interiors).length, locations.length);
    for (const location of locations) {
        const room = interiors[location.id];
        assert.ok(room.furniture.length >= 4, `Empty room: ${location.id}`);
        game.state.scene = location.id;
        assert.equal(game.isBlocked(room.spawn.x, room.spawn.y), false, `Blocked spawn: ${location.id}`);
        const visited = new Set();
        const queue = [{ x: room.spawn.x, y: room.spawn.y }];
        let found = false;
        for (let index = 0; index < queue.length; index += 1) {
            const point = queue[index];
            if (Math.hypot(point.x - room.exit.x, point.y - room.exit.y) < 75) { found = true; break; }
            for (const [dx, dy] of [[15,0],[-15,0],[0,15],[0,-15]]) {
                const next = { x: point.x + dx, y: point.y + dy }, key = `${next.x},${next.y}`;
                if (!visited.has(key) && !game.isBlocked(next.x, next.y)) { visited.add(key); queue.push(next); }
            }
        }
        assert.ok(found, `Trapped in ${location.id}`);
    }
});

test('doors enter rooms, furniture collides and interacts, and exits return to the same door', () => {
    const game = create();
    const building = locations.find(location => location.id === 'ricky');
    at(game, { x: 3200, y: 2300 });
    assert.equal(game.enterBuilding(building.id), false);
    at(game, building.door);
    assert.equal(game.interact().type, 'transition');
    assert.equal(game.state.scene, building.id);
    assert.equal(game.getWorldBounds().width, 720);
    const room = game.getInterior();
    const prop = room.furniture[0];
    assert.equal(game.isBlocked(prop.x + prop.w / 2, prop.y + prop.h / 2), true);
    at(game, { x: prop.x + prop.w / 2, y: prop.y + prop.h + 20 });
    assert.equal(game.nearestInteractable().type, 'furniture');
    assert.equal(game.interact().furniture.id, prop.id);
    game.move(0, -1, 0.25);
    assert.ok(game.state.player.y >= prop.y + prop.h + 13);
    assert.equal(game.collect(pickups[0].id), false, 'Exterior pickups cannot be collected from local interior coordinates');
    at(game, { x: 360, y: 60 });
    assert.equal(game.exitBuilding(), false);
    at(game, room.exit);
    assert.equal(game.interact().type, 'transition');
    assert.equal(game.state.scene, 'park');
    assert.equal(game.getInterior(), null);
    assert.equal(game.state.player.x, building.door.x);
    assert.equal(game.state.player.y, building.door.y);
    assert.equal(game.state.outdoorPosition, null);
});

test('interior shops and workbenches work without leaking exterior character proximity', () => {
    const game = create();
    const shop = locations.find(location => location.id === 'store');
    at(game, shop.door);
    assert.equal(game.enterBuilding(shop.id), true);
    assert.equal(game.buyItem('burger'), true);
    assert.equal(game.work(), false);
    assert.equal(game.acceptQuest(quests.find(quest => !quest.requires.length).id), false);
    at(game, game.getInterior().exit);
    game.exitBuilding();
    const garage = locations.find(location => location.id === 'garage');
    at(game, garage.door);
    game.enterBuilding(garage.id);
    assert.equal(game.work(), true);
    assert.equal(game.buyItem('burger'), false);
    game.rest();
    assert.equal(game.state.scene, 'park');
    assert.equal(game.state.player.x, PLAYER_START.x);
});

test('the Shitmobile accelerates, steers, coasts, and safely returns the player to foot', () => {
    const game = create();
    const car = game.state.vehicle;
    at(game, { x: 3200, y: 2300 });
    assert.equal(game.toggleVehicle(), false);
    at(game, { x: car.x + 45, y: car.y });
    assert.equal(game.toggleVehicle(), true);
    assert.equal(car.driving, true);
    assert.equal(game.nearestInteractable().type, 'vehicle');
    const before = { x: car.x, y: car.y };
    game.move(0, -1, 0.25);
    assert.ok(car.speed > 0);
    assert.ok(Math.hypot(car.x - before.x, car.y - before.y) > 0);
    const oldAngle = car.angle;
    game.move(1, -1, 0.25);
    assert.ok(car.angle > oldAngle);
    const speed = car.speed;
    game.move(0, 0, 0.25);
    assert.ok(car.speed < speed);
    assert.equal(game.state.player.x, car.x);
    assert.equal(game.enterBuilding('ricky'), false);
    assert.equal(game.interact().type, 'transition');
    assert.equal(car.driving, false);
    assert.equal(game.isBlocked(game.state.player.x, game.state.player.y), false);
});

test('car collision cannot tunnel through a trailer', () => {
    const game = create();
    const building = locations.find(location => location.id === 'ricky');
    const car = game.state.vehicle;
    Object.assign(car, { x: building.x + building.w / 2, y: building.y + building.h + 36, angle: -Math.PI / 2, speed: 400, driving: true });
    at(game, car);
    const oldHealth = game.state.health;
    game.move(0, -1, 0.25);
    assert.ok(car.y >= building.y + building.h + 30);
    assert.equal(car.speed, 0);
    assert.ok(game.state.health < oldHealth);
    assert.ok(game.events.some(event => event.type === 'damage'));
});

test('the long car footprint stops its front corner before it enters a trailer', () => {
    const game = create();
    const building = locations.find(location => location.id === 'ricky');
    const car = game.state.vehicle;
    Object.assign(car, { x: building.x - 45, y: building.y + building.h + 45,
        angle: -Math.PI / 4, speed: 400, driving: true });
    at(game, car);
    assert.equal(game.vehicleBlocked(car.x, car.y, car.angle), false);
    game.move(0, -1, 0.25);
    assert.equal(car.speed, 0);
    assert.equal(game.vehicleBlocked(car.x, car.y, car.angle), false);
    const frontX = car.x + Math.cos(car.angle) * 27;
    const frontY = car.y + Math.sin(car.angle) * 27;
    assert.ok(frontX + 22 <= building.x || frontY - 22 >= building.y + building.h,
        'Front collision circle stays outside the trailer corner');
});

test('version 2 preserves rooms and parked cars; version 1 migrates gear and schemes to the new spawn', () => {
    const storage = memory();
    const game = new GameEngine({ storage });
    const building = locations.find(location => location.id === 'bubbles');
    at(game, building.door);
    game.enterBuilding(building.id);
    game.state.money = 420;
    game.gainXP(145);
    game.save();
    const loaded = new GameEngine({ storage });
    assert.equal(loaded.state.scene, building.id);
    assert.equal(loaded.state.money, 420);
    assert.equal(loaded.state.level, 2);
    assert.equal(loaded.state.xp, 145);
    assert.deepEqual(loaded.state.outdoorPosition, building.door);
    assert.equal(loaded.state.vehicle.x, VEHICLE_START.x);
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 1, player: { x: 100, y: 100 }, money: 650,
        inventory: { burger: 2 }, completedQuests: [quests[0].id], activeQuests: { [quests[1].id]: { step: 0 } } }));
    const migrated = new GameEngine({ storage });
    assert.equal(migrated.state.version, 2);
    assert.equal(migrated.state.scene, 'park');
    assert.equal(migrated.state.player.x, PLAYER_START.x);
    assert.equal(migrated.state.player.y, PLAYER_START.y);
    assert.equal(migrated.state.money, 650);
    assert.equal(migrated.state.inventory.burger, 2);
    assert.ok(migrated.state.completedQuests.includes(quests[0].id));
    assert.ok(migrated.state.activeQuests[quests[1].id]);
});

test('knockouts preserve gear and quests, penalize at most $25, and stop driving', () => {
    const game = create();
    game.state.inventory.burger = 2;
    game.state.money = 20;
    game.state.vehicle.driving = true;
    game.gainXP(95);
    game.gainXP(15);
    assert.equal(game.state.level, 2);
    game.damage(1000, 1000, 'Combat test');
    assert.equal(game.state.health, 65);
    assert.equal(game.state.money, 0);
    assert.equal(game.state.inventory.burger, 2);
    assert.equal(game.state.vehicle.driving, false);
    assert.equal(game.state.scene, 'park');
    assert.equal(game.state.xp, 110);
    assert.equal(game.encounter, null);
});

test('reverse driving saves an unobstructed position and reloads at rest in the car', () => {
    const storage = memory();
    const game = new GameEngine({ storage });
    at(game, { x: game.state.vehicle.x + 45, y: game.state.vehicle.y });
    game.toggleVehicle();
    for (let index = 0; index < 5; index += 1) game.move(0, 1, 0.1);
    assert.ok(game.state.vehicle.speed < 0);
    game.save();
    const loaded = new GameEngine({ storage });
    assert.equal(loaded.state.vehicle.driving, true);
    assert.equal(loaded.state.vehicle.speed, 0, 'Reloading never starts with a moving vehicle');
    assert.equal(loaded.state.vehicle.x, game.state.vehicle.x);
    assert.equal(loaded.state.vehicle.y, game.state.vehicle.y);
    assert.equal(loaded.state.player.x, loaded.state.vehicle.x);
    assert.equal(loaded.isBlocked(loaded.state.vehicle.x, loaded.state.vehicle.y, 30, 'park'), false);
    for (const character of characters) assert.ok(Math.hypot(character.x - loaded.state.vehicle.x, character.y - loaded.state.vehicle.y) > 40);
});

test('interiors and the car provide real encounter escapes only when reached, without rewards', () => {
    for (const type of ['bottlekids', 'lahey', 'kitty', 'cyrus']) {
        const game = create();
        assert.equal(game.startEncounter(type, { force: true }), true);
        const encounter = game.encounter;
        const building = locations.find(location => location.id === 'ricky');
        at(game, { x: 3200, y: 2300 });
        assert.equal(game.enterBuilding(building.id), false);
        assert.equal(game.toggleVehicle(), false);
        assert.equal(game.encounter, encounter, 'Remote interactions cannot cancel an encounter');
        at(game, building.door);
        const xp = game.state.xp, money = game.state.money, wins = game.state.wins;
        assert.equal(game.enterBuilding(building.id), true);
        assert.equal(game.encounter, null);
        assert.ok(game._encounters.cooldown >= 30);
        assert.equal(game.state.xp, xp);
        assert.equal(game.state.money, money);
        assert.equal(game.state.wins, wins);
    }
    const game = create();
    game.startEncounter('bottlekids', { force: true });
    at(game, { x: game.state.vehicle.x + 50, y: game.state.vehicle.y });
    assert.equal(game.toggleVehicle(), true);
    assert.equal(game.encounter, null);
    assert.equal(game.state.vehicle.driving, true);
    assert.equal(game.state.xp, 0);
    assert.equal(game.state.wins, 0);
    game.move(0, 1, 0.25);
    assert.ok(game.state.vehicle.speed < 0);
    assert.equal(game.isBlocked(game.state.vehicle.x, game.state.vehicle.y, 30, 'park'), false);
});
