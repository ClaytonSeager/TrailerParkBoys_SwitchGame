import { GameEngine } from './gameEngine.js';
import { WorldRenderer } from './renderer.js';
import { WORLD, locations } from './story/locations.js';
import { characters } from './story/characters.js';
import { items } from './story/items.js';
import { quests } from './story/quests.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = value => `$${Math.floor(value).toLocaleString('en-US')}`;
const engine = new GameEngine();
const canvas = $('#world');
const renderer = new WorldRenderer(canvas, engine);
const keys = new Set();
const touchKeys = new Set();
let modalType = null;
let dialogue = null;
let locationDialogue = null;
let previousFocus = null;
let trackedQuest = null;
let lastTime = 0;
let hudTimer = 0;
let toastTimer;
let endingShown = !!engine.state.ending;
let saveWorks = engine.save();
const icons = {
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',
 journal:'<path d="M5 3h13a1 1 0 0 1 1 1v17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M5 17h14M8 7h7M8 11h5M6 3v14"/>',
 bag:'<path d="M5 8h14l2 12H3Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3M8 13h8M9 16h6"/>',
 map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>'
};
document.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[el.dataset.icon]}</svg>`);

function toast(text) {
 clearTimeout(toastTimer);
 $('#toast').textContent = text;
 $('#toast').hidden = false;
 toastTimer = setTimeout(() => $('#toast').hidden = true, 4500);
}

function openModal(type, html, className = '') {
 if (!modalType) previousFocus = document.activeElement;
 modalType = type;
 keys.clear(); touchKeys.clear(); engine.moving = false;
 $('#modal').className = `modal ${className}`;
 $('#modal-content').innerHTML = html;
 $('#modal-layer').hidden = false;
 $('#modal').focus({ preventScroll: true });
 document.querySelectorAll('.rail-button').forEach(el => el.classList.toggle('active', el.id === `${type}-button`));
}

function closeModal() {
 modalType = null; dialogue = null; locationDialogue = null;
 $('#modal-layer').hidden = true;
 document.querySelectorAll('.rail-button').forEach(el => el.classList.toggle('active', el.id === 'explore-button'));
 if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); else canvas.focus({ preventScroll: true });
 saveWorks = engine.save(); updateHUD();
}

function toggle(type, fn) { modalType === type ? closeModal() : fn(); }

function showWelcome() {
 openModal('welcome', `<span class="welcome-stamp">WELCOME TO THE NEIGHBOURHOOD</span><h1 id="modal-title">Small park.<br>Big friggin’ plans.</h1><p>Sunnyvale needs $1,500 for repairs. The boys have a few ideas. Most of them even sound legal.</p><div class="help-grid"><div><kbd>WASD</kbd> Wander the park</div><div><kbd>E</kbd> Meet the neighbours</div><div><kbd>I</kbd> Check your handbag</div><div><kbd>M</kbd> Find your way</div></div><p>Find <b>Bubbles, Ricky, or Julian</b> on the north side of the main road. Take a job, pick up useful junk, and see what happens.</p><button class="primary-button" data-action="start">Let’s go, bud. <span>↗</span></button><p class="keyboard-note">Click any menu with your mouse. Your progress saves in this browser.</p>`);
}

function showBag() {
 const state = engine.state;
 const inventory = Object.entries(state.inventory).filter(([,count]) => count > 0);
 const count = inventory.reduce((sum,[,n]) => sum + n, 0);
 openModal('bag', `<span class="bag-label">DEFINITELY NOT STOLEN™</span><h1 id="modal-title">The emotional baggage.</h1><p class="subtitle">It’s a handbag. It holds three shopping carts. Don’t question it.</p>
 <div class="bag-stats"><div class="bag-stat"><small>LOOSE CHANGE</small><b>${money(state.money)}</b><div class="bar"><i style="width:${Math.min(100,state.money/15)}%"></i></div></div><div class="bag-stat"><small>♥ HEALTH</small><b>${Math.round(state.health)}<small class="out-of">OUT OF 100</small></b><div class="bar"><i style="width:${state.health}%;background:#b87c63"></i></div></div><div class="bag-stat"><small>✦ MENTAL STATE</small><b>${Math.round(state.mentalState)}<small class="out-of">MOSTLY HOLDING IT TOGETHER</small></b><div class="bar"><i style="width:${state.mentalState}%"></i></div></div></div>
 <div class="bag-tabs"><b>WHAT’S IN THE BAG</b><span>${count} ITEM${count === 1 ? '' : 'S'} · ${Math.round(state.energy)}% HUSTLE LEFT</span></div><div class="bag-items">${inventory.map(([id,n]) => `<article class="bag-item"><span class="item-icon" style="color:${items[id].color}">${escape(items[id].icon)}</span><div><strong>${escape(items[id].name)}</strong><p>${escape(items[id].description)}</p><span class="item-count">× ${n} rattling around</span>${items[id].effect ? `<button data-action="eat" data-id="${id}">Eat it, bud.</button>` : ''}</div></article>`).join('')}</div>
 ${inventory.length ? '' : '<div class="empty-state" style="margin-top:16px">Just lint and questionable potential.<br>Walk over loose items around the park to fill it up.</div>'}<p class="bag-footer">“It’s not a purse. It’s a mobile business headquarters.”</p>`, 'bag-modal');
}

function questEntry(quest, complete = false) {
 const info = engine.getQuestProgress(quest.id);
 const giver = characters.find(c => c.id === quest.giver);
 const active = !!engine.state.activeQuests[quest.id];
 const step = info?.step;
 return `<article class="quest-entry ${complete ? 'complete' : ''}"><div class="eyebrow">${complete ? '✓ DONE & DUSTED' : escape(giver?.name.toUpperCase())}<span>+${money(quest.reward.money)}</span></div><h3>${escape(quest.title)}</h3><p>${escape(quest.description)}</p>${active && step ? `<div class="quest-step"><span class="step-check">${info.stepIndex+1}</span><span>${escape(step.text)} ${['collect','deliver'].includes(step.type) ? `<b>(${info.progress}/${info.count})</b>` : ''}</span></div><button class="secondary-button" style="margin-top:12px;padding:7px 11px;font-size:10px" data-action="track" data-id="${quest.id}">${trackedQuest === quest.id ? 'Following this scheme ✓' : 'Keep this in view ↗'}</button>` : !complete ? `<p class="quest-step">↗ Find ${escape(giver?.name)} to get started.</p>` : ''}</article>`;
}

function showJournal() {
 const active = quests.filter(q => engine.state.activeQuests[q.id]);
 const completed = quests.filter(q => engine.state.completedQuests.includes(q.id));
 const available = engine.getAvailableQuests();
 openModal('journal', `<div class="eyebrow">THE SUNNYVALE BUSINESS PLAN</div><h1 id="modal-title">Questionable schemes.</h1><p class="subtitle">A little elbow grease. A lot of walking around.</p><div class="quest-summary"><div><strong>${completed.length} / ${quests.length}</strong><small>JOBS SORTED</small></div><div><strong>${money(engine.state.money)}</strong><small>OF $1,500 NEEDED</small></div><div><strong>${engine.state.reputation}</strong><small>PARK REP</small></div></div><div class="rest-note">The big picture: earn $1,500 and complete at least 6 schemes to help save the park. Explore at your own pace.</div><div class="section-label">ON THE GO · ${active.length}</div><div class="quest-list">${active.map(q => questEntry(q)).join('') || '<div class="empty-state">No jobs, no problems. Except the park repairs.<br>Talk to anyone with a yellow ! to get a scheme going.</div>'}</div><div class="section-label">WORD AROUND THE PARK · ${available.length}</div><div class="quest-list">${available.map(q=>questEntry(q)).join('')}</div>${completed.length ? `<div class="section-label">DONE & DUSTED · ${completed.length}</div><div class="quest-list">${completed.map(q=>questEntry(q,true)).join('')}</div>` : ''}`);
}

function showMap() {
 openModal('map', `<div class="eyebrow">HOME SWEET TRAILER PARK</div><h1 id="modal-title">The lay of the land.</h1><p class="subtitle">North is up. Trouble’s everywhere.</p><canvas id="full-map" class="full-map" width="1000" height="708" aria-label="Map of Sunnyvale with buildings, residents, and your position"></canvas><div class="map-legend"><span><i class="you"></i>You, probably</span><span><i></i>Someone with a scheme</span><span><i class="quest"></i>Your next objective</span></div><p class="keyboard-note">Close the map with M or Escape. Walk with WASD or the arrow keys.</p>`, 'map-modal');
 renderer.drawMinimap($('#full-map'), true);
}

function showHelp() {
 openModal('help', `<div class="eyebrow">THE UNOFFICIAL ORIENTATION</div><h1 id="modal-title">Welcome to park life.</h1><p>Explore Sunnyvale, meet the residents, and help put together a fundraiser. Earn $1,500 and finish 6 schemes to keep the park going.</p><div class="help-grid"><div><kbd>WASD</kbd> Walk around</div><div><kbd>↑←↓→</kbd> Also walk around</div><div><kbd>SHIFT</kbd> Hustle a little</div><div><kbd>E</kbd> Talk & interact</div><div><kbd>I / B</kbd> The handbag</div><div><kbd>J</kbd> Your schemes</div><div><kbd>M</kbd> Park map</div><div><kbd>ESC</kbd> Close a menu</div></div><p>Walk over loose items to collect them. Talk to residents with a <b>yellow !</b> to take a job. A <b>blue diamond</b> marks a mission objective. Open the bag to eat a snack and restore your stats.</p><p>Doors have local information and useful actions. Rest at a trailer to start a fresh day. The repair shop offers odd jobs if you need more cash.</p><div class="button-row"><button class="primary-button" data-action="close">Got it, bud. ↗</button><button class="secondary-button" data-action="save">Save progress</button></div><p class="help-footnote">Progress stays in this browser. Clearing site data clears your save. This is an unofficial fan adventure with original pixel art and dialogue.</p><button class="danger-button" data-action="reset-confirm">Start a new game…</button>`);
}

function shopHTML() {
 return `<div class="section-label">HOT FOOD · COLD CASH</div>${['burger','pepperoni'].map(id => `<div class="shop-row"><span class="item-icon">${escape(items[id].icon)}</span><span>${escape(items[id].name)}<small style="display:block;font-size:9px;color:#7d896a;margin-top:5px">Restores health, mental state & energy</small></span><button class="primary-button" data-action="buy" data-id="${id}" ${engine.state.money < items[id].cost ? 'disabled' : ''}>${money(items[id].cost)}</button></div>`).join('')}`;
}

function showDialogue(result) {
 dialogue = result;
 const c = result.character;
 const offers = engine.getAvailableQuests(c.id);
 const active = quests.filter(q => q.giver === c.id && engine.state.activeQuests[q.id]);
 openModal('dialogue', `<div class="dialogue-heading"><canvas id="portrait" class="portrait" width="96" height="96"></canvas><div><div class="eyebrow">A FAMILIAR FACE</div><h1 id="modal-title">${escape(c.name)}</h1></div></div><div class="dialogue-text">“${escape(result.text)}”</div>${offers.map(q => `<article class="quest-offer"><div class="eyebrow">GOT A MINUTE, BUD?</div><h3>${escape(q.title)}</h3><p>${escape(q.description)}</p><button class="primary-button" data-action="accept" data-id="${q.id}">I’m in. ↗</button><span class="quest-reward">+${money(q.reward.money)} · +${q.reward.reputation || 0} REP</span></article>`).join('')}${active.map(q=>`<div class="quest-offer"><div class="eyebrow">OUR LITTLE BUSINESS VENTURE</div><h3>${escape(q.title)}</h3><p>${escape(engine.getQuestProgress(q.id)?.step?.text)}</p></div>`).join('')}${c.id === 'randy' ? shopHTML() : ''}${c.id === 'cory' ? `<div class="quest-offer"><h3>Got a little spare time?</h3><p>Sort parts for $35. Costs 15 energy and a little patience.</p><button class="primary-button" data-action="work">Do an odd job · +$35</button></div>` : ''}<div class="button-row"><button class="secondary-button" data-action="close">See you around.</button></div>`);
 renderer.drawPortrait($('#portrait'), c);
}

function showLocation(result) {
 locationDialogue = result;
 const loc = result.location;
 openModal('location', `<div class="eyebrow">AROUND THE NEIGHBOURHOOD</div><h1 id="modal-title">${escape(result.title)}</h1><p>${escape(result.text)}</p>${['burger','store'].includes(loc.id) ? shopHTML() : ''}${['ricky','julian','bubbles','sarah','jroc'].includes(loc.id) ? `<div class="rest-note">Catch a little shut-eye. Start the next morning with full health, mental state, and hustle.</div><div class="button-row"><button class="primary-button" data-action="rest">Call it a day. ☾</button></div>` : ''}${loc.id === 'garage' ? `<div class="quest-offer"><h3>A completely legitimate odd job.</h3><p>Sort parts for $35. Takes 45 minutes, 15 energy, and a little patience.</p><button class="primary-button" data-action="work">Make yourself useful · +$35</button></div>` : ''}<div class="button-row"><button class="secondary-button" data-action="close">Back to the park ↗</button></div>`);
}

function interact() {
 if (modalType) return;
 const result = engine.interact();
 if (result.type === 'dialogue') showDialogue(result);
 else if (result.type === 'location') showLocation(result);
 else toast(result.text);
 updateHUD();
}

function updateHUD() {
 const s = engine.state;
 $('#cash-value').textContent = money(s.money);
 $('#health-value').textContent = Math.round(s.health);
 $('#mental-value').textContent = Math.round(s.mentalState);
 $('#health-meter').style.width = `${s.health}%`;
 $('#mental-meter').style.width = `${s.mentalState}%`;
 const hour = Math.floor(s.minutes / 60), minute = Math.floor(s.minutes % 60);
 $('#clock').textContent = `DAY ${s.day} · ${hour % 12 || 12}:${String(minute).padStart(2,'0')} ${hour >= 12 ? 'PM' : 'AM'}`;
 const nearest = engine.nearestInteractable();
 $('#interaction-prompt').hidden = !nearest || !!modalType;
 if (nearest) $('#interaction-prompt span').textContent = nearest.type === 'character' ? `Talk to ${nearest.entity.name}` : nearest.type === 'pickup' ? `Pick up ${items[nearest.entity.item].name}` : `Check out ${nearest.entity.name}`;
 const closestArea = locations.reduce((a,b) => Math.hypot(s.player.x-a.door.x,s.player.y-a.door.y) < Math.hypot(s.player.x-b.door.x,s.player.y-b.door.y) ? a : b);
 $('#area-name').textContent = Math.hypot(s.player.x-closestArea.door.x,s.player.y-closestArea.door.y) < 230 ? closestArea.name.toUpperCase() : s.player.y > 1300 ? 'SUNNYVALE · SOUTH END' : 'SUNNYVALE · MAIN LANE';
 if (!s.activeQuests[trackedQuest]) trackedQuest = Object.keys(s.activeQuests)[0] || null;
 const progress = trackedQuest ? engine.getQuestProgress(trackedQuest) : null;
 $('.mission-card h2').textContent = s.ending ? 'The park’s still standing.' : progress?.quest.title || 'Keep the park alive.';
 $('#mission-objective').textContent = progress?.step?.text || (s.ending ? 'A job well done. Keep exploring—there’s always another scheme.' : 'Make $1,500 and finish 6 schemes. Start by finding the boys.');
 $('#mission-counter').textContent = `${s.completedQuests.length} / ${quests.length}`;
 $('#goal-meter').style.width = `${Math.min(100,s.money/15)}%`;
 $('#quest-dot').classList.toggle('on', Object.keys(s.activeQuests).length > 0);
 $('#save-state').textContent = saveWorks ? 'YOUR PROGRESS SAVES AUTOMATICALLY' : 'BROWSER STORAGE UNAVAILABLE · THIS SESSION ONLY';
 renderer.drawMinimap($('#minimap'));
}

$('#modal-close').addEventListener('click', closeModal);
$('#modal-layer').addEventListener('click', event => { if (event.target === $('#modal-layer')) closeModal(); });
$('#explore-button').addEventListener('click', closeModal);
$('#bag-button').addEventListener('click', () => toggle('bag', showBag));
$('#journal-button').addEventListener('click', () => toggle('journal', showJournal));
$('#map-button').addEventListener('click', () => toggle('map', showMap));
$('#minimap-button').addEventListener('click', () => toggle('map', showMap));
$('#help-button').addEventListener('click', () => toggle('help', showHelp));
$('#mission-open').addEventListener('click', showJournal);
$('#interact-click').addEventListener('click', interact);
$('#touch-interact').addEventListener('click', interact);

$('#modal-content').addEventListener('click', event => {
 const button = event.target.closest('[data-action]');
 if (!button) return;
 const {action,id} = button.dataset;
 if (action === 'close') closeModal();
 if (action === 'start') {
  try { localStorage.setItem('sunnyvale-welcome-seen', 'yes'); } catch { /* session still playable */ }
  closeModal(); toast('Go north to meet the boys. Yellow ! means someone’s got a scheme.');
 }
 if (action === 'eat') { engine.useItem(id); showBag(); updateHUD(); }
 if (action === 'accept' && engine.acceptQuest(id)) {
  trackedQuest = id;
  const q = quests.find(q=>q.id === id);
  const result = dialogue;
  showDialogue({...result,text:`Good stuff. ${engine.getQuestProgress(id)?.step?.text || q.steps[0].text} Come find me when you’re sorted.`});
  updateHUD();
 }
 if (action === 'track') { trackedQuest = id; closeModal(); toast('Keeping that scheme in view. Check the map for your next stop.'); }
 if (action === 'rest') { engine.rest(); closeModal(); }
 if (action === 'work') { engine.work(); closeModal(); }
 if (action === 'buy') {
  if (engine.buyItem(id)) {
   toast(`Check the bag for your snacks, bud. ${money(engine.state.money)} left.`);
   if (dialogue) showDialogue(dialogue); else if (locationDialogue) showLocation(locationDialogue);
  }
  updateHUD();
 }
 if (action === 'save') { saveWorks = engine.save(); toast(saveWorks ? 'Saved. Your bad decisions are in good hands.' : 'This browser blocked storage. Keep this tab open to continue.'); updateHUD(); }
 if (action === 'reset-confirm') openModal('reset', '<div class="eyebrow">A FRESH SET OF BAD IDEAS</div><h1 id="modal-title">Start over, bud?</h1><p>This replaces the Sunnyvale save in this browser. Your cash, items, and schemes will start from scratch.</p><div class="button-row"><button class="primary-button" data-action="reset">Yep. New game.</button><button class="secondary-button" data-action="close">Keep this adventure.</button></div>');
 if (action === 'reset') { engine.reset(); endingShown = false; trackedQuest = null; closeModal(); showWelcome(); }
});

document.addEventListener('keydown', event => {
 const key = event.key.toLowerCase();
 const movementKey = ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key);
 if ((!modalType && movementKey) || ['escape','e','i','b','m','j'].includes(key)) event.preventDefault();
 if (key === 'tab' && modalType) {
  const focusable = [...$('#modal').querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')];
  const first = focusable[0], last = focusable.at(-1);
  if (event.shiftKey && (document.activeElement === first || document.activeElement === $('#modal'))) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  return;
 }
 if (event.repeat && ['e','i','b','m','j','escape'].includes(key)) return;
 if (key === 'escape') { closeModal(); return; }
 if (key === 'i' || key === 'b') { toggle('bag', showBag); return; }
 if (key === 'j') { toggle('journal', showJournal); return; }
 if (key === 'm') { toggle('map', showMap); return; }
 if (modalType) return;
 if (key === 'e') { interact(); return; }
 keys.add(key);
});
document.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); touchKeys.clear(); engine.moving = false; engine.save(); });
document.addEventListener('visibilitychange', () => { keys.clear(); touchKeys.clear(); engine.moving = false; engine.save(); lastTime = 0; });
window.addEventListener('pagehide', () => engine.save());
window.addEventListener('resize', () => { renderer.resize(); if (modalType === 'map') renderer.drawMinimap($('#full-map'),true); });
document.querySelectorAll('[data-move]').forEach(button => {
 button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); touchKeys.add(button.dataset.move); });
 for (const name of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(name, () => touchKeys.delete(button.dataset.move));
});

function frame(time) {
 const dt = lastTime ? Math.min((time-lastTime)/1000, .05) : 0;
 lastTime = time;
 if (!modalType && !document.hidden) {
  const dx = Number(keys.has('d') || keys.has('arrowright') || touchKeys.has('right')) - Number(keys.has('a') || keys.has('arrowleft') || touchKeys.has('left'));
  const dy = Number(keys.has('s') || keys.has('arrowdown') || touchKeys.has('down')) - Number(keys.has('w') || keys.has('arrowup') || touchKeys.has('up'));
  engine.move(dx,dy,dt,keys.has('shift')); engine.update(dt);
 }
 renderer.draw(time, dt);
 hudTimer += dt;
 if (hudTimer > .15) { updateHUD(); hudTimer = 0; }
 const events = engine.events.splice(0);
 if (events.length) {
  const important = [...events].reverse().find(e=>['reward','ending','quest','warning'].includes(e.type)) || events.at(-1);
  toast(important.text); updateHUD();
 }
 if (engine.state.ending && !endingShown && !modalType) {
  endingShown = true;
  openModal('ending', `<span class="welcome-stamp">SUNNYVALE LOOKS AFTER ITS OWN</span><h1 id="modal-title">${escape(engine.state.ending.title)}</h1><p>${escape(engine.state.ending.text)}</p><div class="quest-summary"><div><strong>${money(engine.state.money)}</strong><small>RAISED IN THE PARK</small></div><div><strong>${engine.state.completedQuests.length}</strong><small>SCHEMES COMPLETED</small></div></div><button class="primary-button" data-action="close">There’s always another scheme. ↗</button>`);
 }
 requestAnimationFrame(frame);
}

renderer.resize();
updateHUD();
$('#loading').hidden = true;
let welcomed = false;
try { welcomed = localStorage.getItem('sunnyvale-welcome-seen') === 'yes'; } catch { /* no persistent storage */ }
if (!welcomed && !engine.state.collected.length && !engine.state.interactions) showWelcome();
requestAnimationFrame(frame);
