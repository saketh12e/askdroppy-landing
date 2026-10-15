import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate, hover } from 'motion';
import { mountAll, track, blinker, lookAt, lookHome, setMood } from './mascot.js';
import { buildMac } from './mac.js';
import { S, transition, VIEW, LABEL, PROMPTS, VOICE, CHIPS } from './assistant.js';
import { mountGL } from './mascot-gl.js';
import { createOrb } from './orb.js';
import { Assistant } from './controller.js';
import { notchGesture } from './gesture.js';
import { glass } from './glass.js';

gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

// Cancellable sequences: each new run kills the previous token.
const runner = () => { let tok = { dead: true }; return () => { tok.dead = true; tok = { dead: false }; return tok; }; };
const wait = (ms, tok) => new Promise((res, rej) => setTimeout(() => (tok.dead ? rej('cancel') : res()), reduce ? Math.min(ms, 60) : ms));
const swallow = (e) => { if (e !== 'cancel') console.error(e); };

document.documentElement.classList.add('intro');
mountAll();

const macs = {};
$$('.mac-wrap').forEach((w) => (macs[w.id] = buildMac(w)));

/* ───────────── Hero + story (sections 01–02) ───────────── */
const story = $('.story');
const stage = $('.story__stage');
const hero = $('.hero');
const cam = $('.story__camera > .mac-wrap');
const caps = $$('.story__caps li');
const M = macs['mac-story'];
const heroScreen = M.screen;

const hit = document.createElement('button');
hit.className = 'notch-hit';
hit.type = 'button';
hit.setAttribute('aria-label', 'Ask Droppy. Click to open, press and hold to talk.');
hit.setAttribute('aria-describedby', 'notch-howto');
const tip = document.createElement('span');
tip.className = 'notch-tip';
tip.innerHTML = '<b>Click</b> to ask · <b>Hold</b> to talk';
heroScreen.append(hit, tip);

let heroMode = true;       // hero owns the notch until the visitor scrolls
const H = new Assistant(M, { onState: (s) => { hit.setAttribute('aria-expanded', String(![S.IDLE, S.DISMISSING, S.AWAKENING].includes(s))); if (s !== S.IDLE) tip.classList.remove('on'); heroDot(s); } });
H.chips = Object.fromEntries(Object.entries(CHIPS).map(([q, v]) => [q, v]));
const heroGo = runner();
notchGesture(hit, {
  ring: M.ns,
  onTap: () => heroMode && H.tap(),
  onHoldStart: () => heroMode && H.holdStart(VOICE.hero),
  onHoldEnd: () => heroMode && H.holdEnd(),
  onHoldCancel: () => heroMode && H.dismiss(),
});
hit.addEventListener('pointerenter', () => { if (heroMode && H.state === S.IDLE) M.set('wake').mood('look'); });
hit.addEventListener('pointerleave', () => { if (heroMode && H.state === S.IDLE) M.mood('rest'); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && heroMode && H.state !== S.IDLE) H.dismiss(); });

// The headline's full stop is the mascot. It is the first thing that notices you.
const dot = $('.hero__dot');
function heroDot(s) {
  if (!dot) return;
  const mood = { listening: 'listen', thinking: 'think', responding: 'speak', complete: 'done' }[s] || 'rest';
  setMood(dot, mood);
  dot.classList.toggle('is-away', s === S.LISTENING || s === S.THINKING); // it has gone up into the notch
}
dot?.addEventListener('click', () => {
  // A poke: it squeezes its eyes shut, then darts up into the notch to open it.
  setMood(dot, 'squint');
  animate(dot, { scale: [1, 0.86, 1.06, 1], y: [0, 2, -6, 0] }, { duration: 0.5, ease: [0.3, 0, 0.2, 1] });
  setTimeout(() => { setMood(dot, 'rest'); if (heroMode && H.state === S.IDLE) H.tap(); }, 420);
});

requestAnimationFrame(() => requestAnimationFrame(() => {
  document.documentElement.classList.replace('intro', 'ready');
  const tok = heroGo();
  wait(1700, tok).then(() => { if (heroMode && H.state === S.IDLE) M.set('wake').mood('rest'); })
    .then(() => wait(900, tok)).then(() => { if (heroMode && H.state === S.IDLE && scrollY < 40) tip.classList.add('on'); }).catch(swallow);
}));

// Camera: keyframes in progress space. Each key: [p, scale, top(px)]
let geom = {};
function measure() {
  const vh = innerHeight, vw = innerWidth;
  cam.style.transform = 'none';
  const w = cam.offsetWidth, h = cam.offsetHeight;
  const naturalTop = (vh - h) / 2;
  const heroBottom = hero.offsetTop + hero.offsetHeight;
  const mobile = vw < 640;
  const heroS = mobile ? 1.5 : 0.84;
  const close = mobile ? 2.4 : clamp((vw * 0.98) / (w * 0.68), 1.05, 1.62);
  const wide = Math.min(mobile ? 1 : 0.98, (vh * 0.74) / h, (vw * 0.94) / w);
  geom = {
    naturalTop,
    keys: [
      [0, heroS, heroBottom + (mobile ? 28 : 44)],
      [0.16, close, vh * 0.1],
      [0.62, close, vh * 0.1],
      [0.75, wide, (vh - h * wide) / 2 - vh * 0.03],
      [0.83, wide, (vh - h * wide) / 2 - vh * 0.03],
      [0.95, close, vh * 0.1],
      [1, close * 0.94, vh * 0.12],
    ],
  };
}
function camAt(p) {
  const k = geom.keys;
  let i = 0;
  while (i < k.length - 2 && p > k[i + 1][0]) i++;
  const [p0, s0, t0] = k[i], [p1, s1, t1] = k[i + 1];
  const t = ease(seg(p, p0, p1));
  return [lerp(s0, s1, t), lerp(t0, t1, t)];
}

const Q = "What's on my plate today?";
const A = 'Three things. The <b>geometry review</b> at 11, lunch with Maya at 12:30, then two hours blocked for <b>onboarding copy</b>.';
let lastPhase = '';
let storyP = 0;
function storyFrame(p = storyP) {
  const [s, top] = camAt(p);
  cam.style.transform = `translate3d(0, ${(top - geom.naturalTop).toFixed(1)}px, 0) scale(${s.toFixed(4)})`;

  // hero text leaves upward; environment turns dark
  const h = seg(p, 0.015, 0.1);
  hero.style.opacity = 1 - h;
  hero.style.transform = `translate3d(0, ${(-h * 60).toFixed(1)}px, 0)`;
  hero.style.visibility = h >= 1 ? 'hidden' : '';
  const dark = seg(p, 0.05, 0.15);
  stage.style.setProperty('--dark', dark.toFixed(3));
  stage.style.setProperty('--sp', seg(p, 0.16, 1).toFixed(3));

  // hand control from hero to scroll
  const nowHero = p < 0.02;
  if (nowHero !== heroMode) {
    heroMode = nowHero;
    hit.hidden = !nowHero;
    tip.classList.remove('on');
    if (nowHero) { lastPhase = ''; caps.forEach((c) => c.classList.remove('on')); M.ns.classList.remove('is-scrub'); M.wsApply(null); M.type(''); M.voice(''); M.set('wake').mood('rest'); }
    else { H.go(); H.st = S.IDLE; H.voiceMode = false; }
  }
  if (heroMode) return;

  // states — every beat is the same surface; the mascot becomes the orb and back.
  let cap = 0, phase;
  const tx = M.q('.ns__input .tx'), field = M.q('.ns__input');
  const Vw = VOICE.hero.said.split(' ');
  if (p < 0.24) { phase = 'rest'; M.blend('rest', 'rest', 0); M.wsApply(null); cap = p > 0.16 ? 1 : 0; }
  else if (p < 0.33) { phase = 'wake'; M.blend('rest', 'wake', ease(seg(p, 0.24, 0.3))); M.wsApply(null); cap = 2; }
  else if (p < 0.42) { phase = 'ask'; M.wsApply(null); cap = 3; M.blend('wake', 'ask', ease(seg(p, 0.33, 0.39))); }
  else if (p < 0.52) {
    phase = 'listen'; M.wsApply(null); cap = 4;
    M.blend('ask', 'voice', ease(seg(p, 0.42, 0.46)));
    const n = Math.round(seg(p, 0.45, 0.51) * Vw.length);
    M.voice(Vw.slice(0, Math.max(0, n - 1)).join(' ') + (n > 1 ? ' ' : ''), n ? Vw[n - 1] : '');
  } else if (p < 0.58) { phase = 'think'; M.wsApply(null); cap = 5; M.blend('voice', 'think', 1); M.voice(VOICE.hero.said, ''); }
  else if (p < 0.68) { phase = 'shelf'; M.wsApply(null); cap = 6; M.blend('think', 'shelf', ease(seg(p, 0.58, 0.63))); }
  else if (p < 0.82) {
    phase = 'ws'; cap = 7;
    const t = ease(seg(p, 0.68, 0.79));
    M.ws.classList.add('is-scrub'); M.ws.classList.remove('is-timed');
    M.wsApply(t);
    M.blend('shelf', 'wake', clamp(t * 1.6));
  } else {
    phase = 'home'; cap = 8;
    const t = ease(seg(p, 0.82, 0.88));
    if (t < 1) { M.wsApply(1 - t); M.blend('wake', 'shelf', clamp(t * 1.6)); }
    else { M.wsApply(null); M.blend('shelf', 'rest', ease(seg(p, 0.88, 0.95))); }
  }
  if (tx.textContent) { tx.textContent = ''; field.classList.remove('has-text'); }
  if (phase !== lastPhase) {
    lastPhase = phase;
    const mood = { rest: 'rest', wake: 'look', ask: 'look-down', listen: 'listen', think: 'think', shelf: 'speak', ws: 'look-down', home: 'done' }[phase];
    M.mood(mood);
    if (phase === 'shelf' || phase === 'ws' || phase === 'home') M.shelf({ you: VOICE.hero.said, ans: VOICE.hero.a });
    M.right(phase === 'home' ? 'Done' : '', phase === 'home' ? 'done' : '');
    if (phase === 'shelf') setTimeout(() => lastPhase === 'shelf' && M.mood('done'), reduce ? 0 : 900);
    if (phase === 'home') setTimeout(() => lastPhase === 'home' && M.mood('rest'), reduce ? 0 : 1400);
  }
  caps.forEach((c) => c.classList.toggle('on', +c.dataset.i === cap));
}

/* ───────────── Meet (section 03) ─────────────
   The character in full size, and the clearest place to learn the grammar:
   approach → it notices you; click → it squeezes its eyes shut; hold → its body
   becomes the orb and listens; release → think → answer → done → face again. */
const meet = $('.meet');
const poke = $('.meet__poke');
const glr = mountGL($('.meet__gl'), { onFail: () => meet.classList.add('no-gl') });
const fallback = $('.meet__fallback');
const morb = createOrb($('.meet__orb'));
const saidEl = $('.meet__said');
const stateEl = $('#meet-state');
const moodBtns = $$('.meet__moods button');
const meetGo = runner();
let meetMood = null, near = false, noticed = 0;

const FACE = {
  rest:   { think: 0, happy: 0, bright: 0, pitch: 0.06, squash: 0, blink: 0 },
  look:   { think: 0, happy: 0, bright: 0.6, pitch: 0.1 },
  done:   { think: 0, happy: 1, bright: 0, pitch: 0.06 },
  squint: { blink: 1, happy: 0 },
};
function face(k) { if (glr) glr.set(FACE[k]); setMood(fallback, k === 'squint' ? 'squint' : k); }
function asOrb(on, st = 'listen') {
  poke.classList.toggle('is-orb', on);
  if (on) morb.set(st);
  else morb.set('idle');
}
function setMeetMood(m, label) {
  meetMood = m;
  moodBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mood === m)));
  const orb = m === 'listen' || m === 'think' || m === 'speak';
  asOrb(orb, { listen: 'listen', think: 'think', speak: 'respond' }[m]);
  if (!orb) face(m === 'done' ? 'done' : m === 'look' ? 'look' : 'rest');
  if (m === 'done') hop();
  stateEl.textContent = label || { look: 'Curious', listen: 'Listening', think: 'Thinking', speak: 'Answering', done: 'Done', null: 'Hold the character to talk' }[m] || 'Hold the character to talk';
}
function hop() {
  if (!glr || reduce) return;
  glr.set({ squash: 0.12 });
  setTimeout(() => glr.set({ squash: -0.05, hop: 0.2 }), 110);
  setTimeout(() => glr.set({ squash: 0, hop: 0 }), 300);
}
moodBtns.forEach((b) => b.addEventListener('click', () => {
  meetGo();
  saidEl.querySelector('.v-said').textContent = ''; saidEl.querySelector('.v-tail').textContent = '';
  setMeetMood(meetMood === b.dataset.mood ? null : b.dataset.mood);
}));

// Gesture: tap = playful eye squeeze; hold = talk.
notchGesture(poke, {
  ring: poke,
  onTap: () => {
    if (poke.classList.contains('is-orb')) return;
    face('squint');
    if (glr && !reduce) { glr.set({ squash: 0.08 }); setTimeout(() => glr.set({ squash: 0 }), 160); }
    setTimeout(() => { face(meetMood === 'done' ? 'done' : 'look'); hop(); }, 380);
    setTimeout(() => { if (!meetMood) face(near ? 'look' : 'rest'); }, 1400);
    stateEl.textContent = ['Hey!', 'That tickles.', 'Hold me to talk.'][noticed++ % 3];
  },
  onHoldStart: async () => {
    const tok = meetGo();
    setMeetMood('listen', 'Listening — keep holding');
    const words = VOICE.meet.said.split(' ');
    const s1 = saidEl.querySelector('.v-said'), s2 = saidEl.querySelector('.v-tail');
    s1.textContent = ''; s2.textContent = '';
    try {
      await wait(350, tok);
      for (let i = 1; i <= words.length; i++) { s1.textContent = words.slice(0, i - 1).join(' ') + (i > 1 ? ' ' : ''); s2.textContent = words[i - 1]; await wait(260, tok); }
      s1.textContent = VOICE.meet.said; s2.textContent = '';
    } catch (e) { swallow(e); }
  },
  onHoldEnd: async () => {
    const tok = meetGo();
    const s1 = saidEl.querySelector('.v-said'), s2 = saidEl.querySelector('.v-tail');
    if (!s1.textContent) s1.textContent = VOICE.meet.said;
    s2.textContent = '';
    try {
      setMeetMood('think'); await wait(1200, tok);
      setMeetMood('speak'); s1.textContent = ''; await wait(150, tok);
      const a = VOICE.meet.a.split(' ');
      for (let i = 1; i <= a.length; i++) { s1.textContent = a.slice(0, i).join(' '); await wait(110, tok); }
      await wait(500, tok);
      setMeetMood('done'); await wait(1600, tok);
      setMeetMood(null); face(near ? 'look' : 'rest');
    } catch (e) { swallow(e); }
  },
  onHoldCancel: () => { meetGo(); setMeetMood(null); },
});

// Approach: within reach it notices you (eyes widen, turns toward the pointer).
addEventListener('pointermove', (e) => {
  const r = poke.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const cx = r.left + r.width / 2, cy = r.top + r.height * 0.55;
  const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy);
  const nowNear = d < r.width * 0.9;
  if (nowNear !== near) { near = nowNear; if (!meetMood && !poke.classList.contains('is-orb')) face(near ? 'look' : 'rest'); }
  const nx = dx / (d || 1), ny = dy / (d || 1);
  if (poke.classList.contains('is-orb')) { morb.lookAt(nx * 0.8, -ny * 0.8); return; }
  if (glr && meetMood !== 'think') {
    const k = d < 700 ? Math.min(1, d / 380) : 0;
    glr.set({ gx: nx * k * 0.06, gy: -ny * k * 0.05, yaw: -0.18 + nx * k * 0.32 });
  }
  d < 700 ? lookAt(fallback, e.clientX, e.clientY, 4) : lookHome(fallback);
}, { passive: true });

// Scroll: the companion drops out of the notch into the stage, then the light dims as you leave.
function meetFrame(st) {
  const p = st ? st.progress : 0;              // 0 when the section's top hits the viewport bottom
  const enter = ease(clamp(p / 0.32));
  poke.style.setProperty('--drop', `${((1 - enter) * -48).toFixed(2)}vh`);
  poke.style.setProperty('--grow', (0.16 + enter * 0.84).toFixed(4));
  poke.style.setProperty('--shadow', enter.toFixed(3));
  meet.style.setProperty('--lit', (0.4 + enter * 0.6).toFixed(3));
  if (glr && meetMood == null) glr.set({ pitch: 0.06 + (1 - enter) * 0.4 });
}

/* ───────────── Flow (section 04) ───────────── */
const F = macs['mac-flow'];
const tabs = $$('.seg [role="tab"]');
const thumb = $('.seg__thumb');
const flowDesc = $('.flow__desc');
const flowGo = runner();
let flowKey = 'ask', flowSeen = false;
function placeThumb() {
  const b = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
  thumb.style.setProperty('--tx', `${b.offsetLeft}px`);
  thumb.style.setProperty('--ty', `${b.offsetTop - 4}px`);
  thumb.style.setProperty('--tw', `${b.offsetWidth}px`);
}
const FLOWS = {
  ask: {
    scene: 'browser', desc: 'Reading the docs in Safari, you ask a quick question. Safari stays exactly where it was.',
    q: 'How do I make it open on hover?',
    a: 'Turn on <b>Auto-expand</b> in General › Expanded notch, then set an <b>Expand delay</b> you like.',
  },
  ctx: {
    scene: 'doc', desc: 'Select a passage in Notes and ask about it. The selection comes along as context.',
    q: 'Explain this simply', sel: true,
    a: 'Use <b>brightness steps</b> instead of outlines, so the panel always reads as one shape against the black.',
  },
  big: {
    scene: 'doc', desc: 'A short question turns into a real task, and the conversation peels off into a workspace. <em>Proposed capability.</em>',
    q: 'Turn these notes into a launch checklist', sel: false, ws: true,
    a: 'On it. Opening a workspace so you can edit it.',
  },
};
async function playFlow(key) {
  const tok = flowGo();
  const f = FLOWS[key];
  flowDesc.innerHTML = f.desc;
  try {
    F.workspace(false); F.screen.classList.remove('sel-on');
    F.set('rest').mood('rest'); F.type(''); F.right('', '');
    F.setScene(f.scene);
    await wait(500, tok);
    if (f.sel) { F.screen.classList.add('sel-on'); await wait(800, tok); }
    F.set('wake').mood('look'); await wait(420, tok);
    F.set('ask').mood('listen'); await wait(380, tok);
    await F.type(f.q, { token: tok }); await wait(320, tok);
    F.mood('think'); await wait(900, tok);
    F.shelf({ you: f.q, ans: '' }); F.set('shelf').mood('speak');
    await wait(260, tok);
    await F.stream(f.a, { token: tok });
    if (tok.dead) return;
    F.mood('done');
    if (f.ws) {
      await wait(900, tok);
      F.workspace(true);
    } else {
      await wait(2600, tok); F.set('wake').mood('rest'); F.right('Done', 'done');
    }
  } catch (e) { swallow(e); }
}
function selectTab(btn, focus) {
  tabs.forEach((t) => { const on = t === btn; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  $('#flow-panel').setAttribute('aria-labelledby', btn.id);
  if (focus) btn.focus();
  placeThumb();
  flowKey = btn.dataset.flow;
  playFlow(flowKey);
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
    if (e.key === 'Home') { e.preventDefault(); selectTab(tabs[0], true); }
    if (e.key === 'End') { e.preventDefault(); selectTab(tabs[tabs.length - 1], true); }
  });
});
new IntersectionObserver(([e]) => { if (e.isIntersecting && !flowSeen) { flowSeen = true; playFlow(flowKey); } }, { threshold: 0.35 }).observe($('#flow-panel'));

/* ───────────── Bento (section 05) ───────────── */
const inView = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('in-view', e.isIntersecting)), { threshold: 0.2 });
$$('.tile, .mc').forEach((el) => inView.observe(el));

// 01 talk
const wave = $('.wave');
for (let i = 0; i < 30; i++) {
  const b = document.createElement('i');
  const mid = 1 - Math.abs(i - 14.5) / 15;
  b.style.cssText = `--a:${(0.25 + mid * 0.7 * (0.5 + Math.random() * 0.5)).toFixed(2)};--wd:${Math.round(420 + Math.random() * 520)}ms;--dl:${Math.round(-Math.random() * 900)}ms`;
  wave.append(b);
}
const talkEl = $('.talk');
const talkOrb = createOrb($('.talk__orb'));
const talkBtn = $('[data-talk]');
const talkGo = runner();
const tSaid = $('.talk__tx .said'), tTail = $('.talk__tx .tail'), tClock = $('.talk__t');
setMood($('.talk__m'), 'rest');
let tClk = 0;
const talkState = (st) => {
  talkEl.dataset.state = st;
  talkOrb.set({ listen: 'listen', think: 'think', speak: 'respond', done: 'done' }[st] || 'idle');
  setMood($('.talk__m'), st === 'done' ? 'done' : 'rest');
  $('.hold-btn__t').textContent = st === 'listen' ? 'Listening… release to send' : st === 'think' ? 'Thinking…' : 'Hold to talk';
};
const talkStart = async () => {
  const tok = talkGo();
  talkState('listen');
  const t0 = performance.now(); clearInterval(tClk);
  tClk = setInterval(() => { tClock.textContent = `0:${String(Math.floor((performance.now() - t0) / 1000)).padStart(2, '0')}`; }, 250);
  const w = VOICE.talk.said.split(' ');
  tSaid.textContent = ''; tTail.textContent = '';
  try {
    await wait(300, tok);
    for (let i = 1; i <= w.length; i++) { tSaid.textContent = w.slice(0, i - 1).join(' ') + (i > 1 ? ' ' : ''); tTail.textContent = w[i - 1]; await wait(240, tok); }
    tSaid.textContent = VOICE.talk.said; tTail.textContent = '';
  } catch (e) { swallow(e); }
};
const talkEnd = async () => {
  const tok = talkGo();
  clearInterval(tClk);
  if (!tSaid.textContent) tSaid.textContent = VOICE.talk.said;
  tTail.textContent = '';
  try {
    talkState('think'); await wait(1000, tok);
    talkState('done'); tSaid.textContent = VOICE.talk.a; await wait(2600, tok);
    talkState('idle'); tSaid.textContent = ''; tClock.textContent = '0:00';
  } catch (e) { swallow(e); }
};
notchGesture(talkBtn, {
  ring: talkBtn,
  onTap: () => { $('.talk__hint').textContent = 'Keep holding — release to send.'; talkBtn.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 260 }); },
  onHoldStart: talkStart, onHoldEnd: talkEnd, onHoldCancel: () => { talkGo(); clearInterval(tClk); talkState('idle'); tSaid.textContent = ''; },
});
// ⌥ Space anywhere while the tile is on screen — the real shortcut, demonstrated.
let altHeld = false;
addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.altKey && !e.repeat && $('.tile--talk').classList.contains('in-view')) { e.preventDefault(); altHeld = true; talkStart(); }
});
addEventListener('keyup', (e) => { if (altHeld && (e.code === 'Space' || e.key === 'Alt')) { altHeld = false; talkEnd(); } });

// 02 context
const ctxTile = $('.tile--ctx');
const ctxBtn = $('[data-ctx]');
const ctxSet = (on) => { ctxTile.classList.toggle('is-on', on); ctxBtn.textContent = on ? 'Clear' : 'Explain selection'; };
ctxBtn.addEventListener('click', () => ctxSet(!ctxTile.classList.contains('is-on')));
new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => ctxSet(true), reduce ? 0 : 700); } }, { threshold: 0.6 }).observe(ctxTile);

// 03 file drag-to-notch
(() => {
  const doc = $('.file__doc'), target = $('.file__target'), sum = $('.file__sum'), m = $('.file__m');
  let sx, sy, dragging = false;
  const over = (x, y) => { const r = target.getBoundingClientRect(); return x > r.left - 40 && x < r.right + 40 && y < r.bottom + 50 && y > r.top - 20; };
  async function drop() {
    if (target.dataset.state === 'busy') return;
    doc.classList.add('is-dropped');
    target.dataset.state = 'busy'; setMood(m, 'think');
    sum.innerHTML = '<span class="sh" style="width:70%"></span><span class="sh"></span><span class="sh" style="width:52%"></span>';
    await new Promise((r) => setTimeout(r, reduce ? 0 : 1200));
    target.dataset.state = 'done'; setMood(m, 'done');
    sum.innerHTML = '<b>Q4 roadmap, in three lines</b><ul><li>Island ships to beta Oct 24</li><li>Accessibility pass moves up</li><li>External displays in November</li></ul>';
    setTimeout(() => {
      target.dataset.state = 'idle'; sum.innerHTML = ''; setMood(m, 'rest');
      doc.style.transform = ''; doc.classList.remove('is-dropped');
    }, 5200);
  }
  doc.addEventListener('pointerdown', (e) => { if (target.dataset.state !== 'idle') return; dragging = true; sx = e.clientX; sy = e.clientY; doc.setPointerCapture(e.pointerId); doc.classList.add('is-drag'); setMood(m, 'look'); });
  doc.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    doc.style.transform = `translate(${e.clientX - sx}px, ${e.clientY - sy}px) rotate(${clamp((e.clientX - sx) / 30, -6, 6)}deg)`;
    target.dataset.state = over(e.clientX, e.clientY) ? 'hover' : 'idle';
    lookAt(m, e.clientX, e.clientY, 3);
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false; doc.classList.remove('is-drag');
    const moved = Math.hypot(e.clientX - sx, e.clientY - sy) > 6;
    if (over(e.clientX, e.clientY) || !moved) drop();
    else { doc.style.transform = ''; target.dataset.state = 'idle'; setMood(m, 'rest'); lookHome(m); }
  };
  doc.addEventListener('pointerup', end);
  doc.addEventListener('pointercancel', end);
  doc.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drop(); } });
})();

// 04 stay — gentle 3D tilt
(() => {
  const tile = $('.tile--stay'), sc = $('.stay__screen');
  tile.addEventListener('pointermove', (e) => {
    const r = tile.getBoundingClientRect();
    sc.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 16}deg`);
    sc.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 12}deg`);
  });
  tile.addEventListener('pointerleave', () => { sc.style.setProperty('--rx', '0deg'); sc.style.setProperty('--ry', '0deg'); });
})();

// 05 big
$('[data-big]').addEventListener('click', (e) => {
  const big = $('.big'), open = big.dataset.open !== 'true';
  big.dataset.open = String(open);
  e.currentTarget.setAttribute('aria-expanded', String(open));
  e.currentTarget.textContent = open ? 'Back to the shelf' : 'Open workspace';
});

// 06 reach
(() => {
  const items = $$('.reach__apps li'), tile = $('.tile--reach');
  let i = 0;
  items[0].classList.add('on');
  setInterval(() => {
    if (!tile.classList.contains('in-view') || reduce) return;
    items[i].classList.replace('on', 'off');
    const prev = items[i];
    setTimeout(() => prev.classList.remove('off'), 700);
    i = (i + 1) % items.length;
    items[i].classList.add('on');
  }, 1900);
})();

/* ───────────── Live demo (section 06) ─────────────
   The full assistant with every control: four typed prompts, one hold-to-talk
   voice prompt, the notch itself (click / hold), More/Less, actions, Reset, Esc. */
(() => {
  const D = macs['mac-demo'];
  const stateEl = $('.demo__state');
  const btnExpand = $('[data-act="expand"]'), btnReset = $('[data-act="reset"]');
  const pbtns = $$('[data-prompt]');
  const vbtn = $('[data-voice]');
  const highlight = (lines = []) => D.wrap.querySelectorAll('.xc-code .ln').forEach((l) => l.classList.toggle('is-hl', lines.includes(+l.dataset.l)));
  const A = new Assistant(D, {
    onState: (st, label) => {
      if (st === 'workspace') { stateEl.textContent = 'Workspace'; return; }
      stateEl.textContent = label;
      btnExpand.disabled = !(st === S.COMPLETE || st === S.EXPANDED);
      btnExpand.textContent = st === S.EXPANDED ? 'Collapse' : 'Expand';
      btnExpand.setAttribute('aria-expanded', String(st === S.EXPANDED));
      btnReset.disabled = st === S.IDLE || st === S.DISMISSING;
      if (st === S.IDLE || st === S.DISMISSING) { pbtns.forEach((b) => b.setAttribute('aria-pressed', 'false')); highlight(); }
    },
  });
  A.chips = CHIPS;

  const notch = document.createElement('button');
  notch.className = 'notch-hit'; notch.type = 'button';
  notch.setAttribute('aria-label', 'Ask Droppy. Click to open, press and hold to talk.');
  D.screen.append(notch);
  notchGesture(notch, { ring: D.ns, onTap: () => A.tap(), onHoldStart: () => A.holdStart(VOICE.demo), onHoldEnd: () => A.holdEnd(), onHoldCancel: () => A.dismiss() });
  notchGesture(vbtn, { ring: vbtn, onTap: () => { vbtn.querySelector('.pv-t').textContent = 'Keep holding while you “speak”…'; }, onHoldStart: () => { pbtns.forEach((b) => b.setAttribute('aria-pressed', 'false')); A.holdStart(VOICE.demo); }, onHoldEnd: () => { vbtn.querySelector('.pv-t').textContent = 'Hold to say: “Move my 3 o’clock to tomorrow”'; A.holdEnd(); }, onHoldCancel: () => A.dismiss() });

  pbtns.forEach((b) => b.addEventListener('click', () => {
    const P = PROMPTS[b.dataset.prompt];
    pbtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    highlight();
    A.ask({ ...P, scene: P.scene || 'editor', onAnswer: () => P.hl && highlight(P.hl) });
  }));
  btnExpand.addEventListener('click', () => A.toggleExpand());
  btnReset.addEventListener('click', () => A.dismiss());
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || A.state === S.IDLE) return;
    const r = $('#demo').getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) A.dismiss();
  });
})();

/* details: the macro orb listens forever (only renders while visible) */
createOrb($('.mc-orb')).set('listen');

/* ───────────── Day (section 08) ───────────── */
const day = $('.day');
const Dy = macs['mac-day'];
const dayLis = $$('.day__line li');
const dayCap = $('.day__cap');
const dayGo = runner();
let dayIdx = -1;
const DAY = [
  { scene: 'calendar', cap: '<b>9:12.</b> A quick question while you plan the day, spoken.', q: "What's first today?", a: 'Standup at 9:30, then the geometry review at 11.', end: 'shelf', voice: true },
  { scene: 'editor', cap: '<b>11:40.</b> An explanation without leaving Xcode.', q: 'Why monospacedDigit here?', a: 'So the minutes don\'t jitter as the numbers change width.', end: 'shelf', hl: [14, 15] },
  { scene: 'doc', cap: '<b>14:05.</b> Select a paragraph, get the short version.', q: 'Summarize this', a: 'Separate surfaces by tone, not outlines.', end: 'shelf', sel: true },
  { scene: 'doc', cap: '<b>16:30.</b> The review becomes a checklist, in a workspace of its own. <em>Proposed.</em>', q: 'Make this a launch checklist', a: 'Opening a workspace.', end: 'ws' },
  { scene: 'desktop', cap: '<b>18:02.</b> Done for the day. It folds back into the notch.', end: 'rest' },
];
async function playDay(i) {
  const tok = dayGo();
  const d = DAY[i];
  dayCap.innerHTML = d.cap;
  dayLis.forEach((li, k) => li.classList.toggle('on', k <= i));
  try {
    Dy.workspace(false); Dy.screen.classList.remove('sel-on');
    Dy.wrap.querySelectorAll('.xc-code .ln').forEach((l) => l.classList.remove('is-hl'));
    Dy.setScene(d.scene);
    if (d.end === 'rest') { Dy.set('shelf').mood('done'); Dy.right('Done', 'done'); await wait(700, tok); Dy.set('wake').mood('done'); await wait(700, tok); Dy.set('rest').mood('rest'); return; }
    Dy.type(''); Dy.right('', ''); Dy.voice('', '');
    Dy.set('wake').mood('look'); await wait(350, tok);
    if (d.sel) { Dy.screen.classList.add('sel-on'); await wait(500, tok); }
    if (d.voice) {
      Dy.set('voice').mood('listen');
      const w = d.q.split(' ');
      for (let k = 1; k <= w.length; k++) { Dy.voice(w.slice(0, k - 1).join(' ') + (k > 1 ? ' ' : ''), w[k - 1]); await wait(260, tok); }
      Dy.voice(d.q, ''); await wait(250, tok);
      Dy.set('think').mood('think'); await wait(900, tok);
    } else {
      Dy.set('ask').mood('listen');
      await Dy.type(d.q, { token: tok, speed: 22 }); await wait(250, tok);
      Dy.mood('think'); await wait(650, tok);
    }
    Dy.shelf({ you: d.q, ans: d.a }); Dy.set('shelf').mood('speak');
    if (d.hl) Dy.wrap.querySelectorAll('.xc-code .ln').forEach((l) => l.classList.toggle('is-hl', d.hl.includes(+l.dataset.l)));
    await wait(700, tok); Dy.mood('done');
    if (d.end === 'ws') { await wait(500, tok); Dy.workspace(true); }
  } catch (e) { swallow(e); }
}
function dayFrame() {
  const r = day.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const p = clamp(-r.top / (day.offsetHeight - innerHeight));
  day.style.setProperty('--dp', p.toFixed(4));
  const i = Math.min(4, Math.floor(p * 5));
  if (i !== dayIdx && r.top <= 2) { dayIdx = i; playDay(i); }
}

/* ───────────── Final (section 10) ─────────────
   G — return home. The same character, the same notch, the same grammar.
   Approaching the CTA, both the headline drop and the notch look at it. */
(() => {
  const Fm = macs['mac-final'];
  const cta = $('.final__cta');
  const fdot = $('.final__dot');
  const FA = new Assistant(Fm);
  FA.chips = CHIPS;
  const hitF = document.createElement('button');
  hitF.className = 'notch-hit'; hitF.type = 'button';
  hitF.setAttribute('aria-label', 'Ask Droppy. Click to open, press and hold to talk.');
  Fm.screen.append(hitF);
  notchGesture(hitF, { ring: Fm.ns, onTap: () => FA.tap(), onHoldStart: () => FA.holdStart(VOICE.hero), onHoldEnd: () => FA.holdEnd(), onHoldCancel: () => FA.dismiss() });
  let seen = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !seen) { seen = true; setTimeout(() => FA.state === S.IDLE && Fm.set('wake').mood('rest'), reduce ? 0 : 600); }
  }, { threshold: 0.3 }).observe($('.final__mac'));
  const look = (x, y) => { lookAt(Fm.m, x, y, 3.4); lookAt(fdot, x, y, 3.4); };
  addEventListener('pointermove', (e) => {
    if (!seen) return;
    const r = cta.getBoundingClientRect();
    const near = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < 260;
    near ? look(r.left + r.width / 2, r.top + r.height / 2) : look(e.clientX, e.clientY);
  }, { passive: true });
  const on = () => { if (FA.state === S.IDLE) { Fm.set('wake').mood('look'); Fm.right('Ready', ''); } setMood(fdot, 'look'); };
  const off = () => { if (FA.state === S.IDLE) { Fm.mood('rest'); Fm.right('', ''); } setMood(fdot, 'rest'); };
  hover(cta, () => { on(); return off; });
  cta.addEventListener('focus', on); cta.addEventListener('blur', off);
})();

/* ───────────── Nav theme ───────────── */
const nav = $('.nav');
const navSecs = $$('[data-nav]');
function navFrame() {
  let theme = 'light';
  for (const s of navSecs) {
    const r = s.getBoundingClientRect();
    if (r.top <= 28 && r.bottom > 28) {
      theme = s.dataset.nav;
      if (s === story) theme = +stage.style.getPropertyValue('--dark') > 0.5 ? 'dark' : 'light';
      break;
    }
  }
  if (nav.dataset.theme !== theme) nav.dataset.theme = theme;
}

/* ───────────── Scroll choreography (GSAP ScrollTrigger) ─────────────
   The story stage is CSS-sticky (no pin spacer reflow); ScrollTrigger only
   measures progress and scrubs. scrub: 0.6 gives the camera a little physical
   lag so wheel steps glide instead of jumping, and every beat is reversible
   because state is a pure function of progress. */
measure();
placeThumb();
ScrollTrigger.create({
  trigger: story, start: 'top top', end: 'bottom bottom', scrub: reduce ? true : 0.6,
  onUpdate: (st) => { storyP = st.progress; storyFrame(); navFrame(); },
  onRefresh: () => { measure(); storyFrame(); },
});
ScrollTrigger.create({ trigger: meet, start: 'top bottom', end: 'bottom top', onUpdate: meetFrame, onRefresh: meetFrame });
ScrollTrigger.create({ trigger: day, start: 'top bottom', end: 'bottom top', onUpdate: dayFrame });
ScrollTrigger.addEventListener('scrollEnd', navFrame);
addEventListener('scroll', navFrame, { passive: true });
addEventListener('resize', placeThumb);
storyFrame(0);
navFrame();
document.fonts?.ready.then(() => { ScrollTrigger.refresh(); placeThumb(); });
// QA hook: jump the story to progress p, wait for springs to settle.
window.__ad = { macs, storyFrame, H, go: async (p) => { scrollTo(0, story.offsetTop + p * (story.offsetHeight - innerHeight)); await new Promise((r) => setTimeout(r, 1500)); storyFrame(p); await new Promise((r) => setTimeout(r, 1200)); } };

track($$('.ns__m, .talk__m, .reach__ns [data-mascot], .mc--eyes [data-mascot]').filter((el) => !el.closest('#mac-final')));
blinker();
