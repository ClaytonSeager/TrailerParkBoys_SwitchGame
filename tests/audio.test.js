import test from 'node:test';
import assert from 'node:assert/strict';
import { ParkAudio } from '../audio.js';

class Param {
    constructor(value = 0) { this.value = value; this.changes = []; }
    setValueAtTime(value, time) { this.value = value; this.changes.push({ value, time }); }
    linearRampToValueAtTime(value, time) { this.setValueAtTime(value, time); }
    exponentialRampToValueAtTime(value, time) { this.setValueAtTime(value, time); }
    cancelScheduledValues() {}
}

class AudioNode {
    constructor(ctx, kind) {
        this.ctx = ctx; this.kind = kind; this.connections = [];
        this.gain = new Param(1); this.frequency = new Param(440); this.Q = new Param(1);
    }
    connect(node) { this.connections.push(node); return node; }
    disconnect() { this.connections = []; this.disconnected = true; }
    start(time = 0) { this.startTime = time; this.started = true; }
    stop(time = 0) { this.stopTime = time; if (time <= this.ctx.currentTime) this.end(); }
    end() { if (!this.ended) { this.ended = true; this.onended?.(); } }
}

class Context {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.nodes = []; this.resumeCalls = 0; this.suspendCalls = 0; this.destination = {}; }
    make(kind) { const node = new AudioNode(this, kind); this.nodes.push(node); return node; }
    createGain() { return this.make('gain'); }
    createOscillator() { return this.make('oscillator'); }
    createBufferSource() { return this.make('buffer'); }
    createBiquadFilter() { return this.make('filter'); }
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    resume() { this.resumeCalls++; this.state = 'running'; return Promise.resolve(); }
    suspend() { this.suspendCalls++; this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    advance(seconds) {
        this.currentTime += seconds;
        for (const node of this.nodes) if (node.started && node.stopTime <= this.currentTime) node.end();
    }
}

const store = () => { const data = new Map(); return { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) }; };
const engine = () => ({ state: { scene: 'park', player: { x: 725, y: 815 }, vehicle: { driving: false, speed: 0 }, energy: 100, minutes: 480 }, moving: false });
const setup = (storage = null) => { const ctx = new Context(); const audio = new ParkAudio({ storage, contextFactory: () => ctx }); return { audio, ctx }; };

test('audio waits for a gesture and concurrent unlocks create and resume exactly one graph', async () => {
    const ctx = new Context(); let creations = 0;
    const audio = new ParkAudio({ storage: null, contextFactory: () => { creations++; return ctx; } });
    audio.update(engine(), .1);
    assert.equal(audio.play('pickup'), false);
    assert.equal(creations, 0);
    await Promise.all([audio.unlock(), audio.unlock(), audio.unlock()]);
    assert.equal(creations, 1); assert.equal(ctx.resumeCalls, 1); assert.equal(audio.unlocked, true);
    await audio.unlock(); assert.equal(ctx.resumeCalls, 1);
    assert.equal(ctx.nodes.filter(n => n.started).length, 0, 'unlocking enables sound without playing a surprise cue');
    assert.equal(audio.play('pickup'), true);
    assert.ok(ctx.nodes.some(n => n.started));
    audio.dispose();
});

test('mute and independent volume settings persist safely and cannot exceed normal gain', async () => {
    const storage = store(); const { audio, ctx } = setup(storage); await audio.unlock();
    assert.equal(audio.getSettings().master, .5);
    audio.setVolume('master', 2); audio.setVolume('sfx', -.3); audio.setVolume('ambience', .3);
    assert.equal(audio.getSettings().master, 1); assert.equal(audio.getSettings().sfx, 0);
    assert.equal(audio.setVolume('unknown', 1), false); assert.equal(audio.setVolume('master', NaN), false);
    audio.setMuted(true); assert.equal(audio.master.gain.value, 0); assert.equal(audio.play('horn'), false);
    const replacement = new ParkAudio({ storage, contextFactory: () => new Context() });
    assert.deepEqual(replacement.getSettings(), { muted: true, master: 1, sfx: 0, ambience: .3, music: 0 });
    const snapshot = audio.getSettings(); snapshot.muted = false; assert.equal(audio.getSettings().muted, true);
    audio.setMuted(false); assert.equal(audio.master.gain.value, 1);
    assert.equal(ctx.state, 'running'); audio.dispose(); replacement.dispose();
    const blocked = new ParkAudio({ storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } }, contextFactory: () => new Context() });
    assert.doesNotThrow(() => { blocked.setMuted(true); blocked.setVolume('master', .2); }); blocked.dispose();
});

test('one-shot voices clean up after playback and heavy input stays bounded', async () => {
    const { audio, ctx } = setup(); await audio.unlock();
    audio.play('glass'); const played = ctx.nodes.filter(n => n.started);
    assert.equal(played.length, 4); assert.equal(audio._voices.size, 4);
    ctx.advance(1);
    assert.equal(audio._voices.size, 0); assert.ok(played.every(n => n.disconnected));
    for (let i = 0; i < 80; i++) audio.play('reward');
    assert.ok(audio._voices.size <= 40); assert.ok(audio._allSources.size <= 40);
    audio.dispose(); audio.dispose();
    assert.equal(audio._allSources.size, 0); assert.equal(ctx.state, 'closed');
    assert.ok(ctx.nodes.every(n => n.disconnected));
});

test('vehicle sound follows real speed, reuses its loop, fades out, and pauses without leaking audio', async () => {
    const { audio, ctx } = setup(); await audio.unlock(); const game = engine();
    game.state.vehicle.driving = true; audio.update(game, .05);
    const motor = audio._loops.get('engine'); const idlePitch = motor.source.frequency.value;
    game.state.vehicle.speed = 440; audio.update(game, .05);
    assert.equal(audio._loops.get('engine'), motor); assert.ok(motor.source.frequency.value > idlePitch);
    const sources = ctx.nodes.filter(n => n.started).length;
    for (let i = 0; i < 20; i++) audio.update(game, .05);
    assert.equal(ctx.nodes.filter(n => n.started).length, sources);
    game.state.vehicle.driving = false; audio.update(game, .05);
    assert.equal(audio._loops.has('engine'), false); assert.equal(motor.gain.gain.value, 0);
    ctx.advance(1); assert.ok(motor.source.disconnected);
    game.paused = true; audio.update(game, .05);
    assert.equal(ctx.state, 'suspended'); assert.equal(audio._loops.size, 0);
    game.paused = false; audio.update(game, .05);
    assert.equal(ctx.state, 'running'); assert.ok(audio._loops.has('wind'));
    audio.setMuted(true); assert.equal(audio._loops.size, 0); assert.equal(audio.master.gain.value, 0);
    audio.dispose();
});

test('footsteps need actual on-foot travel and bottle impacts sound only once per effect object', async () => {
    const { audio } = setup(); await audio.unlock(); const game = engine(); const played = [];
    const play = audio.play.bind(audio); audio.play = (type, data) => { played.push({ type, data }); return play(type, data); };
    audio.update(game, .05); game.moving = true;
    for (let i = 0; i < 30; i++) audio.update(game, .05);
    assert.equal(played.filter(p => p.type === 'footstep').length, 0, 'holding a direction into a wall is silent');
    for (let i = 0; i < 9; i++) { game.state.player.x += 9; audio.update(game, .05); }
    assert.equal(played.filter(p => p.type === 'footstep').length, 1);
    assert.equal(played.find(p => p.type === 'footstep').data.inside, false);
    game.state.scene = 'ricky'; audio.update(game, .05);
    for (let i = 0; i < 9; i++) { game.state.player.x += 9; audio.update(game, .05); }
    assert.equal(played.filter(p => p.type === 'footstep').at(-1).data.inside, true);
    game.encounter = { effects: [{ kind: 'glass' }] };
    for (let i = 0; i < 12; i++) audio.update(game, .05);
    assert.equal(played.filter(p => p.type === 'glass').length, 1);
    game.encounter.effects.push({ kind: 'glass' }); audio.update(game, .05);
    assert.equal(played.filter(p => p.type === 'glass').length, 2);
    audio.dispose();
});

test('menu previews can sound after a gesture while the ambient world stays paused', async () => {
    const { audio, ctx } = setup(); await audio.unlock(); const game = engine();
    audio.play('talk', { characterId: 'bubbles' }); game.paused = true;
    audio.update(game, .05);
    assert.equal(ctx.state, 'running', 'a dialogue blip is allowed to finish when its menu opens');
    assert.equal(audio._loops.size, 0);
    ctx.advance(1);
    audio.update(game, .05); assert.equal(ctx.state, 'suspended');
    assert.equal(audio.play('pickup'), false);
    assert.equal(audio.play('pickup', { preview: true }), true);
    await Promise.resolve();
    assert.equal(ctx.state, 'running'); assert.ok(audio._voices.size > 0); assert.equal(audio._loops.size, 0);
    ctx.advance(1); audio.update(game, .05); assert.equal(ctx.state, 'suspended');
    audio.dispose();
});

test('the expanded world changes from forest wind to lake water and city traffic', async () => {
    const { audio } = setup(); await audio.unlock(); const game = engine();
    game.getMapRegion = () => ({ id: 'forest' }); audio.update(game, .05);
    const forestWind = audio._loops.get('wind').gain.gain.value;
    assert.equal(audio._loops.has('traffic'), false);
    game.getMapRegion = () => ({ id: 'lakeDistrict' }); audio.update(game, .05);
    assert.ok(audio._loops.has('water')); assert.ok(audio._loops.get('wind').gain.gain.value < forestWind);
    game.getMapRegion = () => ({ id: 'city' }); audio.update(game, .05);
    assert.ok(audio._loops.has('traffic')); assert.equal(audio._loops.has('water'), false);
    game.state.scene = 'cityDiner'; audio.update(game, .05);
    assert.ok(audio._loops.has('room-hum')); assert.equal(audio._loops.has('traffic'), false);
    audio.dispose();
});

test('hiding an already paused menu immediately stops dialogue and preview audio', async () => {
    const { audio, ctx } = setup(); await audio.unlock(); const game = engine();
    const previousDocument = globalThis.document;
    try {
        globalThis.document = { hidden: false };
        audio.play('talk', { characterId: 'julian' }); game.paused = true;
        audio.update(game, .05); assert.ok(audio._voices.size > 0);
        globalThis.document.hidden = true; audio.update(game, .05);
        assert.equal(audio._voices.size, 0); assert.equal(ctx.state, 'suspended');
        assert.equal(audio.play('pickup', { preview: true }), false);
    } finally {
        if (previousDocument === undefined) delete globalThis.document;
        else globalThis.document = previousDocument;
        audio.dispose();
    }
});
