import * as worldData from './story/locations.js';
import { characters } from './story/characters.js';
import { items, pickups } from './story/items.js';
import { quests } from './story/quests.js';
import { interiors } from './story/interiors.js';
import * as encounters from './encounters.js';

export const SAVE_KEY = 'sunnyvale-open-world-v1';
const { WORLD, locations } = worldData;
const PLAYER_RADIUS = 13;
const START = worldData.PLAYER_START || { x: 725, y: 790, facing: 'down' };
const VEHICLE_START = worldData.VEHICLE_START || { x: 760, y: 855, angle: 0 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const byId = (list, id) => list.find(entry => entry.id === id);
const freshState = () => ({ version: 2, scene: 'park', outdoorPosition: null,
    player: { ...START }, vehicle: { id: 'shitmobile', ...VEHICLE_START, speed: 0, driving: false },
    xp: 0, level: 1, wins: 0, money: 80, reputation: 0,
    health: 100, mentalState: 100, energy: 100, day: 1, minutes: 480, inventory: {},
    activeQuests: {}, completedQuests: [], collected: [], visited: [], log: [], interactions: 0, ending: null });

/** Browser-independent simulation; app.js owns rendering and input. */
export class GameEngine {
    constructor(options = {}) {
        this.storage = options.storage;
        if (this.storage === undefined) {
            try { this.storage = globalThis.localStorage || null; } catch { this.storage = null; }
        }
        this.events = [];
        this.state = freshState();
        this.saveTimer = 0;
        this.moving = false;
        this.load();
        this.random = options.random || Math.random;
        encounters.initializeEncounters(this, this.random);
    }

    emit(type, text) {
        const entry = { type, text, day: this.state.day, minutes: Math.floor(this.state.minutes) };
        this.events.push(entry);
        this.state.log.unshift(entry);
        this.state.log = this.state.log.slice(0, 40);
    }

    getInterior() { return this.state.scene === 'park' ? null : interiors[this.state.scene] || null; }

    getWorldBounds() { return this.getInterior() || WORLD; }

    isBlocked(x, y, radius = PLAYER_RADIUS, scene = this.state.scene) {
        const room = scene === 'park' ? null : interiors[scene];
        const bounds = room || WORLD;
        const inset = room ? 32 : 0;
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < radius + inset || y < radius + inset ||
            x > bounds.width - radius - inset || y > bounds.height - radius - inset) return true;
        const obstacles = room ? room.furniture.filter(prop => prop.solid !== false) : locations;
        return obstacles.some(rect => x + radius > rect.x && x - radius < rect.x + rect.w &&
            y + radius > rect.y && y - radius < rect.y + rect.h);
    }

    findSafePosition(point, radius = PLAYER_RADIUS, scene = 'park') {
        if (!this.isBlocked(point.x, point.y, radius, scene)) return { x: point.x, y: point.y };
        for (const range of [35, 65, 100, 150]) for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const x = point.x + Math.cos(angle) * range, y = point.y + Math.sin(angle) * range;
            if (!this.isBlocked(x, y, radius, scene)) return { x, y };
        }
        return { x: START.x, y: START.y };
    }

    escapeEncounter() {
        if (!this.encounter) return;
        this.encounter = null;
        if (this._encounters) this._encounters.cooldown = Math.max(this._encounters.cooldown, 30);
        this.emit('info', 'You got clear of the commotion. No prize for that one—just a little peace.');
    }

    enterBuilding(id) {
        const building = byId(locations, id);
        const room = interiors[id];
        if (!building || !room || this.state.scene !== 'park' || this.state.vehicle.driving ||
            distance(this.state.player, building.door) > 90) return false;
        this.visit(id);
        this.escapeEncounter();
        this.state.outdoorPosition = { ...this.state.player };
        this.state.scene = id;
        this.state.player = { ...room.spawn, facing: 'up' };
        this.moving = false;
        this.emit('info', `Entered ${building.name}`);
        this.save();
        return true;
    }

    exitBuilding() {
        const room = this.getInterior();
        if (!room || distance(this.state.player, room.exit) > 90) return false;
        const building = byId(locations, this.state.scene);
        const point = this.findSafePosition(this.state.outdoorPosition || building.door);
        this.state.scene = 'park';
        this.state.player = { ...point, facing: 'down' };
        this.state.outdoorPosition = null;
        this.moving = false;
        this.emit('info', 'Back out in Sunnyvale.');
        this.save();
        return true;
    }

    toggleVehicle() {
        const vehicle = this.state.vehicle;
        if (this.state.scene !== 'park') return false;
        if (vehicle.driving) {
            for (const offset of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
                const angle = vehicle.angle + offset;
                const point = { x: vehicle.x + Math.cos(angle) * 62, y: vehicle.y + Math.sin(angle) * 62 };
                if (!this.isBlocked(point.x, point.y)) {
                    vehicle.driving = false;
                    vehicle.speed = 0;
                    this.state.player = { ...point, facing: 'down' };
                    this.emit('info', 'Parked the Shitmobile. Somehow, it still runs.');
                    this.save();
                    return true;
                }
            }
            this.emit('warning', 'No room to get out here. Pull into an open spot.');
            return false;
        }
        if (distance(this.state.player, vehicle) > 90) return false;
        this.escapeEncounter();
        vehicle.driving = true;
        vehicle.speed = 0;
        this.state.player.x = vehicle.x;
        this.state.player.y = vehicle.y;
        this.emit('info', 'The Shitmobile is yours. W/S gas and reverse, A/D steer, E to get out.');
        this.save();
        return true;
    }

    vehicleBlocked(x, y, angle = this.state.vehicle.angle) {
        // The 96 × 44 body needs a long footprint, including its front corners.
        return [-27, 0, 27].some(offset => this.isBlocked(
            x + Math.cos(angle) * offset, y + Math.sin(angle) * offset, 22, 'park'));
    }

    drive(dx, dy, seconds) {
        const car = this.state.vehicle;
        const throttle = -clamp(dy, -1, 1);
        if (throttle) car.speed = clamp(car.speed + throttle * 230 * seconds, -180, 440);
        else car.speed = Math.sign(car.speed) * Math.max(0, Math.abs(car.speed) - seconds * 140);
        if (Math.abs(car.speed) > 3) {
            const steering = car.angle + clamp(dx, -1, 1) * 2.1 * seconds *
                Math.min(1, Math.abs(car.speed) / 120) * (car.speed < 0 ? -1 : 1);
            if (!this.vehicleBlocked(car.x, car.y, steering)) car.angle = steering;
        }
        car.angle = Math.atan2(Math.sin(car.angle), Math.cos(car.angle));
        const travel = car.speed * seconds;
        const steps = Math.max(1, Math.ceil(Math.abs(travel) / 7));
        for (let index = 0; index < steps; index += 1) {
            const x = car.x + Math.cos(car.angle) * travel / steps;
            const y = car.y + Math.sin(car.angle) * travel / steps;
            if (this.vehicleBlocked(x, y, car.angle)) {
                const impact = Math.abs(car.speed);
                car.speed = 0;
                if (impact > 120) this.damage(Math.min(8, impact / 65), 2, 'The Shitmobile hit something solid.');
                break;
            }
            car.x = x; car.y = y;
        }
        this.moving = Math.abs(car.speed) > 3;
        this.vehicleMoving = this.moving;
        if (car.driving) { this.state.player.x = car.x; this.state.player.y = car.y; }
    }

    move(dx, dy, dt, sprint = false) {
        if (![dx, dy, dt].every(Number.isFinite) || dt <= 0) return;
        if (this.state.vehicle.driving) { this.drive(dx, dy, clamp(dt, 0, 0.25)); return; }
        const magnitude = Math.hypot(dx, dy);
        this.moving = magnitude > 0;
        if (!magnitude) return;
        const seconds = clamp(dt, 0, 0.25);
        const running = sprint && this.state.energy > 5;
        const amount = (running ? 285 : 180) * seconds;
        const steps = Math.max(1, Math.ceil(amount / (PLAYER_RADIUS / 2)));
        const vx = dx / magnitude * amount / steps;
        const vy = dy / magnitude * amount / steps;
        const player = this.state.player;
        player.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        for (let index = 0; index < steps; index += 1) {
            if (!this.isBlocked(player.x + vx, player.y)) player.x += vx;
            if (!this.isBlocked(player.x, player.y + vy)) player.y += vy;
        }
        this.state.energy = clamp(this.state.energy - seconds * (running ? 1.8 : 0.08), 0, 100);
        if (this.state.mentalState > 10) this.state.mentalState = Math.max(10,
            this.state.mentalState - seconds * (running ? 0.06 : 0.015));
        if (this.state.scene !== 'park') return;
        for (const location of locations) {
            if (distance(player, location.door) < 65) this.visit(location.id);
        }
        for (const pickup of pickups) {
            if (!this.state.collected.includes(pickup.id) && distance(player, pickup) < 26) this.collect(pickup.id);
        }
    }

    update(dt) {
        if (!Number.isFinite(dt) || dt <= 0) return;
        const seconds = clamp(dt, 0, 0.25);
        this.state.minutes += seconds;
        // A gentle hunger meter after breakfast; nobody dies while exploring.
        if (this.state.minutes >= 600 && this.state.health > 15) {
            this.state.health = Math.max(15, this.state.health - seconds / 30);
        }
        this.saveTimer += seconds;
        if (this.state.minutes >= 1320) this.rest();
        if (this.state.scene === 'park' && !this.state.vehicle.driving) encounters.updateEncounters(this, seconds);
        if (this.saveTimer >= 5) { this.save(); this.saveTimer = 0; }
    }

    nearestInteractable() {
        const player = this.state.player;
        if (this.state.vehicle.driving) return { type: 'vehicle', entity: { ...this.state.vehicle, name: 'Park the Shitmobile' }, distance: 0 };
        const room = this.getInterior();
        if (room) {
            const candidates = [{ type: 'exit', entity: { ...room.exit, name: 'Back to Sunnyvale' }, distance: distance(player, room.exit) },
                ...room.furniture.map(entity => ({ type: 'furniture', entity, distance: Math.hypot(
                    player.x - clamp(player.x, entity.x, entity.x + entity.w),
                    player.y - clamp(player.y, entity.y, entity.y + entity.h)) }))];
            return candidates.filter(entry => entry.distance <= 75).sort((a, b) => a.distance - b.distance)[0] || null;
        }
        const candidates = [
            { type: 'vehicle', entity: { ...this.state.vehicle, name: "Ricky's Shitmobile" }, distance: distance(player, this.state.vehicle) },
            ...characters.map(entity => ({ type: 'character', entity, distance: distance(player, entity) })),
            ...locations.map(entity => ({ type: 'location', entity, distance: distance(player, entity.door) })),
            ...pickups.filter(entity => !this.state.collected.includes(entity.id))
                .map(entity => ({ type: 'pickup', entity, distance: distance(player, entity) }))
        ].filter(entry => entry.distance <= 85);
        return candidates.sort((a, b) => (a.distance - (a.type === 'character' ? 20 : 0)) -
            (b.distance - (b.type === 'character' ? 20 : 0)))[0] || null;
    }

    interact() {
        const nearest = this.nearestInteractable();
        if (!nearest) return { type: 'notice', title: 'Take a look around', text: 'Walk up to a resident, a trailer door, or something on the ground and press E.' };
        const entity = nearest.entity;
        if (nearest.type === 'vehicle') {
            const success = this.toggleVehicle();
            return { type: success ? 'transition' : 'notice', title: 'The Shitmobile', text: success ?
                (this.state.vehicle.driving ? 'W/S gas and reverse · A/D steer · E get out' : 'Back on foot.') : 'Find an open place to park.' };
        }
        if (nearest.type === 'exit') {
            this.exitBuilding();
            return { type: 'transition', title: 'Sunnyvale', text: 'Back out in the park.' };
        }
        if (nearest.type === 'furniture') return { type: 'interior', title: entity.label, text: entity.text, furniture: entity };
        if (nearest.type === 'pickup') {
            const collected = this.collect(entity.id);
            return { type: 'pickup', title: items[entity.item].name, text: collected ? `Added to your handbag: ${items[entity.item].name}.` : 'You already picked that up.' };
        }
        if (nearest.type === 'location') {
            const success = this.enterBuilding(entity.id);
            return { type: success ? 'transition' : 'notice', title: entity.name, text: success ? 'Step inside. Walk up to the furnishings to take a look around.' : 'Get a little closer to the door first.', location: entity };
        }

        this.refreshQuests();
        const completedBefore = new Set(this.state.completedQuests);
        let questText = '';
        for (const [questId, active] of Object.entries(this.state.activeQuests)) {
            const quest = byId(quests, questId);
            const step = quest.steps[active.step];
            if (!step || step.target !== entity.id) continue;
            if (step.type === 'talk') {
                questText = step.dialogue || step.text;
                this.advanceQuest(questId);
            } else if (step.type === 'deliver') {
                const count = step.count || 1;
                if ((this.state.inventory[step.item] || 0) >= count) {
                    this.state.inventory[step.item] -= count;
                    if (!this.state.inventory[step.item]) delete this.state.inventory[step.item];
                    questText = step.dialogue || `That's the ${items[step.item]?.name || 'stuff'} sorted. Good work, bud.`;
                    this.advanceQuest(questId);
                } else questText = `Still need ${count} ${items[step.item]?.name || step.item}. ${step.text}`;
            }
        }
        this.refreshQuests();
        const justCompleted = this.state.completedQuests.filter(id => !completedBefore.has(id));
        if (justCompleted.length) questText = byId(quests, justCompleted[justCompleted.length - 1]).completion;
        const availableQuests = this.getAvailableQuests(entity.id);
        const dialogue = entity.dialogue || ['Good to see you around the park.'];
        const text = questText || dialogue[this.state.interactions % dialogue.length];
        this.state.interactions += 1;
        this.save();
        return { type: 'dialogue', title: entity.name, text, character: entity, quest: availableQuests[0] || null,
            availableQuests, completedQuests: justCompleted };
    }

    getAvailableQuests(characterId) {
        return quests.filter(quest => (!characterId || quest.giver === characterId) &&
            !this.state.activeQuests[quest.id] && !this.state.completedQuests.includes(quest.id) &&
            (quest.requires || []).every(id => this.state.completedQuests.includes(id)));
    }

    acceptQuest(id) {
        const quest = this.getAvailableQuests().find(entry => entry.id === id);
        if (!quest) return false;
        const giver = byId(characters, quest.giver);
        if (this.state.scene !== 'park' || this.state.vehicle.driving || !giver || distance(this.state.player, giver) > 110) return false;
        this.state.activeQuests[id] = { step: 0, progress: 0 };
        this.emit('quest', `New scheme: ${quest.title}`);
        this.refreshQuests();
        this.save();
        return true;
    }

    getQuestProgress(id) {
        const quest = byId(quests, id);
        if (!quest) return null;
        const complete = this.state.completedQuests.includes(id);
        const active = this.state.activeQuests[id];
        const stepIndex = complete ? quest.steps.length : active?.step ?? 0;
        const step = quest.steps[stepIndex] || null;
        let progress = active?.progress || 0;
        if (step?.type === 'collect') progress = Math.min(this.state.inventory[step.target] || 0, step.count || 1);
        if (step?.type === 'deliver') progress = Math.min(this.state.inventory[step.item] || 0, step.count || 1);
        return { quest, step, stepIndex, progress, count: step?.count || 1, complete, active: !!active };
    }

    advanceQuest(id) {
        const active = this.state.activeQuests[id];
        const quest = byId(quests, id);
        if (!active || !quest) return;
        active.step += 1;
        active.progress = 0;
        if (active.step < quest.steps.length) { this.emit('quest', quest.steps[active.step].text); return; }
        delete this.state.activeQuests[id];
        if (this.state.completedQuests.includes(id)) return;
        this.state.completedQuests.push(id);
        this.gainXP(40);
        this.state.money += Math.max(0, finite(quest.reward?.money, 0));
        this.state.reputation += Math.max(0, finite(quest.reward?.reputation, 0));
        this.state.mentalState = clamp(this.state.mentalState + 5, 0, 100);
        this.emit('reward', `${quest.title} complete! +$${quest.reward?.money || 0}${quest.reward?.reputation ? ` · +${quest.reward.reputation} park rep` : ''}`);
        this.checkEnding();
    }

    refreshQuests() {
        for (const id of Object.keys(this.state.activeQuests)) {
            let canAdvance = true;
            while (this.state.activeQuests[id] && canAdvance) {
                const quest = byId(quests, id);
                const active = this.state.activeQuests[id];
                const step = quest.steps[active.step];
                canAdvance = step?.type === 'collect' && (this.state.inventory[step.target] || 0) >= (step.count || 1) ||
                    step?.type === 'visit' && this.state.visited.includes(step.target);
                if (canAdvance) this.advanceQuest(id);
            }
        }
    }

    collect(id) {
        if (this.state.scene !== 'park' || this.state.vehicle.driving) return false;
        const pickup = byId(pickups, id);
        if (!pickup || this.state.collected.includes(id) || !items[pickup.item]) return false;
        if (distance(this.state.player, pickup) > 85) return false;
        this.state.collected.push(id);
        this.state.inventory[pickup.item] = (this.state.inventory[pickup.item] || 0) + 1;
        this.emit('info', `Picked up ${items[pickup.item].name}`);
        this.refreshQuests();
        this.save();
        return true;
    }

    visit(id) {
        if (this.state.scene !== 'park') return false;
        const location = byId(locations, id);
        if (!location || distance(this.state.player, location.door) > 85) return false;
        if (!this.state.visited.includes(id)) {
            this.state.visited.push(id);
            this.emit('info', `Discovered ${location.name}`);
            this.refreshQuests();
            this.save();
        }
        return true;
    }

    useItem(id) {
        const item = items[id];
        if (!item?.effect || !(this.state.inventory[id] > 0)) return false;
        const stats = ['health', 'mentalState', 'energy'];
        const improves = stats.some(stat => item.effect[stat] > 0 && this.state[stat] < 100);
        if (!improves) { this.emit('info', 'You are already feeling good. Save that snack for later.'); return false; }
        this.state.inventory[id] -= 1;
        if (!this.state.inventory[id]) delete this.state.inventory[id];
        for (const stat of stats) this.state[stat] = clamp(this.state[stat] + finite(item.effect[stat], 0), 0, 100);
        this.emit('info', `Used ${item.name}. Feeling better already.`);
        this.save();
        return true;
    }

    buyItem(id) {
        const item = items[id];
        const cost = item?.cost ?? item?.price;
        if (!Number.isFinite(cost) || cost <= 0) return false;
        const shop = ['burger', 'store'].includes(this.state.scene) || this.state.scene === 'park' && locations.find(location => ['burger', 'store'].includes(location.id) && distance(this.state.player, location.door) <= 100);
        const randy = byId(characters, 'randy');
        const nearRandy = this.state.scene === 'park' && randy && distance(this.state.player, randy) <= 110;
        if (!shop && !nearRandy) { this.emit('info', 'Walk up to the shop or burger stand to buy supplies.'); return false; }
        if (this.state.money < cost) { this.emit('warning', 'Not enough cash, bud. Finish a scheme first.'); return false; }
        this.state.money -= cost;
        this.state.inventory[id] = (this.state.inventory[id] || 0) + 1;
        this.emit('info', `Bought ${item.name} for $${cost}`);
        this.refreshQuests();
        this.save();
        return true;
    }

    work() {
        const garage = byId(locations, 'garage');
        const cory = byId(characters, 'cory');
        const nearby = this.state.scene === 'garage' || this.state.scene === 'park' &&
            (garage && distance(this.state.player, garage.door) <= 110 || cory && distance(this.state.player, cory) <= 110);
        if (!nearby) { this.emit('info', 'Cory has odd jobs at the repair shop. Go see him for a little extra cash.'); return false; }
        if (this.state.energy < 15) { this.emit('warning', 'You need 15 energy for an odd job. Grab a snack or rest up first.'); return false; }
        this.state.energy = Math.max(0, this.state.energy - 15);
        this.state.mentalState = Math.max(0, this.state.mentalState - 4);
        this.state.health = Math.max(1, this.state.health - 2);
        this.state.money += 35;
        this.gainXP(8);
        this.state.minutes += 45;
        this.emit('reward', 'Odd job done! +$35. Cory paid you to sort the parts he just finished unsorting.');
        this.checkEnding();
        if (this.state.minutes >= 1320) this.rest();
        this.save();
        return true;
    }

    rest() {
        this.state.day += 1;
        this.state.minutes = 480;
        this.state.health = 100;
        this.state.mentalState = 100;
        this.state.energy = 100;
        this.state.player = { ...START };
        this.state.scene = 'park';
        this.state.outdoorPosition = null;
        this.state.vehicle.driving = false;
        this.state.vehicle.speed = 0;
        this.encounter = null;
        this.emit('info', 'Rested up. Another beautiful day for questionable business decisions.');
        this.save();
    }

    checkEnding() {
        if (!this.state.ending && this.state.money >= 1500 && this.state.completedQuests.length >= 6) {
            this.state.ending = { title: 'The park lives another day.', text: 'Fifteen hundred bucks, a few questionable schemes, and a whole park looking out for each other. Sunnyvale is staying put. Keep exploring—there is always another job.' };
            this.emit('ending', this.state.ending.title);
        }
    }

    damage(health, mental = 0, source = '') {
        const physical = Math.max(0, finite(health, 0));
        const stress = Math.max(0, finite(mental, 0));
        this.state.health = clamp(this.state.health - physical, 0, 100);
        this.state.mentalState = clamp(this.state.mentalState - stress, 0, 100);
        if (physical || stress) this.emit('damage', source || 'That hurt. Take a breather or grab a snack.');
        if (this.state.health <= 0) {
            const penalty = Math.min(25, this.state.money);
            this.state.money -= penalty;
            this.state.health = 65;
            this.state.mentalState = Math.max(35, this.state.mentalState);
            this.state.energy = Math.max(40, this.state.energy);
            this.state.scene = 'park';
            this.state.outdoorPosition = null;
            this.state.player = { ...START };
            this.state.vehicle.driving = false;
            this.state.vehicle.speed = 0;
            this.encounter = null;
            this.emit('warning', `The boys got you back on your feet. Lost $${penalty} in the commotion. Your schemes and gear are safe.`);
            this.save();
        }
        return this.state.health;
    }

    gainXP(amount) {
        const earned = Math.max(0, Math.floor(finite(amount, 0)));
        const oldLevel = this.state.level;
        this.state.xp = Math.min(10000000, this.state.xp + earned);
        this.state.level = 1 + Math.floor(this.state.xp / 100);
        if (this.state.level > oldLevel) this.emit('reward', `Level ${this.state.level}! You are getting the hang of Sunnyvale.`);
        return earned;
    }

    startEncounter(type, options) { return encounters.startEncounter(this, type, options); }
    chooseEncounter(id) { return encounters.chooseEncounter(this, id); }
    combatAction(action) { return encounters.combatAction(this, action); }

    serialize() { return JSON.stringify({ ...this.state, version: 2 }); }

    save() {
        if (!this.storage) return false;
        try { this.storage.setItem(SAVE_KEY, this.serialize()); return true; }
        catch { return false; }
    }

    load() {
        try {
            const raw = this.storage?.getItem(SAVE_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            if (!parsed || ![1, 2].includes(parsed.version) || typeof parsed !== 'object') return false;
            const state = freshState();
            for (const stat of ['health', 'mentalState', 'energy']) state[stat] = clamp(finite(parsed[stat], state[stat]), 0, 100);
            state.money = clamp(finite(parsed.money, 80), 0, 10000000);
            state.reputation = clamp(finite(parsed.reputation, 0), 0, 100000);
            state.day = Math.floor(clamp(finite(parsed.day, 1), 1, 9999));
            state.minutes = clamp(finite(parsed.minutes, 480), 480, 1319.99);
            state.interactions = Math.floor(clamp(finite(parsed.interactions, 0), 0, 1000000));
            state.xp = Math.floor(clamp(finite(parsed.xp, 0), 0, 10000000));
            state.level = 1 + Math.floor(state.xp / 100);
            state.wins = Math.floor(clamp(finite(parsed.wins, 0), 0, 1000000));
            if (parsed.version === 2) {
                state.scene = interiors[parsed.scene] ? parsed.scene : 'park';
                const bounds = state.scene === 'park' ? WORLD : interiors[state.scene];
                state.player.x = clamp(finite(parsed.player?.x, START.x), PLAYER_RADIUS, bounds.width - PLAYER_RADIUS);
                state.player.y = clamp(finite(parsed.player?.y, START.y), PLAYER_RADIUS, bounds.height - PLAYER_RADIUS);
                if (['up', 'down', 'left', 'right'].includes(parsed.player?.facing)) state.player.facing = parsed.player.facing;
                if (state.scene !== 'park') {
                    const door = byId(locations, state.scene).door;
                    state.outdoorPosition = { x: clamp(finite(parsed.outdoorPosition?.x, door.x), PLAYER_RADIUS, WORLD.width - PLAYER_RADIUS),
                        y: clamp(finite(parsed.outdoorPosition?.y, door.y), PLAYER_RADIUS, WORLD.height - PLAYER_RADIUS) };
                }
                state.vehicle.x = clamp(finite(parsed.vehicle?.x, VEHICLE_START.x), 30, WORLD.width - 30);
                state.vehicle.y = clamp(finite(parsed.vehicle?.y, VEHICLE_START.y), 30, WORLD.height - 30);
                state.vehicle.angle = finite(parsed.vehicle?.angle, VEHICLE_START.angle);
                state.vehicle.driving = state.scene === 'park' && parsed.vehicle?.driving === true;
            }
            for (const [key, ids] of [['completedQuests', quests], ['collected', pickups], ['visited', locations]]) {
                state[key] = [...new Set(Array.isArray(parsed[key]) ? parsed[key].filter(id => ids.some(entry => entry.id === id)) : [])];
            }
            if (parsed.inventory && typeof parsed.inventory === 'object') for (const id of Object.keys(items)) {
                const count = Math.floor(clamp(finite(parsed.inventory[id], 0), 0, 999));
                if (count) state.inventory[id] = count;
            }
            if (parsed.activeQuests && typeof parsed.activeQuests === 'object') for (const quest of quests) {
                const entry = parsed.activeQuests[quest.id];
                if (entry && !state.completedQuests.includes(quest.id) && Number.isInteger(entry.step) && entry.step >= 0 && entry.step < quest.steps.length) {
                    state.activeQuests[quest.id] = { step: entry.step, progress: 0 };
                }
            }
            state.log = Array.isArray(parsed.log) ? parsed.log.filter(entry => entry && typeof entry.text === 'string')
                .slice(0, 40).map(entry => ({ type: typeof entry.type === 'string' ? entry.type : 'info', text: entry.text.slice(0, 600), day: finite(entry.day, 1), minutes: finite(entry.minutes, 480) })) : [];
            if (parsed.ending && state.money >= 1500 && state.completedQuests.length >= 6) state.ending = { title: 'The park lives another day.', text: 'Sunnyvale is staying put. Keep exploring—there is always another job.' };
            this.state = state;
            if (this.vehicleBlocked(state.vehicle.x, state.vehicle.y, state.vehicle.angle)) state.vehicle = { id: 'shitmobile', ...VEHICLE_START, speed: 0, driving: false };
            if (state.vehicle.driving) { state.player.x = state.vehicle.x; state.player.y = state.vehicle.y; }
            else if (this.isBlocked(state.player.x, state.player.y)) state.player = { ...(this.getInterior()?.spawn || START), facing: 'down' };
            this.refreshQuests();
            this.checkEnding();
            return true;
        } catch { return false; }
    }

    reset() {
        this.state = freshState();
        this.events = [];
        this.saveTimer = 0;
        this.encounter = null;
        encounters.initializeEncounters(this, this.random || Math.random);
        this.save();
    }
}

export default GameEngine;
