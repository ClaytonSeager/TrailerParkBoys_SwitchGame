import * as world from './story/locations.js';

const SETTINGS_KEY = 'sunnyvale-audio-v1';
const DEFAULTS = { muted: false, master: .5, sfx: .75, ambience: .5, music: 0 };
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const effectSounds = { glass: 'glass', punch: 'punch', dodge: 'dodge', block: 'block' };

/** Original procedural audio. Constructing this class never starts an AudioContext. */
export class ParkAudio {
    constructor({ storage, contextFactory } = {}) {
        this.storage = storage;
        if (storage === undefined) {
            try { this.storage = globalThis.localStorage || null; } catch { this.storage = null; }
        }
        const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
        this._factory = contextFactory || (Context ? () => new Context() : null);
        this.available = typeof this._factory === 'function';
        this.unlocked = false;
        this.status = this.available ? 'Sound ready · tap to enable' : 'Audio unavailable in this browser';
        this.settings = { ...DEFAULTS };
        try {
            const saved = JSON.parse(this.storage?.getItem(SETTINGS_KEY) || 'null');
            if (saved && typeof saved === 'object') {
                if (typeof saved.muted === 'boolean') this.settings.muted = saved.muted;
                for (const key of ['master', 'sfx', 'ambience', 'music']) {
                    if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) this.settings[key] = clamp(saved[key], 0, 1);
                }
            }
        } catch { /* An unavailable or old setting never prevents play. */ }
        this._voices = new Set(); this._loops = new Map(); this._allSources = new Set();
        this._seenEffects = new WeakSet(); this._footTimer = 0; this._birdTimer = 3;
        this._dogTimer = 23; this._cricketTimer = 1; this._disposed = false; this._paused = false; this._hidden = false;
    }

    getSettings() { return { ...this.settings }; }
    _persist() { try { this.storage?.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* session settings still work */ } }

    /** Call directly from a pointer/key gesture. Repeated calls reuse the graph. */
    unlock() {
        if (!this.available || this._disposed) return Promise.resolve(false);
        if (this.unlocked && this.context?.state === 'running') return Promise.resolve(true);
        if (this._unlocking) return this._unlocking;
        const pending = (async () => {
            try {
                if (!this.context) {
                    this.context = this._factory();
                    this._buildGraph();
                }
                if (this.context.state !== 'running') await this.context.resume?.();
                this.unlocked = this.context.state === 'running' || this.context.state === undefined;
                this.status = this.unlocked ? (this.settings.muted ? 'Sound muted' : 'Sound on') : 'Tap to enable sound';
                return this.unlocked;
            } catch {
                this.status = 'Tap to enable sound';
                return false;
            }
        })();
        this._unlocking = pending;
        pending.finally(() => { if (this._unlocking === pending) this._unlocking = null; });
        return pending;
    }

    _buildGraph() {
        const ctx = this.context;
        this.master = ctx.createGain(); this.master.connect(ctx.destination);
        this.channels = {};
        for (const name of ['sfx', 'ambience', 'music']) {
            const node = ctx.createGain(); node.connect(this.master); this.channels[name] = node;
            node.gain.value = this.settings[name];
        }
        this.master.gain.value = this.settings.muted ? 0 : this.settings.master;
        const count = Math.max(1024, Math.floor(ctx.sampleRate || 44100));
        this._noiseBuffer = ctx.createBuffer(1, count, ctx.sampleRate || 44100);
        const samples = this._noiseBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * .7;
    }

    _ramp(param, value, duration = .08) {
        if (!param) return;
        const now = this.context.currentTime || 0;
        param.cancelScheduledValues?.(now);
        param.setValueAtTime?.(param.value, now);
        if (param.linearRampToValueAtTime) param.linearRampToValueAtTime(value, now + duration);
        else param.value = value;
    }

    setMuted(muted) {
        this.settings.muted = !!muted;
        if (this.master) this._ramp(this.master.gain, this.settings.muted ? 0 : this.settings.master, .04);
        if (this.settings.muted) {
            for (const name of [...this._loops.keys()]) this._stopLoop(name, 0);
            for (const voice of [...this._voices]) this._stopRecord(voice, 0);
        }
        this.status = this.settings.muted ? 'Sound muted' : this.unlocked ? 'Sound on' : 'Sound ready · tap to enable';
        this._persist();
    }

    setVolume(channel, value) {
        if (!['master', 'sfx', 'ambience', 'music'].includes(channel) || !Number.isFinite(Number(value))) return false;
        this.settings[channel] = clamp(Number(value), 0, 1);
        if (channel === 'master' && this.master) this._ramp(this.master.gain, this.settings.muted ? 0 : this.settings.master);
        else if (this.channels?.[channel]) this._ramp(this.channels[channel].gain, this.settings[channel]);
        this._persist(); return true;
    }

    _track(source, nodes, oneShot = true) {
        const record = { source, nodes, done: false, menuSound: !!this._schedulingMenuSound };
        this._allSources.add(record);
        if (oneShot) this._voices.add(record);
        source.onended = () => this._cleanup(record);
        while (this._voices.size > 40) this._stopRecord(this._voices.values().next().value, 0);
        return record;
    }

    _cleanup(record) {
        if (!record || record.done) return;
        record.done = true; this._voices.delete(record); this._allSources.delete(record);
        for (const node of record.nodes) { try { node.disconnect?.(); } catch { /* already disconnected */ } }
    }

    _stopRecord(record, after = 0) {
        if (!record || record.done) return;
        try { record.source.stop((this.context.currentTime || 0) + after); } catch { /* already stopped */ }
        if (!after) this._cleanup(record);
    }

    _envelope(gain, volume, start, end, attack = .008) {
        const param = gain.gain;
        param.setValueAtTime(.0001, start);
        param.linearRampToValueAtTime(Math.max(.0001, volume), Math.min(end, start + attack));
        if (param.exponentialRampToValueAtTime) param.exponentialRampToValueAtTime(.0001, end);
        else param.linearRampToValueAtTime(.0001, end);
    }

    _tone(frequency, duration, { to = frequency, volume = .12, wave = 'sine', delay = 0, channel = 'sfx' } = {}) {
        const ctx = this.context, source = ctx.createOscillator(), gain = ctx.createGain();
        const start = (ctx.currentTime || 0) + delay, end = start + duration;
        source.type = wave; source.frequency.setValueAtTime(frequency, start);
        source.frequency.exponentialRampToValueAtTime(Math.max(20, to), end);
        this._envelope(gain, volume, start, end);
        source.connect(gain); gain.connect(this.channels[channel]);
        this._track(source, [source, gain]); source.start(start); source.stop(end + .02);
    }

    _noise(duration, { cutoff = 1000, to = cutoff, volume = .1, filter = 'lowpass', delay = 0, channel = 'sfx' } = {}) {
        const ctx = this.context, source = ctx.createBufferSource(), tone = ctx.createBiquadFilter(), gain = ctx.createGain();
        const start = (ctx.currentTime || 0) + delay, end = start + duration;
        source.buffer = this._noiseBuffer; tone.type = filter;
        tone.frequency.setValueAtTime(cutoff, start); tone.frequency.linearRampToValueAtTime(to, end); tone.Q.value = .5;
        this._envelope(gain, volume, start, end);
        source.connect(tone); tone.connect(gain); gain.connect(this.channels[channel]);
        this._track(source, [source, tone, gain]); source.start(start); source.stop(end + .02);
    }

    /** All notes and noise are synthesized here; no samples or recorded voices. */
    play(type, payload = {}) {
        const menuSound = payload.preview || type === 'ui' || type === 'talk';
        if (!this.unlocked || this.settings.muted || this._paused && !menuSound || this._disposed || globalThis.document?.hidden) return false;
        if (this.context?.state === 'suspended') {
            if (!menuSound || payload._resumed) return false;
            try {
                Promise.resolve(this.context.resume?.()).then(() => this.play(type, { ...payload, _resumed: true })).catch(() => {});
                return true;
            } catch { return false; }
        }
        const previousMenuSound = this._schedulingMenuSound;
        this._schedulingMenuSound = !!menuSound;
        try {
            switch (type) {
                case 'door': this._noise(.13, { cutoff: 550, to: 160, volume: .12 }); this._tone(125, .1, { to: 70, volume: .1, delay: .1 }); break;
                case 'pickup': this._tone(620, .09, { to: 880, volume: .07 }); this._tone(980, .1, { volume: .05, delay: .06 }); break;
                case 'quest': this._tone(330, .15, { volume: .06 }); this._tone(440, .17, { volume: .06, delay: .12 }); break;
                case 'reward': [392, 494, 587].forEach((f, i) => this._tone(f, .22, { volume: .06, delay: i * .1 })); break;
                case 'level-up': [330, 440, 554, 660].forEach((f, i) => this._tone(f, .3, { volume: .065, delay: i * .1 })); break;
                case 'punch': this._noise(.1, { cutoff: 700, to: 220, volume: .18 }); this._tone(110, .09, { to: 55, volume: .11 }); break;
                case 'hit': this._noise(.16, { cutoff: 900, to: 170, volume: .18 }); this._tone(90, .14, { to: 45, volume: .1 }); break;
                case 'block': this._noise(.06, { cutoff: 1400, to: 500, volume: .12 }); this._tone(230, .07, { to: 120, volume: .08 }); break;
                case 'dodge': this._noise(.2, { cutoff: 500, to: 2100, filter: 'bandpass', volume: .1 }); break;
                case 'glass': this._noise(.17, { cutoff: 4200, to: 2200, filter: 'highpass', volume: .14 }); [1680, 2420, 3190].forEach((f, i) => this._tone(f, .1, { to: f * .78, volume: .025, delay: i * .035 })); break;
                case 'horn': [220, 277].forEach(f => this._tone(f, .42, { wave: 'sawtooth', volume: .045 })); break;
                case 'engine-start': this._noise(.4, { cutoff: 600, to: 180, volume: .1 }); this._tone(40, .5, { to: 85, wave: 'triangle', volume: .13 }); break;
                case 'engine-stop': this._tone(80, .35, { to: 28, wave: 'triangle', volume: .1 }); break;
                case 'knockout': this._tone(185, .45, { to: 50, volume: .1 }); this._noise(.4, { cutoff: 350, to: 80, volume: .08 }); break;
                case 'encounter': this._tone(185, .17, { to: 165, volume: .065, wave: 'triangle' }); this._tone(165, .2, { to: 150, volume: .05, delay: .17 }); break;
                case 'ui': this._tone(490, .045, { to: 650, volume: .025 }); break;
                case 'talk': {
                    const id = String(payload.characterId || payload.character?.id || 'resident');
                    const pitch = 180 + [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 180;
                    [1, 1.16, .92].forEach((ratio, i) => this._tone(pitch * ratio, .055, { to: pitch * ratio * .85, wave: 'triangle', volume: .025, delay: i * .08 })); break;
                }
                case 'footstep': this._noise(payload.inside ? .07 : .11, { cutoff: payload.inside ? 350 : 2100, to: payload.inside ? 160 : 700, volume: payload.inside ? .07 : .085 }); this._tone(payload.inside ? 95 : 125, .045, { to: 60, volume: .025 }); break;
                case 'bird': [0, .14, .31].forEach((delay, i) => this._tone(2100 + i * 200, .095, { to: 3200 - i * 250, volume: .022, channel: 'ambience', delay })); break;
                case 'cricket': [0, .07, .14].forEach(delay => this._tone(3700, .035, { to: 4200, volume: .009, channel: 'ambience', delay })); break;
                case 'dog': [0, .22].forEach(delay => { this._noise(.13, { cutoff: 650, to: 230, filter: 'bandpass', volume: .04, channel: 'ambience', delay }); this._tone(170, .12, { to: 100, volume: .025, channel: 'ambience', delay }); }); break;
                default: return false;
            }
            return true;
        } catch { return false; }
        finally { this._schedulingMenuSound = previousMenuSound; }
    }

    _loop(name, { noise = false, frequency = 60, cutoff = 500, volume = .02, channel = 'ambience', wave = 'sine' } = {}) {
        if (this._loops.has(name)) return this._loops.get(name);
        const ctx = this.context, source = noise ? ctx.createBufferSource() : ctx.createOscillator();
        const filter = ctx.createBiquadFilter(), gain = ctx.createGain();
        if (noise) { source.buffer = this._noiseBuffer; source.loop = true; }
        else { source.type = wave; source.frequency.value = frequency; }
        filter.type = 'lowpass'; filter.frequency.value = cutoff; filter.Q.value = .4;
        gain.gain.value = 0; source.connect(filter); filter.connect(gain); gain.connect(this.channels[channel]);
        const record = this._track(source, [source, filter, gain], false);
        Object.assign(record, { gain, filter, name });
        this._loops.set(name, record); source.start(); this._ramp(gain.gain, volume, .6);
        return record;
    }

    _stopLoop(name, fade = .25) {
        const record = this._loops.get(name);
        if (!record) return;
        this._loops.delete(name); this._ramp(record.gain.gain, 0, fade);
        this._stopRecord(record, fade + (fade ? .03 : 0));
    }

    _region(engine) {
        if (engine.state.scene && engine.state.scene !== 'park') return 'interior';
        const p = engine.state.player;
        const pond = world.landmarks?.find(mark => mark.kind === 'pond');
        if (pond && Math.hypot(p.x - pond.x, p.y - pond.y) < 270) return 'water';
        const supplied = engine.getRegion?.() || engine.getMapRegion?.() || world.getRegionAt?.(p.x, p.y);
        if (supplied) {
            const id = String(supplied.id || supplied.kind || supplied.name || supplied).toLowerCase();
            if (/lake|water|pond/.test(id)) return 'water';
            if (/city|traffic|commercial|quarry/.test(id)) return 'traffic';
            if (/forest|pine|barrens|countryside|back roads/.test(id)) return 'forest';
            if (/sunnyvale|park/.test(id)) return 'park';
        }
        if (p.y > world.WORLD.height - 260) return 'traffic';
        if (p.y < 430 || p.x < 220 || p.x > world.WORLD.width - 180) return 'forest';
        return 'park';
    }

    update(engine, dt) {
        if (!this.unlocked || !engine?.state || this._disposed || !Number.isFinite(dt) || dt < 0) return;
        const hidden = !!globalThis.document?.hidden;
        const paused = !!engine.paused || hidden;
        if (paused !== this._paused || hidden !== this._hidden) {
            this._paused = paused; this._hidden = hidden;
            if (paused) {
                for (const name of [...this._loops.keys()]) this._stopLoop(name, 0);
                for (const voice of [...this._voices]) if (hidden || !voice.menuSound) this._stopRecord(voice, 0);
                if (!this._voices.size) {
                    try { this.context.suspend?.()?.catch?.(() => {}); } catch { /* browser may already be suspended */ }
                }
            } else {
                try { this.context.resume?.()?.catch?.(() => {}); } catch { /* next gesture can unlock again */ }
            }
        }
        if (paused || this.settings.muted) {
            this._previousPosition = null; this._stepDistance = 0;
            if (paused && this.context.state === 'running' && !this._voices.size) {
                try { this.context.suspend?.()?.catch?.(() => {}); } catch { /* already suspended */ }
            }
            return;
        }
        const seconds = Math.min(dt, .5), state = engine.state, inside = !!state.scene && state.scene !== 'park';
        const driving = !!state.vehicle?.driving && !inside;
        const region = this._region(engine);
        const wind = this._loop('wind', { noise: true, cutoff: 480, volume: .024 });
        this._ramp(wind.gain.gain, inside ? .002 : region === 'forest' ? .045 : .023, .4);
        this._ramp(wind.filter.frequency, inside ? 180 : region === 'forest' ? 700 : 420, .4);
        if (inside) {
            this._loop('room-hum', { frequency: 60, cutoff: 180, volume: .022 });
            this._stopLoop('water'); this._stopLoop('traffic');
        } else {
            this._stopLoop('room-hum');
            if (region === 'water') this._loop('water', { noise: true, cutoff: 1600, volume: .035 }); else this._stopLoop('water');
            if (['traffic', 'city', 'entrance'].includes(region)) this._loop('traffic', { noise: true, cutoff: 190, volume: .05 }); else this._stopLoop('traffic');
        }
        if (driving) {
            const rpm = clamp(Math.abs(state.vehicle.speed || 0) / 440, 0, 1);
            const motor = this._loop('engine', { frequency: 43, cutoff: 650, volume: .055, channel: 'sfx', wave: 'sawtooth' });
            this._ramp(motor.source.frequency, 43 + rpm * 95, .12);
            this._ramp(motor.filter.frequency, 350 + rpm * 1100, .14);
            this._ramp(motor.gain.gain, .045 + rpm * .065, .14);
            const road = this._loop('engine-road', { noise: true, cutoff: 600, volume: 0, channel: 'sfx' });
            this._ramp(road.gain.gain, .004 + rpm * .055, .2);
            this._ramp(road.filter.frequency, 260 + rpm * 1300, .2);
        } else { this._stopLoop('engine', .35); this._stopLoop('engine-road', .35); }
        const previous = this._previousPosition;
        const movement = previous && previous.scene === state.scene && !previous.driving ?
            Math.hypot(state.player.x - previous.x, state.player.y - previous.y) : 0;
        if (engine.moving && !driving && movement < 100) {
            this._stepDistance = (this._stepDistance || 0) + movement;
            if (this._stepDistance >= 58) { this.play('footstep', { inside }); this._stepDistance %= 58; }
        } else this._stepDistance = 0;
        this._previousPosition = { x: state.player.x, y: state.player.y, scene: state.scene, driving };
        if (!inside) {
            const night = state.minutes >= 1140 || state.minutes < 360;
            this._birdTimer -= seconds; this._dogTimer -= seconds; this._cricketTimer -= seconds;
            if (!night && this._birdTimer <= 0) { this.play('bird'); this._birdTimer = (region === 'forest' ? 4 : 9) + Math.random() * 9; }
            if (night && this._cricketTimer <= 0) { this.play('cricket'); this._cricketTimer = 1.4 + Math.random() * 1.8; }
            if (this._dogTimer <= 0) { this.play('dog'); this._dogTimer = 30 + Math.random() * 30; }
        }
        for (const fx of engine.encounter?.effects || []) {
            if (this._seenEffects.has(fx)) continue;
            this._seenEffects.add(fx);
            if (effectSounds[fx.kind]) this.play(effectSounds[fx.kind], fx);
        }
    }

    dispose() {
        if (this._disposed) return;
        this._disposed = true;
        for (const record of [...this._allSources]) this._stopRecord(record, 0);
        this._loops.clear(); this._voices.clear();
        for (const node of Object.values(this.channels || {})) node.disconnect?.();
        this.master?.disconnect?.();
        try { this.context?.close?.()?.catch?.(() => {}); } catch { /* already closed */ }
        this.unlocked = false; this.status = 'Sound stopped';
    }
}

export default ParkAudio;
