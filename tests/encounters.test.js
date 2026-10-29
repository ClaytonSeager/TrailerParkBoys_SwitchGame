import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeEncounters, updateEncounters, startEncounter, chooseEncounter, combatAction } from '../encounters.js';
import { GameEngine } from '../gameEngine.js';
import { locations, PLAYER_START } from '../story/locations.js';

function create() {
    const engine = {
        state: { scene: 'park', vehicle: { driving: false }, player: { x: 1700, y: 1700, facing: 'right' },
            health: 100, mentalState: 100, energy: 100, money: 80, reputation: 0, xp: 0, level: 1, wins: 0 },
        events: [], saves: 0,
        isBlocked() { return false; },
        emit(type, text) { this.events.push({ type, text }); },
        save() { this.saves++; return true; },
        gainXP(amount) { this.state.xp += amount; this.state.level = 1 + Math.floor(this.state.xp / 100); },
        damage(health, mental, source) {
            this.state.health = Math.max(0, this.state.health - health);
            this.state.mentalState = Math.max(0, this.state.mentalState - mental);
            this.emit('damage', source);
            if (!this.state.health) this.encounter = null;
        }
    };
    initializeEncounters(engine, () => 0);
    return engine;
}

const tick = (engine, seconds) => {
    const count = Math.ceil(seconds / .05);
    for (let index = 0; index < count; index++) updateEncounters(engine, .05);
};

const awaitChoice = engine => {
    for (let i = 0; i < 500 && engine.encounter?.phase !== 'choice'; i++) updateEncounters(engine, .05);
    assert.equal(engine.encounter?.phase, 'choice');
};

test('the first outdoor encounter has exactly four visible kids and telegraphed aimed throws', () => {
    const engine = create();
    tick(engine, 19);
    assert.equal(engine.encounter, null);
    tick(engine, 1.1);
    assert.equal(engine.encounter.type, 'bottlekids');
    assert.equal(engine.encounter.actors.length, 4);
    assert.ok(engine.encounter.actors.every(a => a.kind === 'kid' && a.enemy && a.maxHealth === 12));
    tick(engine, .9);
    assert.ok(engine.encounter.effects.some(fx => fx.kind === 'telegraph'));
    const first = engine.encounter.actors[0];
    const aim = { ...first.aim };
    engine.state.player.y += 80;
    tick(engine, .7);
    assert.ok(engine.encounter.projectiles.length > 0);
    assert.deepEqual(first.aim, aim, 'throws lead to an old position, so the player can dodge them');
});

test('bottles damage both health and mental state, with an invulnerability window', () => {
    const engine = create();
    startEncounter(engine, 'bottlekids', { force: true });
    const bottle = () => ({ x: engine.state.player.x, y: engine.state.player.y, vx: 0, vy: 0, radius: 7, life: 1, kind: 'bottle' });
    engine.encounter.projectiles.push(bottle(), bottle(), bottle());
    updateEncounters(engine, .05);
    assert.equal(engine.state.health, 96);
    assert.equal(engine.state.mentalState, 98);
    assert.equal(engine.events.filter(event => event.type === 'damage').length, 1);
    engine.encounter.projectiles.push(bottle());
    updateEncounters(engine, .05);
    assert.equal(engine.state.health, 96, 'stacked bottles cannot deal four hits in the same frame');
    tick(engine, 1);
    engine.encounter.projectiles.push(bottle());
    updateEncounters(engine, .05);
    assert.ok(engine.state.health <= 92);
});

test('blocking reduces a bottle hit and a dodge moves safely with temporary immunity', () => {
    const engine = create();
    startEncounter(engine, 'bottlekids', { force: true });
    assert.equal(combatAction(engine, 'block'), true);
    engine.encounter.projectiles.push({ x: 1700, y: 1700, vx: 0, vy: 0, radius: 7, life: 1, kind: 'bottle' });
    updateEncounters(engine, .05);
    assert.equal(engine.state.health, 99);
    assert.equal(engine.state.mentalState, 100);
    const before = engine.state.player.x;
    assert.equal(combatAction(engine, 'dodge'), true);
    assert.ok(engine.state.player.x > before);
    engine.encounter.invulnerable = 0;
    engine.encounter.projectiles.push({ ...engine.state.player, vx: 0, vy: 0, radius: 7, life: 1, kind: 'bottle' });
    updateEncounters(engine, .05);
    assert.equal(engine.state.health, 99);
});

test('Lahey visibly parks and approaches, then respect and insult take separate branches', () => {
    const calm = create();
    startEncounter(calm, 'lahey', { force: true });
    assert.equal(calm.encounter.actors[0].kind, 'car');
    assert.equal(calm.encounter.actors[0].state, 'driving');
    awaitChoice(calm);
    assert.ok(calm.encounter.actors.some(a => a.id === 'lahey'));
    assert.ok(calm.encounter.actors.some(a => a.id === 'randy'));
    assert.equal(chooseEncounter(calm, 'calm'), true);
    assert.equal(calm.encounter.phase, 'depart');
    assert.equal(calm.state.xp, 15);
    assert.equal(calm.state.health, 100);
    assert.equal(chooseEncounter(calm, 'calm'), false);
    const insult = create();
    startEncounter(insult, 'lahey', { force: true });
    awaitChoice(insult);
    assert.equal(chooseEncounter(insult, 'insult'), true);
    assert.equal(insult.encounter.phase, 'combat');
    const randy = insult.encounter.actors.find(a => a.id === 'randy');
    assert.equal(randy.maxHealth, 50);
    assert.equal(randy.enemy, true);
});

test('Cyrus cannot take unavailable money and payment cannot be repeated', () => {
    const engine = create();
    engine.state.money = 10;
    startEncounter(engine, 'cyrus', { force: true });
    awaitChoice(engine);
    assert.equal(engine.encounter.choices.find(c => c.id === 'pay').disabled, true);
    assert.equal(chooseEncounter(engine, 'pay'), false);
    assert.equal(engine.state.money, 10);
    engine.state.money = 25;
    assert.equal(chooseEncounter(engine, 'pay'), true);
    assert.equal(engine.state.money, 0);
    assert.equal(chooseEncounter(engine, 'pay'), false);
    assert.equal(engine.state.money, 0);
});

test('a combat win awards XP and cash exactly once and respects punch cooldown', () => {
    const engine = create();
    startEncounter(engine, 'cyrus', { force: true });
    awaitChoice(engine);
    chooseEncounter(engine, 'fight');
    const enemy = engine.encounter.actors[0];
    for (let punch = 0; punch < 8 && engine.encounter.phase !== 'depart'; punch++) {
        enemy.x = engine.state.player.x + 35; enemy.y = engine.state.player.y;
        const health = enemy.health;
        assert.equal(combatAction(engine, 'punch'), true);
        assert.equal(combatAction(engine, 'punch'), false);
        assert.ok(enemy.health < health);
        tick(engine, .45);
    }
    assert.equal(engine.encounter.phase, 'depart');
    assert.equal(engine.state.wins, 1);
    assert.equal(engine.state.xp, 65);
    assert.equal(engine.state.money, 125);
    assert.equal(combatAction(engine, 'punch'), false);
    tick(engine, 4);
    assert.equal(engine.encounter, null);
    assert.equal(engine.state.wins, 1);
    assert.equal(engine.state.xp, 65);
});

test('melee has a visible wind-up and enough delay to walk out of range', () => {
    const engine = create();
    startEncounter(engine, 'cyrus', { force: true }); awaitChoice(engine); chooseEncounter(engine, 'fight');
    const enemy = engine.encounter.actors[0];
    enemy.x = engine.state.player.x + 50; enemy.y = engine.state.player.y; enemy.attackCooldown = 0;
    updateEncounters(engine, .05);
    assert.ok(enemy.windup > .5);
    assert.equal(engine.state.health, 100);
    assert.ok(engine.encounter.effects.some(fx => fx.kind === 'telegraph'));
    engine.state.player.x -= 160;
    tick(engine, .7);
    assert.equal(engine.state.health, 100);
});

test('encounter cooldown freezes indoors, while driving, and while explicitly paused', () => {
    const engine = create();
    for (const mode of ['inside', 'driving', 'paused']) {
        engine.state.scene = mode === 'inside' ? 'ricky' : 'park';
        engine.state.vehicle.driving = mode === 'driving'; engine.paused = mode === 'paused';
        const before = engine._encounters.cooldown;
        tick(engine, 25);
        assert.equal(engine.encounter, null);
        assert.equal(engine._encounters.cooldown, before);
        assert.equal(startEncounter(engine, 'bottlekids', { force: true }), false);
    }
    engine.state.scene = 'park'; engine.state.vehicle.driving = false; engine.paused = false;
    tick(engine, 20.1);
    assert.equal(engine.encounter.type, 'bottlekids');
});

test('random event bags contain every type once and initial timing varies from twenty to thirty-five seconds', () => {
    const low = create();
    const high = create(); initializeEncounters(high, () => .999);
    assert.equal(low._encounters.cooldown, 20);
    assert.ok(high._encounters.cooldown > 34 && high._encounters.cooldown <= 35);
    const sample = engine => {
        const seen = [];
        for (let i = 0; i < 10; i++) {
            engine.encounter = null; engine._encounters.cooldown = 0;
            updateEncounters(engine, .05); seen.push(engine.encounter.type);
        }
        return seen;
    };
    const first = sample(low), second = sample(high);
    assert.equal(new Set(first.slice(0, 5)).size, 5);
    assert.equal(new Set(first.slice(5, 10)).size, 5);
    assert.notEqual(first[4], first[5]);
    assert.notDeepEqual(first.slice(0, 5), second.slice(0, 5));
});

test('friendly kitty rescue spends bounded energy and rewards only one time', () => {
    const engine = create(); engine.state.mentalState = 50;
    startEncounter(engine, 'kitty', { force: true }); awaitChoice(engine);
    assert.equal(chooseEncounter(engine, 'help'), true);
    assert.equal(engine.state.energy, 92);
    assert.equal(engine.state.mentalState, 64);
    assert.equal(engine.state.xp, 25);
    assert.equal(engine.state.money, 90);
    assert.equal(chooseEncounter(engine, 'help'), false);
});

test('core integration spawns in safe outdoor positions and never serializes a live fight', () => {
    const engine = new GameEngine({ storage: null, random: () => .1 });
    assert.equal(engine.startEncounter('bottlekids', { force: true }), true);
    assert.equal(engine.encounter.actors.length, 4);
    for (const a of engine.encounter.actors) assert.equal(engine.isBlocked(a.x, a.y, 13, 'park'), false);
    const serialized = JSON.parse(engine.serialize());
    assert.equal(serialized.encounter, undefined);
    engine.encounter.invulnerable = 0;
    engine.state.health = 1;
    engine.encounter.projectiles.push({ ...engine.state.player, vx: 0, vy: 0, radius: 7, life: 1, kind: 'bottle' });
    updateEncounters(engine, .05);
    assert.equal(engine.encounter, null);
    assert.equal(engine.state.scene, 'park');
    assert.ok(engine.state.health > 0);
    assert.ok(engine._encounters.cooldown > 20, 'a knockout does not immediately spawn another attack');
});

test('Lahey uses the nearby inner lane instead of parking beyond the first row of trailers', () => {
    const engine = new GameEngine({ storage: null, random: () => .3 });
    engine.state.player = { ...PLAYER_START };
    assert.equal(startEncounter(engine, 'lahey', { force: true }), true);
    const stop = engine.encounter.carStop;
    assert.ok(Math.hypot(stop.x - PLAYER_START.x, stop.y - PLAYER_START.y) < 120);
    assert.equal(engine.isBlocked(stop.x, stop.y, 30, 'park'), false);
    awaitChoice(engine);
    assert.ok(engine.encounter.actors.some(a => a.id === 'lahey' && Math.hypot(a.x - PLAYER_START.x, a.y - PLAYER_START.y) <= 115));
});

test('Cyrus routes around a real trailer and only starts his dialogue after actually reaching the player', () => {
    const engine = new GameEngine({ storage: null, random: () => .1 });
    const trailer = locations.find(l => l.id === 'ricky');
    engine.state.player = { x: trailer.x + trailer.w / 2, y: trailer.y - 35, facing: 'down' };
    startEncounter(engine, 'cyrus', { force: true });
    const enemy = engine.encounter.actors[0];
    enemy.x = trailer.x + trailer.w / 2; enemy.y = trailer.y + trailer.h + 40;
    let wentAroundEnd = false;
    for (let i = 0; i < 400 && engine.encounter.phase !== 'choice'; i++) {
        updateEncounters(engine, .05);
        assert.equal(engine.isBlocked(enemy.x, enemy.y, 13, 'park'), false);
        if (enemy.x < trailer.x - 12 || enemy.x > trailer.x + trailer.w + 12) wentAroundEnd = true;
    }
    assert.equal(engine.encounter.phase, 'choice');
    assert.equal(wentAroundEnd, true, 'the actor walks around an end of the trailer');
    assert.ok(Math.hypot(enemy.x - engine.state.player.x, enemy.y - engine.state.player.y) <= 115);
});
