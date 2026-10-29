import { GameEngine } from './gameEngine.js';
import { WorldRenderer } from './renderer.js';
import { ParkAudio } from './audio.js';
import { WORLD, locations, getRegionAt } from './story/locations.js';
import { characters } from './story/characters.js';
import { items, pickups } from './story/items.js';
import { quests } from './story/quests.js';

const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money = value => `$${Math.floor(value).toLocaleString('en-US')}`;
export const engine = new GameEngine();
const audio = new ParkAudio();
const canvas = $('#world');
const renderer = new WorldRenderer(canvas, engine);
try {
 const savedZoom = Number(localStorage.getItem('sunnyvale-camera-zoom'));
 if (savedZoom >= .8 && savedZoom <= 2.6) renderer.setZoom(savedZoom);
} catch { /* camera controls still work without browser storage */ }
const keys = new Set();
const touchKeys = new Set();
let modalType = null;
let dialogue = null;
let locationDialogue = null;
let previousFocus = null;
let trackedQuest = null;
let trackedResident = null;
let trackedPlace = null;
let lastTime = 0;
let hudTimer = 0;
let toastTimer;
let damageTimer;
let encounterChoiceSignature = '';
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
 engine.paused = true;
 keys.clear(); touchKeys.clear(); engine.moving = false;
 $('#modal').className = `modal ${className}`;
 $('#modal-content').innerHTML = html;
 $('#modal-layer').hidden = false;
 $('#modal').focus({ preventScroll: true });
 document.querySelectorAll('.rail-button').forEach(el => el.classList.toggle('active', el.id === `${type}-button`));
}

function closeModal() {
 modalType = null; dialogue = null; locationDialogue = null;
 engine.paused = document.hidden;
 $('#modal-layer').hidden = true;
 document.querySelectorAll('.rail-button').forEach(el => el.classList.toggle('active', el.id === 'explore-button'));
 if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); else canvas.focus({ preventScroll: true });
 saveWorks = engine.save(); updateHUD();
}

function toggle(type, fn) { modalType === type ? closeModal() : fn(); }

function residentStatus(id) {
 const status = engine.getResidentStatus?.(id);
 const resident = status?.resident || engine.findResident?.(id) || characters.find(c=>c.id===id);
 return {...status,resident,label:status?.label || resident?.activity || 'Around the neighbourhood'};
}

function directoryHTML() {
 return `<div class="section-label">WHO’S AROUND · LIVE PARK DIRECTORY</div><div class="resident-directory">${characters.map(c=>{
  const status=residentStatus(c.id);
  return `<article><span class="resident-dot" style="background:${c.shirt}"></span><div><strong>${escape(c.name)}</strong><small>${escape(status.label)}</small></div><button data-action="find-resident" data-id="${c.id}">Find ↗</button></article>`;
 }).join('')}</div>`;
}

function trackedTarget() {
 const quest = trackedQuest && engine.getQuestProgress(trackedQuest);
 const step = quest?.step;
 const residentId = trackedResident || (step && ['talk','deliver'].includes(step.type) ? step.target : null);
 let target;
 if (trackedPlace) {
  const place=locations.find(l=>l.id===trackedPlace);
  if (place) target={...place.door,scene:'park',label:place.name,detail:place.description};
 } else if (residentId) {
  const status=residentStatus(residentId),person=status.resident;
  if (person) {
   const scene=person.scene || 'park';
   if (scene === engine.state.scene) target={x:person.x,y:person.y,scene,label:person.name,detail:status.label};
   else if (scene === 'shitmobile') target={...engine.state.vehicle,scene:'park',label:person.name,detail:'At the Shitmobile'};
   else {
    const door=locations.find(l=>l.id===scene)?.door;
    target=door ? {...door,scene:'park',label:person.name,detail:status.label} : {x:person.x,y:person.y,scene,label:person.name,detail:status.label};
   }
  }
 } else if (step?.type === 'visit') {
  const place=locations.find(l=>l.id===step.target);
  if (place) target={...place.door,scene:'park',label:place.name};
 } else if (step?.type === 'collect') {
  const origin=engine.state.outdoorPosition || engine.state.player;
  const candidates=pickups.filter(p=>p.item===step.target&&!engine.state.collected.includes(p.id)).sort((a,b)=>Math.hypot(a.x-origin.x,a.y-origin.y)-Math.hypot(b.x-origin.x,b.y-origin.y));
  if (candidates[0]) target={...candidates[0],scene:'park',label:items[step.target].name};
 }
 if (target && engine.state.scene !== 'park' && target.scene !== engine.state.scene) {
  const exit=engine.getInterior()?.exit;
  if (exit) target={...exit,scene:engine.state.scene,label:`Exit to find ${target.label}`,detail:target.detail};
 }
 engine.trackedTarget=target || null;
 return target;
}

function showSound() {
 const settings=audio.getSettings();
 openModal('sound', `<div class="eyebrow">THE SOUND OF QUESTIONABLE DECISIONS</div><h1 id="modal-title">A little park atmosphere.</h1><p>Gravel underfoot, birds in the trees, a rough-running engine, and the occasional bottle arriving uninvited.</p><div class="audio-status" id="audio-status">${escape(audio.status)}</div><div class="sound-sliders">${[['master','MASTER VOLUME'],['ambience','WIND, WILDLIFE & THE NEIGHBOURHOOD'],['sfx','FOOTSTEPS, ENGINE & SOUND EFFECTS']].map(([id,label])=>`<label><span>${label}<output id="volume-${id}">${Math.round(settings[id]*100)}%</output></span><input aria-label="${label}" type="range" min="0" max="100" value="${Math.round(settings[id]*100)}" data-volume="${id}"></label>`).join('')}</div><div class="button-row"><button class="primary-button" data-action="toggle-sound">${settings.muted?'Turn sound on ♫':'Mute the park'}</button><button class="secondary-button" data-action="sound-preview">Try a sound ♫</button></div><p class="keyboard-note">V toggles mute. H honks the Shitmobile’s horn. Your volume preferences save in this browser.</p><p class="help-footnote">Original synthesized ambience and effects. Sound starts after your first click or key press.</p>`);
}

async function unlockAudio() {
 await audio.unlock();
 $('#sound-label').textContent=audio.getSettings().muted?'MUTED':audio.unlocked?'SOUND ON':'ENABLE SOUND';
}

function showWelcome() {
 openModal('welcome', `<span class="welcome-stamp">PARK LIFE, WITH A LITTLE MORE LIFE</span><h1 id="modal-title">The park doesn’t<br>stand still.</h1><p>The neighbours have errands, the car has places to be, and somewhere out there is a city that definitely hasn’t heard about your latest scheme.</p><div class="help-grid"><div><kbd>WASD</kbd> Walk / drive</div><div><kbd>E</kbd> Talk / enter / exit</div><div><kbd>H</kbd> Honk the Shitmobile</div><div><kbd>M</kbd> World map & directory</div><div><kbd>I</kbd> Your stupid handbag</div><div><kbd>V</kbd> Sound on / off</div></div><p><b>Ricky lives in his Shitmobile, in his yard.</b> Walk up to the car and press E. The south entrance leads to the forest highway, the lake, the gravel pit, and the city. The directory follows residents, even when they go indoors.</p><button class="primary-button" data-action="start">Let’s go, bud. <span>↗</span></button><p class="keyboard-note">Sound starts with a click or key press. Your progress and volume preferences save in this browser.</p>`);
}

function showBag() {
 const state = engine.state;
 const inventory = Object.entries(state.inventory).filter(([,count]) => count > 0);
 const count = inventory.reduce((sum,[,n]) => sum + n, 0);
 openModal('bag', `<span class="bag-label">DEFINITELY NOT STOLEN™</span><h1 id="modal-title">The emotional baggage.</h1><p class="subtitle">It’s a handbag. It holds three shopping carts. Don’t question it.</p>
 <div class="bag-stats"><div class="bag-stat"><small>LOOSE CHANGE</small><b>${money(state.money)}</b><div class="bar"><i style="width:${Math.min(100,state.money/15)}%"></i></div></div><div class="bag-stat"><small>♥ HEALTH</small><b>${Math.round(state.health)}<small class="out-of">OUT OF 100</small></b><div class="bar"><i style="width:${state.health}%;background:#b87c63"></i></div></div><div class="bag-stat"><small>✦ MENTAL STATE</small><b>${Math.round(state.mentalState)}<small class="out-of">MOSTLY HOLDING IT TOGETHER</small></b><div class="bar"><i style="width:${state.mentalState}%"></i></div></div></div>
 <div class="bag-tabs"><b>WHAT’S IN THE BAG</b><span>${count} ITEM${count === 1 ? '' : 'S'} · ${Math.round(state.energy)}% HUSTLE LEFT</span></div><div class="bag-items">${inventory.map(([id,n]) => `<article class="bag-item"><span class="item-icon" style="color:${items[id].color}">${escape(items[id].icon)}</span><div><strong>${escape(items[id].name)}</strong><p>${escape(items[id].description)}</p><span class="item-count">× ${n} rattling around</span>${items[id].effect ? `<button data-action="eat" data-id="${id}">Eat it, bud.</button>` : ''}</div></article>`).join('')}</div>
 ${inventory.length ? '' : '<div class="empty-state" style="margin-top:16px">Just lint and questionable potential.<br>Walk over loose items around the park to fill it up.</div>'}<div class="bag-career"><span>LEVEL ${state.level || 1} · ${state.xp || 0} XP</span><span>${state.wins || 0} SCRAPS SURVIVED</span></div><p class="bag-footer">“It’s not a purse. It’s a mobile business headquarters.”</p>`, 'bag-modal');
}

function questEntry(quest, complete = false) {
 const info = engine.getQuestProgress(quest.id);
 const giver = characters.find(c => c.id === quest.giver);
 const active = !!engine.state.activeQuests[quest.id];
 const step = info?.step;
 const status=residentStatus(quest.giver);
 return `<article class="quest-entry ${complete ? 'complete' : ''}"><div class="eyebrow">${complete ? '✓ DONE & DUSTED' : escape(giver?.name.toUpperCase())}<span>+${money(quest.reward.money)}</span></div><h3>${escape(quest.title)}</h3><p>${escape(quest.description)}</p>${active && step ? `<div class="quest-step"><span class="step-check">${info.stepIndex+1}</span><span>${escape(step.text)} ${['collect','deliver'].includes(step.type) ? `<b>(${info.progress}/${info.count})</b>` : ''}</span></div><button class="secondary-button" style="margin-top:12px;padding:7px 11px;font-size:10px" data-action="track" data-id="${quest.id}">${trackedQuest === quest.id ? 'Following this scheme ✓' : 'Keep this in view ↗'}</button>` : !complete ? `<div class="giver-location"><span>${escape(giver?.name)} · ${escape(status.label)}</span><button data-action="find-resident" data-id="${quest.giver}">Find ${escape(giver?.name)} ↗</button></div>` : ''}</article>`;
}

function showJournal() {
 const active = quests.filter(q => engine.state.activeQuests[q.id]);
 const completed = quests.filter(q => engine.state.completedQuests.includes(q.id));
 const available = engine.getAvailableQuests();
 openModal('journal', `<div class="eyebrow">THE SUNNYVALE BUSINESS PLAN</div><h1 id="modal-title">Questionable schemes.</h1><p class="subtitle">A little elbow grease. A lot of walking around.</p><div class="quest-summary"><div><strong>${completed.length} / ${quests.length}</strong><small>JOBS SORTED</small></div><div><strong>${money(engine.state.money)}</strong><small>OF $1,500 NEEDED</small></div><div><strong>${engine.state.reputation}</strong><small>PARK REP</small></div></div><div class="rest-note">The big picture: earn $1,500 and complete at least 6 schemes to help save the park. Explore at your own pace.</div><div class="section-label">ON THE GO · ${active.length}</div><div class="quest-list">${active.map(q => questEntry(q)).join('') || '<div class="empty-state">No jobs, no problems. Except the park repairs.<br>Talk to anyone with a yellow ! to get a scheme going.</div>'}</div><div class="section-label">WORD AROUND THE PARK · ${available.length}</div><div class="quest-list">${available.map(q=>questEntry(q)).join('')}</div>${completed.length ? `<div class="section-label">DONE & DUSTED · ${completed.length}</div><div class="quest-list">${completed.map(q=>questEntry(q,true)).join('')}</div>` : ''}`);
 $('#modal-content .quest-summary').insertAdjacentHTML('afterend',directoryHTML());
}

function showMap() {
 const outside=['gasStation','quarry','lake','mall','cityDiner','pawnShop','liquorStore','cityJunkyard'];
 openModal('map', `<div class="eyebrow">SUNNYVALE & THE WORLD OUTSIDE</div><h1 id="modal-title">A little farther from home.</h1><p class="subtitle">Leave through the south entrance and follow the highway. There’s a whole city out there, bud.</p><canvas id="full-map" class="full-map" width="1000" height="708" aria-label="World map with Sunnyvale, the forest highway, lake, quarry, city destinations, and your position"></canvas><div class="map-legend"><span><i class="you"></i>You, probably</span><span><i></i>Someone with a scheme</span><span><i class="quest"></i>Your next objective</span></div><div class="section-label">TAKE THE SHITMOBILE SOMEWHERE</div><div class="destination-list">${locations.filter(l=>outside.includes(l.id)).map(l=>`<button data-action="find-place" data-id="${l.id}"><span>↗</span>${escape(l.name)}</button>`).join('')}</div>${directoryHTML()}<p class="keyboard-note">M or Escape closes the map. The minimap follows the area you’re in. Residents move; their markers follow them.</p>`, 'map-modal');
 renderer.drawMinimap($('#full-map'), true);
 const controls=document.createElement('div');controls.className='map-scopes';
 controls.innerHTML=[['world','The whole trip'],['sunnyvale','Sunnyvale'],['city','The city'],['lakeDistrict','The lake'],['quarryDistrict','Gravel pit']].map(([id,label])=>`<button data-map-region="${id}" class="${id==='world'?'selected':''}">${label}</button>`).join('');
 $('#full-map').before(controls);renderer.mapRegion='world';renderer.drawMinimap($('#full-map'),true);
}

function showHelp() {
 openModal('help', `<div class="eyebrow">THE UNOFFICIAL ORIENTATION</div><h1 id="modal-title">Welcome to park life.</h1><p>Explore the neighbourhood, go inside the trailers, and help the boys raise $1,500 through at least 6 schemes. Random trouble is part of living here.</p><div class="help-grid"><div><kbd>WASD</kbd> Walk / drive</div><div><kbd>SHIFT</kbd> Sprint on foot</div><div><kbd>E</kbd> Enter / exit / interact</div><div><kbd>F</kbd> Throw a punch</div><div><kbd>Q</kbd> Block an incoming hit</div><div><kbd>SPACE</kbd> Dodge / dash</div><div><kbd>I / B</kbd> The handbag</div><div><kbd>J / M</kbd> Schemes / map</div><div><kbd>+ / −</kbd> Zoom in / out</div><div><kbd>ESC</kbd> Close a menu</div></div><p><b>The Shitmobile:</b> press E beside the car. W accelerates, S brakes and reverses, and A/D steer. Press E to park and get out. On-screen buttons work with a mouse or touch.</p><p><b>Interiors:</b> stand by any door and press E. Inspect furniture, get some rest, or use the shop counter. The exit is at the bottom of the room.</p><p><b>Encounters:</b> watch for four bottle kids, Lahey’s patrol, and Cyrus asking for cash. Your choices can calm things down or start a scrap. Move close to land punches, watch the enemy’s wind-up, and dodge or block. Left-click the world during a fight to punch. Fights earn XP. Getting knocked out sends you home.</p><p>Collect loose supplies, eat snacks from your bag, and rest to recover health, mental state, and energy. Yellow ! means a job; a blue diamond marks an objective.</p><div class="button-row"><button class="primary-button" data-action="close">Got it, bud. ↗</button><button class="secondary-button" data-action="save">Save progress</button></div><p class="help-footnote">Your save stays in this browser. Old mission progress carries into the expanded park. This is an unofficial fan adventure with original art and dialogue.</p><button class="danger-button" data-action="reset-confirm">Start a new game…</button>`);
 $('#modal-content .help-grid').insertAdjacentHTML('beforeend','<div><kbd>H</kbd> Honk the car horn</div><div><kbd>V</kbd> Toggle sound</div>');
 $('#modal-content .help-grid').insertAdjacentHTML('afterend','<p><b>A living neighbourhood:</b> residents walk between errands, go indoors, and react to a nearby fight or car. The live directory in the journal and map tells you where they are. Pin a resident to follow their changing position.</p><p><b>Beyond Sunnyvale:</b> drive out through the south entrance, follow the highway, and use the world map to find the lake, quarry, gas station, mall, and city shops. Six travel jobs give the road trips a purpose. Ricky’s home is his car; park it to sleep in it.</p>');
}

function shopHTML() {
 return `<div class="section-label">HOT FOOD · COLD CASH</div>${['burger','pepperoni'].map(id => `<div class="shop-row"><span class="item-icon">${escape(items[id].icon)}</span><span>${escape(items[id].name)}<small style="display:block;font-size:9px;color:#7d896a;margin-top:5px">Restores health, mental state & energy</small></span><button class="primary-button" data-action="buy" data-id="${id}" ${engine.state.money < items[id].cost ? 'disabled' : ''}>${money(items[id].cost)}</button></div>`).join('')}`;
}

function showDialogue(result) {
 audio.play('talk',{characterId:result.character.id});
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
 openModal('location', `<div class="eyebrow">AROUND THE NEIGHBOURHOOD</div><h1 id="modal-title">${escape(result.title)}</h1><p>${escape(result.text)}</p>${['burger','store','gasStation','cityDiner'].includes(loc.id) ? shopHTML() : ''}${loc.id==='ricky' ? '<div class="rest-note">Ricky lives in the Shitmobile, right here in his yard. Walk up to the car to drive it, or catch some sleep on its deeply questionable upholstery.</div><div class="button-row"><button class="primary-button" data-action="car-rest">Crash in the Shitmobile ☾</button></div>' : ''}${loc.id === 'garage' ? `<div class="quest-offer"><h3>A completely legitimate odd job.</h3><p>Sort parts for $35. Takes 45 minutes, 15 energy, and a little patience.</p><button class="primary-button" data-action="work">Make yourself useful · +$35</button></div>` : ''}<div class="button-row"><button class="secondary-button" data-action="close">Back to the neighbourhood ↗</button></div>`);
}

function interact() {
 if (modalType) return;
 if (engine.encounter?.phase === 'choice' && !['location','vehicle','exit'].includes(engine.nearestInteractable()?.type)) return;
 const result = engine.interact();
 if (result.location?.id==='ricky') showLocation(result);
 else if (result.type === 'dialogue') showDialogue(result);
 else if (result.type === 'location') showLocation(result);
 else if (result.type === 'interior') showInteriorObject(result);
 else toast(result.text);
 updateHUD();
}

function showInteriorObject(result) {
 const prop = result.furniture;
 openModal('interior', `<div class="eyebrow">${escape(engine.getInterior()?.name || 'INSIDE SUNNYVALE')}</div><h1 id="modal-title">${escape(result.title)}</h1><p>${escape(result.text)}</p>${prop?.action === 'shop' ? shopHTML() : ''}${prop?.action === 'rest' ? '<div class="rest-note">A questionable mattress. A perfectly good night’s sleep. Restores health, mental state, and energy.</div><div class="button-row"><button class="primary-button" data-action="rest">Catch some shut-eye ☾</button></div>' : ''}${prop?.action === 'work' ? '<div class="quest-offer"><h3>There’s always more junk.</h3><p>Sort spare parts for $35. Takes 45 minutes and 15 energy.</p><button class="primary-button" data-action="work">Get to work · +$35</button></div>' : ''}<div class="button-row"><button class="secondary-button" data-action="close">Keep looking around ↗</button></div>`);
}

function updateEncounterHUD() {
 const encounter = engine.encounter;
 const outdoors = !engine.state.scene || engine.state.scene === 'park';
 const visible = !!encounter && outdoors && !modalType;
 $('.world-frame').classList.toggle('has-encounter', visible);
 $('#encounter-banner').hidden = !visible;
 if (visible) {
  $('#encounter-name').textContent = encounter.title || ({bottlekids:'BOTTLE KIDS!',lahey:'THE SUPERVISOR IS OUT',cyrus:'CYRUS HAS SOMETHING TO SAY',carts:'RUNAWAY CARTS',kitty:'KITTY SITUATION'}[encounter.type] || 'TROUBLE IN THE PARK');
  $('#encounter-hint').textContent = encounter.phase === 'choice' ? 'Your move, bud.' : ['combat','attack'].includes(encounter.phase) ? 'Stay light on your feet. F punch · Q block · Space dodge' : encounter.phase === 'depart' ? 'Another normal afternoon in Sunnyvale.' : 'Keep an eye on the lane.';
 }
 const choicesVisible = visible && encounter.phase === 'choice';
 $('#encounter-choice').hidden = !choicesVisible;
 if (choicesVisible) {
  const signature = `${encounter.type}|${encounter.phase}|${encounter.text}|${engine.state.money}`;
  if (signature !== encounterChoiceSignature) {
   encounterChoiceSignature = signature;
   $('#encounter-choice').innerHTML = `<div class="eyebrow">WRONG PLACE. FAMILIAR FACES.</div><h2>${escape(encounter.title)}</h2><p>${escape(encounter.text)}</p><div class="encounter-options">${(encounter.choices || []).map((choice,index)=>`<button data-choice="${escape(choice.id)}" ${choice.disabled ? 'disabled' : ''}><span class="choice-number">${index+1}</span><span><b>${escape(choice.text)}</b>${choice.description ? `<small>${escape(choice.description)}</small>` : ''}</span><span>↗</span></button>`).join('')}</div>`;
  }
 } else encounterChoiceSignature = '';
 const fighting = visible && ['combat','attack'].includes(encounter.phase);
 $('#combat-hud').hidden = !fighting;
 if (fighting) {
  const enemies = (encounter.actors || []).filter(a=>a.enemy && a.health > 0 && a.maxHealth);
  const health = enemies.reduce((n,a)=>n+a.health,0), max = enemies.reduce((n,a)=>n+a.maxHealth,0);
  $('#combat-enemy').textContent = encounter.type === 'bottlekids' ? 'BOTTLE KIDS · KEEP MOVING' : enemies.map(a=>a.name).join(' & ') || 'WATCH YOUR STEP';
  $('#combat-enemy-health').textContent = max ? `${Math.ceil(health)} / ${max}` : 'DODGE THE CHAOS';
  $('#combat-enemy-meter').style.width = `${max ? health/max*100 : 100}%`;
  $('[data-combat="punch"]').disabled = !max || engine.state.energy < 4;
 }
}

function combat(action) {
 if (modalType || engine.state.vehicle?.driving) return;
 engine.combatAction(action);
 updateHUD();
}

function changeZoom(delta) {
 renderer.adjustZoom(delta);
 try { localStorage.setItem('sunnyvale-camera-zoom', String(renderer.zoomLevel)); } catch { /* session preference */ }
 $('#zoom-value').textContent = `${Math.round((renderer.zoomLevel || renderer.zoom || 1.65)*100)}%`;
 if (!modalType) canvas.focus({preventScroll:true});
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
 const escapePrompt = nearest && ['location','vehicle','exit'].includes(nearest.type);
 $('#interaction-prompt').hidden = !nearest || !!modalType || (['choice','combat','attack'].includes(engine.encounter?.phase) && !escapePrompt);
 if (nearest) $('#interaction-prompt span').textContent = engine.state.vehicle?.driving ? 'Park & get out' : nearest.type === 'character' ? `Talk to ${nearest.entity.name}` : nearest.type === 'pickup' ? `Pick up ${items[nearest.entity.item].name}` : nearest.type === 'vehicle' ? 'Get in Ricky’s Shitmobile' : nearest.type === 'exit' ? 'Back to Sunnyvale' : nearest.type === 'furniture' ? `Inspect ${nearest.entity.label || nearest.entity.name}` : `Enter ${nearest.entity.name}`;
 const closestArea = locations.reduce((a,b) => Math.hypot(s.player.x-a.door.x,s.player.y-a.door.y) < Math.hypot(s.player.x-b.door.x,s.player.y-b.door.y) ? a : b);
 const room = engine.getInterior();
 const mapOrigin=s.outdoorPosition || s.player;
 const region=getRegionAt(mapOrigin.x,mapOrigin.y);
 $('#minimap-region').textContent=({sunnyvale:'SUNNYVALE',city:'DARTMOUTH EAST',forest:'ROUTE 7',lakeDistrict:'OLD MILL LAKE',quarryDistrict:'ROCKY RIDGE'})[region.id] || 'THE BACK ROADS';
 $('#world-ambience-label').textContent=region.id==='sunnyvale'?'A perfectly normal day in the park':region.id==='city'?'Way beyond the park, bud.':region.id==='lakeDistrict'?'A little peace and quiet.':'The long way home.';
 $('#area-name').textContent = room ? `INSIDE · ${room.name.toUpperCase()}` : Math.hypot(s.player.x-closestArea.door.x,s.player.y-closestArea.door.y) < 210 ? closestArea.name.toUpperCase() : (region?.name || 'THE ROAD OUTSIDE SUNNYVALE').toUpperCase();
 $('.area-weather').textContent = room ? 'INDOORS' : '☀ 22°';
 $('.world-frame').classList.toggle('is-indoors', !!room);
 $('.world-frame').classList.toggle('is-driving', !!s.vehicle?.driving);
 $('.world-frame').classList.toggle('is-fighting', ['combat','attack'].includes(engine.encounter?.phase));
 $('#level-value').textContent = s.level || 1;
 $('#player-rank').textContent = (s.level || 1) >= 5 ? 'PARK LEGEND' : (s.level || 1) >= 3 ? 'LOCAL TROUBLEMAKER' : 'PARK NEWCOMER';
 $('#xp-value').textContent = `${(s.xp || 0)%100} / 100 XP`;
 $('#xp-meter').style.width = `${(s.xp || 0)%100}%`;
 $('#energy-value').textContent = `⚡ ${Math.round(s.energy)}`;
 $('#driving-hud').hidden = !s.vehicle?.driving || !!modalType;
 $('#speed-value').textContent = `${Math.round(Math.abs(s.vehicle?.speed || 0)/7)} KM/H`;
 $('#zoom-value').textContent = `${Math.round((renderer.zoomLevel || renderer.zoom || 1.65)*100)}%`;
 if (!s.activeQuests[trackedQuest]) trackedQuest = Object.keys(s.activeQuests)[0] || null;
 const progress = trackedQuest ? engine.getQuestProgress(trackedQuest) : null;
 const target=trackedTarget();
 $('.mission-card h2').textContent = trackedResident ? `Find ${target?.label || 'the neighbours'}` : trackedPlace ? target?.label || 'A little road trip.' : s.ending ? 'The park’s still standing.' : progress?.quest.title || 'Keep the park alive.';
 $('#mission-objective').textContent = trackedResident || trackedPlace ? target?.detail || 'Follow the marker on the map.' : progress?.step?.text || (s.ending ? 'A job well done. Keep exploring—there’s always another scheme.' : 'Make $1,500 and finish 6 schemes. Start by finding the boys.');
 $('#tracking-hint').hidden = !target;
 if (target) {
  const dx=target.x-s.player.x,dy=target.y-s.player.y,d=Math.hypot(dx,dy);
  $('#tracking-arrow').textContent=['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
  const targetRegion=getRegionAt(target.x,target.y);
  const farHint=targetRegion.id==='sunnyvale'&&region.id==='sunnyvale'?'ACROSS THE PARK':targetRegion.id==='city'&&region.id==='city'?'ACROSS TOWN':'FOLLOW THE HIGHWAY';
  $('#tracking-text').textContent=`${target.label} · ${d<85?'RIGHT HERE':d<350?'NEARBY':d<1500?'THIS WAY':farHint}`;
 }
 $('#mission-counter').textContent = `${s.completedQuests.length} / ${quests.length}`;
 $('#goal-meter').style.width = `${Math.min(100,s.money/15)}%`;
 $('#quest-dot').classList.toggle('on', Object.keys(s.activeQuests).length > 0);
 $('#save-state').textContent = saveWorks ? 'YOUR PROGRESS SAVES AUTOMATICALLY' : 'BROWSER STORAGE UNAVAILABLE · THIS SESSION ONLY';
 renderer.drawMinimap($('#minimap'));
 const settings=audio.getSettings();
 $('#sound-label').textContent=settings.muted?'MUTED':audio.unlocked?'SOUND ON':'ENABLE SOUND';
 $('#sound-icon').textContent=settings.muted?'♩':'♫';
 $('#sound-button').classList.toggle('muted',settings.muted);
 if ($('#audio-status')) $('#audio-status').textContent=audio.status;
 $('#car-rest-button').disabled=Math.abs(s.vehicle?.speed || 0)>3;
 updateEncounterHUD();
}

$('#modal-close').addEventListener('click', closeModal);
$('#modal-layer').addEventListener('click', event => { if (event.target === $('#modal-layer')) closeModal(); });
$('#explore-button').addEventListener('click', closeModal);
$('#bag-button').addEventListener('click', () => toggle('bag', showBag));
$('#journal-button').addEventListener('click', () => toggle('journal', showJournal));
$('#map-button').addEventListener('click', () => toggle('map', showMap));
$('#minimap-button').addEventListener('click', () => toggle('map', showMap));
$('#help-button').addEventListener('click', () => toggle('help', showHelp));
$('#sound-button').addEventListener('click',()=>toggle('sound',showSound));
$('#horn-button').addEventListener('click',()=>{engine.useHorn();canvas.focus({preventScroll:true});});
$('#car-rest-button').addEventListener('click',()=>{engine.restInCar();updateHUD();canvas.focus({preventScroll:true});});
$('#mission-open').addEventListener('click', showJournal);
$('#interact-click').addEventListener('click', interact);
$('#touch-interact').addEventListener('click', interact);
$('#zoom-in').addEventListener('click',()=>changeZoom(.15));
$('#zoom-out').addEventListener('click',()=>changeZoom(-.15));
$('#encounter-choice').addEventListener('click',event=>{
 const button = event.target.closest('[data-choice]');
 if (button) { engine.chooseEncounter(button.dataset.choice); updateHUD(); canvas.focus({preventScroll:true}); }
});
document.querySelectorAll('[data-combat]').forEach(button=>button.addEventListener('click',()=>{combat(button.dataset.combat);canvas.focus({preventScroll:true});}));
canvas.addEventListener('click',()=>{
 if (['combat','attack'].includes(engine.encounter?.phase)) combat('punch');
 else canvas.focus({preventScroll:true});
});
canvas.addEventListener('wheel',event=>{
 if (!modalType) { event.preventDefault(); changeZoom(event.deltaY<0?.1:-.1); }
},{passive:false});

$('#modal-content').addEventListener('click', event => {
 const regionButton=event.target.closest('[data-map-region]');
 if (regionButton) {
  renderer.mapRegion=regionButton.dataset.mapRegion;
  document.querySelectorAll('[data-map-region]').forEach(b=>b.classList.toggle('selected',b===regionButton));
  renderer.drawMinimap($('#full-map'),true);return;
 }
 const button = event.target.closest('[data-action]');
 if (!button) return;
 const {action,id} = button.dataset;
 if (action === 'close') closeModal();
 if (action === 'start') {
  try { localStorage.setItem('sunnyvale-welcome-seen', 'yes'); localStorage.setItem('sunnyvale-rpg-intro-seen','yes'); } catch { /* session still playable */ }
  closeModal(); toast('Ricky’s car is nearby. E to enter doors or the Shitmobile. F punch · Space dodge.');
 }
 if (action === 'eat') { engine.useItem(id); showBag(); updateHUD(); }
 if (action === 'accept' && engine.acceptQuest(id)) {
  trackedQuest = id;
  trackedResident=null;trackedPlace=null;
  const q = quests.find(q=>q.id === id);
  const result = dialogue;
  showDialogue({...result,text:`Good stuff. ${engine.getQuestProgress(id)?.step?.text || q.steps[0].text} Come find me when you’re sorted.`});
  updateHUD();
 }
 if (action === 'track') { trackedQuest = id; trackedResident=null;trackedPlace=null; closeModal(); toast('Keeping that scheme in view. The marker follows your next objective.'); }
 if (action === 'find-resident') { trackedResident=id;trackedPlace=null;closeModal();toast(`Following ${residentStatus(id).resident?.name}. Check the map or follow the arrow.`); }
 if (action === 'find-place') { trackedPlace=id;trackedResident=null;closeModal();toast('Destination pinned. The south entrance leads to the highway.'); }
 if (action === 'car-rest') { if(engine.restInCar())closeModal(); }
 if (action === 'toggle-sound') { audio.setMuted(!audio.getSettings().muted);showSound();updateHUD(); }
 if (action === 'sound-preview') { audio.play('pickup',{preview:true}); }
 if (action === 'rest') { engine.rest(); closeModal(); }
 if (action === 'work') { engine.work(); closeModal(); }
 if (action === 'buy') {
  if (engine.buyItem(id)) {
   toast(`Check the bag for your snacks, bud. ${money(engine.state.money)} left.`);
   if (dialogue) showDialogue(dialogue); else if (locationDialogue) showLocation(locationDialogue); else showInteriorObject({title:'Counter service',text:'The finest snacks in this particular building.',furniture:{action:'shop'}});
  }
  updateHUD();
 }
 if (action === 'save') { saveWorks = engine.save(); toast(saveWorks ? 'Saved. Your bad decisions are in good hands.' : 'This browser blocked storage. Keep this tab open to continue.'); updateHUD(); }
 if (action === 'reset-confirm') openModal('reset', '<div class="eyebrow">A FRESH SET OF BAD IDEAS</div><h1 id="modal-title">Start over, bud?</h1><p>This replaces the Sunnyvale save in this browser. Your cash, items, and schemes will start from scratch.</p><div class="button-row"><button class="primary-button" data-action="reset">Yep. New game.</button><button class="secondary-button" data-action="close">Keep this adventure.</button></div>');
 if (action === 'reset') { engine.reset(); endingShown = false; trackedQuest = null;trackedResident=null;trackedPlace=null; closeModal(); showWelcome(); }
});

$('#modal-content').addEventListener('input',event=>{
 const input=event.target.closest('[data-volume]');if(!input)return;
 audio.setVolume(input.dataset.volume,Number(input.value)/100);
 $(`#volume-${input.dataset.volume}`).textContent=`${input.value}%`;
});
document.addEventListener('pointerdown',unlockAudio,{capture:true});
document.addEventListener('keydown',unlockAudio,{capture:true});
document.addEventListener('click',event=>{if(event.target.closest('button'))audio.play('ui');});

document.addEventListener('keydown', event => {
 const key = event.key.toLowerCase();
 if (event.ctrlKey || event.metaKey || event.altKey) return;
 if (key === ' ' && event.target.closest?.('button,a')) return;
 const movementKey = ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key);
 if ((!modalType && (movementKey || [' ','f','q','h','v','+','=','-'].includes(key))) || ['escape','e','i','b','m','j'].includes(key)) event.preventDefault();
 if (key === 'tab' && modalType) {
  const focusable = [...$('#modal').querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')];
  const first = focusable[0], last = focusable.at(-1);
  if (event.shiftKey && (document.activeElement === first || document.activeElement === $('#modal'))) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  return;
 }
 if (event.repeat && ['e','i','b','m','j','escape','f','q','h','v',' '].includes(key)) return;
 if (key === 'escape') { closeModal(); return; }
 if (key === 'i' || key === 'b') { toggle('bag', showBag); return; }
 if (key === 'j') { toggle('journal', showJournal); return; }
 if (key === 'm') { toggle('map', showMap); return; }
 if (key === 'v') { audio.setMuted(!audio.getSettings().muted);if(modalType==='sound')showSound();updateHUD();return; }
 if (modalType) return;
 if (key === 'h') { engine.useHorn();return; }
 if (['1','2','3'].includes(key) && engine.encounter?.phase === 'choice') {
  const choice = engine.encounter.choices?.[Number(key)-1];
  if (choice) { engine.chooseEncounter(choice.id); updateHUD(); }
  return;
 }
 if (['+','='].includes(key)) { changeZoom(.15); return; }
 if (key === '-') { changeZoom(-.15); return; }
 if (key === 'f') { combat('punch'); return; }
 if (key === 'q') { combat('block'); return; }
 if (key === ' ') { combat('dodge'); return; }
 if (key === 'e') { interact(); return; }
 keys.add(key);
});
document.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); touchKeys.clear(); engine.moving = false; engine.save(); });
document.addEventListener('visibilitychange', () => { keys.clear(); touchKeys.clear(); engine.moving = false; engine.save(); lastTime = 0;engine.paused=document.hidden||!!modalType;audio.update(engine,.05); });
window.addEventListener('pagehide', () => {engine.save();engine.paused=true;audio.update(engine,.05);});
window.addEventListener('resize', () => { renderer.resize(); if (modalType === 'map') renderer.drawMinimap($('#full-map'),true); });
document.querySelectorAll('[data-move]').forEach(button => {
 button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); touchKeys.add(button.dataset.move); });
 for (const name of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(name, () => touchKeys.delete(button.dataset.move));
});

function frame(time) {
 const dt = lastTime ? Math.min((time-lastTime)/1000, .05) : 0;
 lastTime = time;
 engine.paused=!!modalType||document.hidden;
 if (!modalType && !document.hidden) {
  const dx = Number(keys.has('d') || keys.has('arrowright') || touchKeys.has('right')) - Number(keys.has('a') || keys.has('arrowleft') || touchKeys.has('left'));
  const dy = Number(keys.has('s') || keys.has('arrowdown') || touchKeys.has('down')) - Number(keys.has('w') || keys.has('arrowup') || touchKeys.has('up'));
  engine.move(dx,dy,dt,keys.has('shift')); engine.update(dt);
 }
 renderer.draw(time, dt);
 audio.update(engine,dt);
 hudTimer += dt;
 if (hudTimer > .15) { updateHUD(); hudTimer = 0; }
 const events = engine.events.splice(0);
 if (events.length) {
  const sounds=new Set();
  for(const event of events) {
   if(['door','engine-start','engine-stop','horn'].includes(event.type))sounds.add(event.type);
   else if(event.type==='damage')sounds.add('hit');
   else if(event.type==='quest')sounds.add('quest');
   else if(event.type==='reward')sounds.add(/^Level /.test(event.text)?'level-up':'reward');
   else if(event.type==='encounter')sounds.add('encounter');
   else if(event.type==='warning'&&/got you back|knocked|lost \$/i.test(event.text))sounds.add('knockout');
   else if(event.type==='info'&&/Picked up|Bought /.test(event.text))sounds.add('pickup');
  }
  for(const type of sounds)audio.play(type,{preview:!!modalType});
  if (events.some(e=>e.type === 'damage')) {
   clearTimeout(damageTimer); $('#damage-flash').classList.add('hit');
   damageTimer = setTimeout(()=>$('#damage-flash').classList.remove('hit'),350);
  }
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
try { welcomed = localStorage.getItem('sunnyvale-rpg-intro-seen') === 'yes'; } catch { /* no persistent storage */ }
if (!welcomed) showWelcome();
requestAnimationFrame(frame);
