import { modules } from './modules.js';
import { localArt, buildPanel } from './art.js';
import { createCharacter } from './character.js';
import { createScene } from './scene.js';
import { INTRO, introCaptions } from './intro-timeline.js';

const stage = document.querySelector('#home-stage');
document.title = '宓语 StudyOS';
const moduleDialog = document.querySelector('#module-dialog');
const settingsDialog = document.querySelector('#settings-dialog');
const reducePreference = matchMedia('(prefers-reduced-motion: reduce)');
const defaults = { name: 'Sam', motion: true, intro: true };
let settings = { ...defaults };
try { settings = { ...defaults, ...JSON.parse(localStorage.getItem('miyu-studyos-preferences') || '{}') }; } catch { /* Storage can be unavailable in private sessions. */ }
settings.name = String(settings.name || 'Sam').slice(0, 16);
let config = { writingStudio: { url: null, mode: 'embedded' } };
if (window.__STUDYOS_BOOT__) {
  settings = { ...settings, ...window.__STUDYOS_BOOT__.preferences };
  config = window.__STUDYOS_BOOT__.config;
} else {
  fetch('/config/studyos.json').then(r=>r.json()).then(value=>{config=value;}).catch(()=>{});
}
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const motionEnabled = () => settings.motion && !reducePreference.matches;
let desktopAPI = null;
let desktopInfo = null;
const storage = () => {
  try { localStorage.setItem('miyu-studyos-preferences', JSON.stringify(settings)); } catch { /* In-memory preferences remain functional. */ }
  if (desktopAPI) desktopAPI.save_preferences(settings).catch(() => toast('设置暂时未能保存，请稍后重试。'));
};
let phaseTimers = [];
let introTimer;
let settleTimer;
let introRunning = false;
let activeModule = null;
let toastTimer;
let opener = null;

const character = createCharacter(stage);
modules.forEach(module => stage.append(buildPanel(module)));

const brand = stage.querySelector('.brand') || document.createElement('header');
brand.className = 'brand';
brand.innerHTML = '<h1><span class="brand-cn">宓语</span><span class="brand-en">StudyOS</span></h1><p class="brand-subtitle">Mi Study Operating System</p><p class="brand-motto">思考有形，文字有光。</p>';
stage.append(brand);

const topbar = document.createElement('nav');
topbar.className = 'topbar';
topbar.setAttribute('aria-label', '搜索与账户');
topbar.innerHTML = `<div class="search-shell"><svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg><input id="home-search" type="search" placeholder="搜索课程 / 笔记 / 文件 …" aria-label="搜索功能模块" aria-controls="search-results" aria-expanded="false" autocomplete="off" /></div>
  <button class="top-icon notification-button" aria-label="通知"><img src="/assets/lineart/06_icons_svg/icon_bell.svg" alt=""/></button>
  <button class="top-icon settings-button" aria-label="设置"><img src="/assets/lineart/06_icons_svg/icon_settings.svg" alt=""/></button>
  <button class="user-button" aria-label="账户设置"><span class="avatar" aria-label="宓的线稿头像"></span><span class="user-text"><span class="user-name"></span><span class="user-caption">永远热爱学习的你</span></span><span class="user-chevron">⌄</span></button>
  <div id="search-results" class="search-results" hidden aria-label="匹配的功能模块"></div>`;
stage.append(topbar);
topbar.querySelector('.avatar').append(localArt([1450,23,69,69]));

const greeting = document.createElement('section');
greeting.className = 'greeting';
greeting.setAttribute('aria-label', '欢迎与日期');
greeting.innerHTML = '<h2></h2><p class="greeting-date"></p><p class="greeting-term"></p>';
stage.append(greeting);

const miDialog = document.createElement('button');
miDialog.className = 'mi-dialog';
miDialog.setAttribute('aria-label', '与宓相遇，切换欢迎语');
miDialog.insertAdjacentHTML('beforeend', '<span class="dialog-cn">今天先从最重要的一项开始。</span><span class="dialog-en">Let’s begin with what matters most.</span>');
stage.append(miDialog);

const footer = document.createElement('footer');
footer.className = 'footer-motto';
footer.innerHTML = '<p>以热爱之心，赴更好的自己。</p><small>A BRIGHTER YOU, THROUGH A MORE FOCUSED TOMORROW.</small>';
stage.append(footer);
const scene = await createScene(stage, character);

const search = document.querySelector('#home-search');
const searchResults = document.querySelector('#search-results');
const updateGreeting = () => {
  // Dates and greetings follow the user's timezone, including daylight savings.
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', hourCycle: 'h23' }).format(now));
  const salutation = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Toronto', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).formatToParts(now);
  const part = type => parts.find(item => item.type === type)?.value;
  const month = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', month: 'numeric' }).format(now));
  greeting.querySelector('h2').textContent = `${salutation}, ${settings.name}.`;
  greeting.querySelector('.greeting-date').textContent = `${part('weekday')} · ${part('month')} ${part('day')}`;
  greeting.querySelector('.greeting-term').textContent = `${month <= 4 ? 'Winter' : month <= 8 ? 'Spring' : 'Fall'} ${part('year')}`;
  topbar.querySelector('.user-name').textContent = settings.name;
};
updateGreeting();
setInterval(updateGreeting, 60000);

function fitStage() {
  if (innerWidth < 900) { stage.style.transform = ''; return; }
  const scale = Math.min(innerWidth / 1672, innerHeight / 941);
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
fitStage();
addEventListener('resize', fitStage);

function applyMotion() {
  stage.classList.toggle('motion-off', !motionEnabled());
  character.setMotion(motionEnabled());
  const toggle = document.querySelector('#toggle-motion');
  toggle.setAttribute('aria-pressed', String(!motionEnabled()));
  toggle.textContent = motionEnabled() ? '静止画卷' : '唤醒画卷';
}

function clearIntroTimers() {
  clearTimeout(introTimer); clearTimeout(settleTimer);
  phaseTimers.forEach(clearTimeout); phaseTimers = [];
}

function finishIntro(skipped = false) {
  clearIntroTimers();
  scene.finish();
  introRunning = false;
  stage.classList.remove('intro-running', 'intro-reduced');
  stage.classList.add('idle');
  document.querySelector('#intro-control').hidden = true;
  if (!document.hidden && !moduleDialog.open && !settingsDialog.open) character.start();
  stage.dataset.state = 'idle';
}

function playIntro() {
  clearIntroTimers();
  character.pause(); character.reset();
  stage.classList.remove('idle', 'intro-running', 'intro-reduced', 'settling');
  void stage.offsetWidth;
  introRunning = true;
  stage.dataset.state = 'intro';
  stage.classList.add(motionEnabled() ? 'intro-running' : 'intro-reduced');
  const duration = scene.play(!motionEnabled());
  document.querySelector('#intro-control').hidden = false;
  if (motionEnabled()) introCaptions.forEach(([delay, text]) => phaseTimers.push(setTimeout(() => { document.querySelector('#intro-phase').textContent = text; }, delay / INTRO.duration * duration)));
  else document.querySelector('#intro-phase').textContent = '欢迎回来';
  introTimer = setTimeout(finishIntro, duration);
}

applyMotion();
if (settings.intro) playIntro(); else finishIntro();

function toast(message) {
  const node = document.querySelector('#toast');
  node.textContent = message; node.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 3000);
}

const defaultPhrase = ['今天先从最重要的一项开始。', 'Let’s begin with what matters most.'];
const phrases = [defaultPhrase, ['慢慢来，每一步都算数。', 'One thoughtful step at a time.'], ['让想法落笔，让热爱生长。', 'Give your thoughts a place to bloom.'], ['书页已展开，等你写下今天。', 'A fresh page is waiting for you.']];
let phraseIndex = 0;
function setPhrase([cn, en]) { miDialog.querySelector('.dialog-cn').textContent = cn; miDialog.querySelector('.dialog-en').textContent = en; }
miDialog.addEventListener('click', () => { if (introRunning) finishIntro(true); character.react(); phraseIndex = (phraseIndex + 1) % phrases.length; setPhrase(phrases[phraseIndex]); });

function closeSearch() { searchResults.hidden = true; search.setAttribute('aria-expanded','false'); }
function showSearch() {
  const term = search.value.trim().toLowerCase();
  const matches = modules.filter(module => `${module.name} ${module.english} ${module.theme} ${module.keywords}`.toLowerCase().includes(term));
  searchResults.innerHTML = matches.length ? matches.map(module => `<button data-open-module="${module.id}">${module.name}<small>${module.english} · ${module.theme}</small></button>`).join('') : '<p class="search-empty">还没有找到这页课笺。试试课程、日历、写作…</p>';
  searchResults.hidden = false; search.setAttribute('aria-expanded','true');
}
search.addEventListener('input', showSearch);
search.addEventListener('focus', () => { if (introRunning) finishIntro(true); showSearch(); });
search.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeSearch(); }
  if (event.key === 'ArrowDown') { event.preventDefault(); searchResults.querySelector('button')?.focus(); }
  if (event.key === 'Enter') { event.preventDefault(); const first = searchResults.querySelector('button'); if (first) openModule(first.dataset.openModule); }
});
searchResults.addEventListener('keydown', event => {
  const buttons = [...searchResults.querySelectorAll('button')];
  const current = buttons.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); buttons[(current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus(); }
  if (event.key === 'Escape') { closeSearch(); search.focus(); }
});
document.addEventListener('pointerdown', event => { if (!topbar.contains(event.target)) closeSearch(); });
stage.addEventListener('pointerdown', event => {
  if (introRunning) { finishIntro(true); return; }
  const r=stage.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*1672,y=(event.clientY-r.top)/r.height*941;
  if(!event.target.closest('button,input') && x>710 && x<1000 && y>130 && y<570)character.react();
});

function configuredWritingUrl() {
  const value = config.writingStudio?.url;
  if (!value) return null;
  try { const url = new URL(value, location.origin); return ['http:','https:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

function openModule(id) {
  const module = modules.find(item => item.id === id);
  if (!module) return;
  if (introRunning) finishIntro(true);
  closeSearch();
  opener = document.activeElement;
  activeModule = id;
  moduleDialog.classList.remove('legacy-frame');
  const writingUrl = id === 'writing' ? configuredWritingUrl() : null;
  if (writingUrl && config.writingStudio.mode === 'embedded') {
    moduleDialog.classList.add('legacy-frame');
    moduleDialog.innerHTML = `<section class="dialog-shell"><button class="close-dialog" data-close-dialog aria-label="返回首页">×</button><div class="legacy-toolbar"><h2 id="dialog-title">墨笺·宓语</h2><p class="dialog-english">Writing Studio</p><a href="${escape(writingUrl)}" target="_blank" rel="noopener" class="legacy-link">独立打开 ↗</a></div><iframe src="${escape(writingUrl)}" title="原 Writing Studio 工作台"></iframe></section>`;
  } else {
    const nativeWriting = id === 'writing' && desktopInfo?.nativeWritingStudio;
    moduleDialog.innerHTML = `<section class="dialog-shell"><button class="close-dialog" data-close-dialog aria-label="关闭模块预览">×</button><p class="dialog-eyebrow">MI STUDY OPERATING SYSTEM · ${id === 'daily' || id === 'grades' ? 'OVERVIEW' : 'YOUR STUDY ROOM'}</p><div class="dialog-emblem"></div><h2 id="dialog-title">${module.theme}<span class="preview-label">${writingUrl || nativeWriting ? '已接入' : '界面预览'}</span></h2><p class="dialog-english">${module.english}</p><p class="dialog-description">${module.description}</p><ul class="feature-preview">${module.features.map((feature,index) => `<li><span>0${index+1}</span>${feature}</li>`).join('')}</ul><p class="module-note">${id === 'writing' ? '写作工坊正在准备中。原有写作工具将在这里打开，保留熟悉的操作与功能。' : '这一页先为你留好位置。当前是首页与模块入口的 UI 预览，课程、邮件和学习数据将在后续接入。'}</p>${nativeWriting ? '<button class="legacy-link" data-launch-native>打开墨笺·宓语 ↗</button> ' : ''}${writingUrl ? `<a href="${escape(writingUrl)}" target="_blank" rel="noopener" class="legacy-link">打开写作工作台 ↗</a> ` : ''}<button class="return-home" data-close-dialog>返回书房 <span aria-hidden="true">↗</span></button></section>`;
    moduleDialog.querySelector('.dialog-emblem').append(localArt(module.icon));
  }
  history.replaceState(null, '', `#${id}`);
  moduleDialog.showModal();
  moduleDialog.querySelector('.close-dialog').focus();
  character.pause();
}

document.addEventListener('click', async event => {
  const target = event.target.closest('[data-open-module]');
  if (target) openModule(target.dataset.openModule);
  if (event.target.closest('[data-close-dialog]')) moduleDialog.close();
  if (event.target.closest('[data-launch-native]') && desktopAPI) {
    const result = await desktopAPI.launch_writing_studio();
    toast(result.message);
    if (result.ok) moduleDialog.close();
  }
});
moduleDialog.addEventListener('close', () => { activeModule = null; history.replaceState(null, '', location.pathname); character.start(); opener?.focus(); });
for (const dialog of [moduleDialog, settingsDialog]) {
  dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); });
}

function openSettings() {
  if (introRunning) finishIntro(true);
  closeSearch();
  settingsDialog.innerHTML = `<form class="settings-content" id="settings-form"><button type="button" class="close-dialog" aria-label="关闭设置">×</button><h2 id="settings-title">书房小设</h2><p class="settings-subtitle">A room that feels like you.</p><label class="settings-field">宓该怎样称呼你？<input type="text" name="name" value="${escape(settings.name)}" maxlength="16" required autocomplete="given-name" /></label><label class="settings-field checkbox"><input type="checkbox" name="motion" ${settings.motion ? 'checked' : ''}/>让画卷轻轻呼吸</label><label class="settings-field checkbox"><input type="checkbox" name="intro" ${settings.intro ? 'checked' : ''}/>进入书房时，播放出场动画</label><p class="settings-help">设置保存在${desktopAPI ? '这台电脑' : '当前预览环境'}中。系统开启减少动态效果时，自动使用简短淡入并关闭景深与呼吸。</p><button class="save-settings" type="submit">收好设置</button></form>`;
  settingsDialog.querySelector('.close-dialog').addEventListener('click', () => settingsDialog.close());
  settingsDialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    settings.name = String(data.get('name')).trim() || 'Sam';
    settings.motion = data.has('motion'); settings.intro = data.has('intro');
    storage(); updateGreeting(); applyMotion(); settingsDialog.close(); toast('设置已收好。欢迎回到你的书房。');
  });
  settingsDialog.showModal();
  character.pause();
}
settingsDialog.addEventListener('close', () => { if (!document.hidden && !introRunning) character.start(); });
document.querySelector('.settings-button').addEventListener('click', openSettings);
document.querySelector('.user-button').addEventListener('click', openSettings);
document.querySelector('.notification-button').addEventListener('click', () => {
  if (introRunning) finishIntro(true);
  moduleDialog.innerHTML = '<section class="dialog-shell"><button class="close-dialog" data-close-dialog aria-label="关闭通知">×</button><p class="dialog-eyebrow">YOUR QUIET INBOX</p><h2 id="dialog-title">此刻，一切安静。</h2><p class="dialog-english">No new pages to turn.</p><p class="dialog-description">还没有新通知。</p><p class="module-note">Outlook 与课程公告将在校园信箱模块后续接入。</p><button class="return-home" data-close-dialog>回到书房 ↗</button></section>';
  opener = document.activeElement; moduleDialog.showModal(); character.pause();
});

document.querySelector('#skip-intro').addEventListener('click', () => finishIntro(true));
document.querySelector('#replay-intro').addEventListener('click', playIntro);
document.querySelector('#toggle-motion').addEventListener('click', () => { settings.motion = !motionEnabled(); storage(); if (introRunning) finishIntro(true); applyMotion(); if (reducePreference.matches) toast('系统的减少动态效果设置已开启。'); });
reducePreference.addEventListener('change', () => { if (introRunning) finishIntro(true); applyMotion(); character.reset(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && introRunning) { event.preventDefault(); finishIntro(true); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !moduleDialog.open && !settingsDialog.open) { event.preventDefault(); search.focus(); }
  // First keyboard navigation should always land on a stable, visible control.
  if (event.key === 'Tab' && introRunning) finishIntro(true);
});

let pointerFrame;
stage.addEventListener('pointermove', event => {
  if (introRunning || !motionEnabled() || innerWidth < 900 || activeModule) return;
  cancelAnimationFrame(pointerFrame);
  pointerFrame = requestAnimationFrame(() => {
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 2 - 1;
    const y = (event.clientY - rect.top) / rect.height * 2 - 1;
    character.look(Math.max(-1,Math.min(1,x)), Math.max(-1,Math.min(1,y)));
  });
});
stage.addEventListener('pointerleave', () => character.reset());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { character.pause(); if (introRunning) finishIntro(true); }
  else if (!introRunning && !moduleDialog.open && !settingsDialog.open) character.start();
});

// Preserve module links without adding any new business implementation.
const initialModule = location.hash.slice(1);
if (modules.some(module => module.id === initialModule)) openModule(initialModule);
window.studyos = {
  replayIntro: playIntro, finishIntro, openModule,
  // Deterministic native QA can inspect every intermediate frame and interrupt
  // playback without leaving timers, half lids or partial reveal masks behind.
  seekIntro(time, reduced = false) {
    clearIntroTimers(); character.pause(); introRunning = true;
    stage.classList.remove('idle'); stage.classList.add('intro-running');
    stage.dataset.state = 'intro'; document.querySelector('#intro-control').hidden = false;
    document.querySelector('#intro-phase').textContent = reduced ? '欢迎回来' : [...introCaptions].reverse().find(([at])=>at<=time)?.[1] || introCaptions[0][1];
    scene.seek(time, reduced);
  },
  seekBlink(amount) { character.pause(); character.seekBlink(amount); scene.freezeAmbient(); },
  getState: () => ({ introRunning, activeModule, motion: motionEnabled(), scene:scene.getState(), character:character.getState() })
};

async function connectDesktop() {
  if (!window.pywebview?.api || desktopAPI) return;
  desktopAPI = window.pywebview.api;
  try {
    const [info, saved] = await Promise.all([desktopAPI.get_app_info(), desktopAPI.get_preferences()]);
    desktopInfo = info;
    settings = { ...settings, ...saved };
    settings.name = String(settings.name || 'Sam').slice(0,16);
    document.body.dataset.host = 'desktop';
    updateGreeting(); applyMotion();
    if (!settings.intro && introRunning) finishIntro(true);
  } catch { /* The UI stays usable if the optional host bridge is unavailable. */ }
}
window.addEventListener('pywebviewready', connectDesktop);
if (window.pywebview?.api) connectDesktop();
