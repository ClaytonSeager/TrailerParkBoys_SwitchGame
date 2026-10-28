import { WORLD, locations } from './story/locations.js';
import { characters } from './story/characters.js';
import { items, pickups } from './story/items.js';
import { quests } from './story/quests.js';

export const SAVE_KEY = 'sunnyvale-open-world-v1';
const PLAYER_RADIUS = 13;
const START = { x: 1200, y: 620, facing: 'down' };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const byId = (list, id) => list.find(entry => entry.id === id);
const freshState = () => ({ version: 1, player: { ...START }, money: 80, reputation: 0,
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
    }

    emit(type, text) {
        const entry = { type, text, day: this.state.day, minutes: Math.floor(this.state.minutes) };
        this.events.push(entry);
        this.state.log.unshift(entry);
        this.state.log = this.state.log.slice(0, 40);
    }

    isBlocked(x, y) {
        return x < PLAYER_RADIUS || y < PLAYER_RADIUS || x > WORLD.width - PLAYER_RADIUS ||
            y > WORLD.height - PLAYER_RADIUS || locations.some(location =>
                x + PLAYER_RADIUS > location.x && x - PLAYER_RADIUS < location.x + location.w &&
                y + PLAYER_RADIUS > location.y && y - PLAYER_RADIUS < location.y + location.h);
    }

    move(dx, dy, dt, sprint = false) {
        if (![dx, dy, dt].every(Number.isFinite) || dt <= 0) return;
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
        if (this.saveTimer >= 5) { this.save(); this.saveTimer = 0; }
    }

    nearestInteractable() {
        const player = this.state.player;
        const candidates = [
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
        if (nearest.type === 'pickup') {
            const collected = this.collect(entity.id);
            return { type: 'pickup', title: items[entity.item].name, text: collected ? `Added to your handbag: ${items[entity.item].name}.` : 'You already picked that up.' };
        }
        if (nearest.type === 'location') {
            this.visit(entity.id);
            this.save();
            return { type: 'location', title: entity.name, text: entity.description, location: entity };
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
        if (!giver || distance(this.state.player, giver) > 110) return false;
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
        const shop = locations.find(location => ['burger', 'store'].includes(location.id) && distance(this.state.player, location.door) <= 100);
        const randy = byId(characters, 'randy');
        const nearRandy = randy && distance(this.state.player, randy) <= 110;
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
        const nearby = garage && distance(this.state.player, garage.door) <= 110 ||
            cory && distance(this.state.player, cory) <= 110;
        if (!nearby) { this.emit('info', 'Cory has odd jobs at the repair shop. Go see him for a little extra cash.'); return false; }
        if (this.state.energy < 15) { this.emit('warning', 'You need 15 energy for an odd job. Grab a snack or rest up first.'); return false; }
        this.state.energy = Math.max(0, this.state.energy - 15);
        this.state.mentalState = Math.max(0, this.state.mentalState - 4);
        this.state.health = Math.max(1, this.state.health - 2);
        this.state.money += 35;
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
        this.emit('info', 'Rested up. Another beautiful day for questionable business decisions.');
        this.save();
    }

    checkEnding() {
        if (!this.state.ending && this.state.money >= 1500 && this.state.completedQuests.length >= 6) {
            this.state.ending = { title: 'The park lives another day.', text: 'Fifteen hundred bucks, a few questionable schemes, and a whole park looking out for each other. Sunnyvale is staying put. Keep exploring—there is always another job.' };
            this.emit('ending', this.state.ending.title);
        }
    }

    serialize() { return JSON.stringify({ ...this.state, version: 1 }); }

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
            if (!parsed || parsed.version !== 1 || typeof parsed !== 'object') return false;
            const state = freshState();
            for (const stat of ['health', 'mentalState', 'energy']) state[stat] = clamp(finite(parsed[stat], state[stat]), 0, 100);
            state.money = clamp(finite(parsed.money, 80), 0, 10000000);
            state.reputation = clamp(finite(parsed.reputation, 0), 0, 100000);
            state.day = Math.floor(clamp(finite(parsed.day, 1), 1, 9999));
            state.minutes = clamp(finite(parsed.minutes, 480), 480, 1319.99);
            state.interactions = Math.floor(clamp(finite(parsed.interactions, 0), 0, 1000000));
            state.player.x = clamp(finite(parsed.player?.x, START.x), PLAYER_RADIUS, WORLD.width - PLAYER_RADIUS);
            state.player.y = clamp(finite(parsed.player?.y, START.y), PLAYER_RADIUS, WORLD.height - PLAYER_RADIUS);
            if (['up', 'down', 'left', 'right'].includes(parsed.player?.facing)) state.player.facing = parsed.player.facing;
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
            if (this.isBlocked(state.player.x, state.player.y)) state.player = { ...START };
            this.refreshQuests();
            this.checkEnding();
            return true;
        } catch { return false; }
    }

    reset() {
        this.state = freshState();
        this.events = [];
        this.saveTimer = 0;
        this.save();
    }
}

export default GameEngine;
