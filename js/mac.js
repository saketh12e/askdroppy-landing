// MacBook + screen scenes + the notch surface.
// Screen content is laid out in points on an 1100 × 714 pt display (a "larger text"
// scaled resolution of a 14" panel). Hardware proportions are physical: the notch is
// 13.2% of the panel width and as tall as the menu bar.

import { mountAll, setMood } from './mascot.js';
import { glass } from './glass.js';
import { createOrb } from './orb.js';

export const PT = { W: 1100, H: 714 };

// Notch surface geometry, in pt. Shelf widths follow DroppyKit: 352pt content + 48pt
// from each opened shoulder; content starts cutout height (24) + 10 below the edge.
// m* = mascot box (x, y, size, opacity). o* = orb centre (x, y), size and opacity.
// In voice states the mascot and orb share one position: the mascot swells and
// dissolves exactly where the orb condenses, so it reads as one being changing form.
export const GEO = {
  rest:  { w: 146, h: 24,  r: 8,  sh: 6,  mx: 14,  my: 4,  ms: 16, mo: 0, ox: 22,  oy: 12, os: 6,  oo: 0, g: 0 },
  wake:  { w: 226, h: 24,  r: 9,  sh: 7,  mx: 12,  my: 3,  ms: 18, mo: 1, ox: 21,  oy: 12, os: 8,  oo: 0, g: 0 },
  ask:   { w: 448, h: 180, r: 26, sh: 14, mx: 48,  my: 36, ms: 28, mo: 1, ox: 62,  oy: 50, os: 12, oo: 0, g: 1 },
  voice: { w: 420, h: 124, r: 30, sh: 14, mx: 182, my: 30, ms: 56, mo: 0, ox: 210, oy: 58, os: 54, oo: 1, g: 1 },
  shelf: { w: 448, h: 236, r: 28, sh: 14, mx: 22,  my: 3,  ms: 18, mo: 1, ox: 31,  oy: 12, os: 10, oo: 0, g: 1 },
  xl:    { w: 696, h: 382, r: 30, sh: 16, mx: 22,  my: 3,  ms: 18, mo: 1, ox: 31,  oy: 12, os: 10, oo: 0, g: 1 },
};
GEO.think = GEO.voice;
// Proposed companion window (not a DroppyKit surface).
export const WS = { x: 170, y: 40, w: 760, h: 540, r: 20 };

const apple = `<svg viewBox="0 0 14 17" aria-hidden="true"><path fill="currentColor" d="M11.6 9c0-2 1.6-2.9 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7s-1.6-.7-2.6-.7C3.5 4.4 2.3 5.2 1.6 6.4.2 8.9 1.2 12.6 2.6 14.6c.7 1 1.5 2 2.5 2s1.4-.6 2.6-.6 1.5.6 2.6.6 1.7-1 2.4-2c.8-1.1 1.1-2.2 1.1-2.3 0 0-2.2-.8-2.2-3.3ZM9.7 3c.5-.7.9-1.6.8-2.5-.8 0-1.8.5-2.3 1.2-.5.6-1 1.5-.8 2.4.8.1 1.8-.4 2.3-1.1Z"/></svg>`;

const ic = {
  wifi: `<svg viewBox="0 0 16 12" aria-hidden="true"><path fill="currentColor" d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0Zm-4-4A5.7 5.7 0 0 1 12 7.5l1.3-1.3a7.5 7.5 0 0 0-10.6 0Zm-2.6-2.6a9.4 9.4 0 0 1 13.2 0L16 3.5a11.3 11.3 0 0 0-16 0Z"/></svg>`,
  batt: `<svg viewBox="0 0 26 12" aria-hidden="true"><rect x=".6" y=".6" width="21.8" height="10.8" rx="3.2" fill="none" stroke="currentColor" stroke-opacity=".5"/><rect x="2.2" y="2.2" width="15" height="7.6" rx="1.8" fill="currentColor"/><path d="M24 4v4c.8-.3 1.3-1.1 1.3-2S24.8 4.3 24 4Z" fill="currentColor" fill-opacity=".5"/></svg>`,
  cc: `<svg viewBox="0 0 14 12" aria-hidden="true"><rect x=".5" y=".5" width="13" height="4.4" rx="2.2" fill="none" stroke="currentColor"/><circle cx="11" cy="2.7" r="1.4" fill="currentColor"/><rect x=".5" y="7.1" width="13" height="4.4" rx="2.2" fill="none" stroke="currentColor"/><circle cx="3" cy="9.3" r="1.4" fill="currentColor"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3.5" width="6" height="11" rx="3" fill="currentColor"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>`,
  up: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 18.5v-13M6.5 11 12 5.5l5.5 5.5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7.5" y="7.5" width="9" height="9" rx="2" fill="currentColor"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.6 3.6 7.4-8" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  expand: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5.5h4.5V10M10 18.5H5.5V14M18.5 5.5l-5 5M5.5 18.5l5-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`,
};

const lights = `<span class="tl"><i></i><i></i><i></i></span>`;

const MENUS = {
  desktop: ['Finder', 'File', 'Edit', 'View', 'Go', 'Window', 'Help'],
  browser: ['Safari', 'File', 'Edit', 'View', 'History', 'Bookmarks', 'Window'],
  editor: ['Xcode', 'File', 'Edit', 'View', 'Find', 'Navigate', 'Editor'],
  doc: ['Notes', 'File', 'Edit', 'Format', 'View', 'Window', 'Help'],
  calendar: ['Calendar', 'File', 'Edit', 'View', 'Window', 'Help'],
};

// Dock: a believable designer/developer's Dock. Artwork is the real macOS icon set
// extracted from the system app bundles (public/dock). `on` marks running apps.
const DOCK = [
  ['finder', 'Finder', 1], ['safari', 'Safari', 1], ['messages', 'Messages', 1], ['mail', 'Mail', 1],
  ['calendar', 'Calendar', 1], ['notes', 'Notes', 1], ['reminders', 'Reminders'], ['freeform', 'Freeform'],
  ['xcode', 'Xcode', 1], ['terminal', 'Terminal'], ['slack', 'Slack', 1], ['music', 'Music'],
  ['system-settings', 'System Settings'], '|', ['preview', 'Preview', 1], ['trash', 'Trash'],
];
const RUNNING = { browser: 'safari', editor: 'xcode', doc: 'notes', calendar: 'calendar', desktop: 'finder' };

const code = [
  ['k', 'import', ' SwiftUI'],
  ['k', 'import', ' DroppyKit'],
  [],
  ['k', 'struct', ' ', 't', 'TodayRow', ': ', 't', 'View', ' {'],
  ['    ', 'k', 'let', ' context: ', 't', 'Context'],
  ['    ', 'k', 'let', ' tasks: [', 't', 'Task', ']'],
  [],
  ['    ', 'k', 'var', ' body: ', 'k', 'some', ' ', 't', 'View', ' {'],
  ['        ', 't', 'VStack', '(alignment: .leading, spacing: ', 't', 'DroppySpacing', '.sm) {'],
  ['            ', 't', 'ForEach', '(tasks) { task ', 'k', 'in'],
  ['                ', 't', 'HStack', ' {'],
  ['                    ', 't', 'Text', '(task.title)'],
  ['                    ', 't', 'Spacer', '(minLength: ', 't', 'DroppySpacing', '.md)'],
  ['                    ', 't', 'Text', '(task.minutes, format: .number)'],
  ['                        .monospacedDigit()'],
  ['                }'],
  ['            }'],
  ['        }'],
  ['        .frame(maxWidth: .infinity, alignment: .topLeading)'],
  ['        ', 'c', '// Pad once, at the root.'],
  ['        .padding(context.contentInsets)'],
  ['    }'],
  ['}'],
];
function codeLine(parts) {
  let out = '', i = 0;
  while (i < parts.length) {
    const p = parts[i];
    if (p === 'k' || p === 't' || p === 'c' || p === 's') { out += `<b class="${p}">${parts[i + 1]}</b>`; i += 2; }
    else { out += p.replace(/</g, '&lt;'); i += 1; }
  }
  return out || ' ';
}

const SCENES = {
  desktop: () => '',
  browser: () => `
    <div class="win win--light win--safari">
      <div class="win__bar">${lights}<span class="sf-side"></span><span class="sf-nav">‹ ›</span>
        <span class="sf-url"><i class="lock"></i>getdroppy.app/docs/notch</span><span class="sf-tools"><i></i><i></i></span></div>
      <div class="win__body sf-page">
        <aside class="sf-toc"><b>On this page</b><span class="on">Shapes</span><span>States and pages</span><span>Interaction</span><span>Timing</span><span>Visibility</span></aside>
        <article class="sf-art">
          <p class="sf-crumb">Docs · Notch</p>
          <h4>The notch, explained</h4>
          <p>Droppy can extend from the hardware notch or float as an island. Notched and notchless screens each get their own style, so a MacBook can use the notch while the monitor beside it uses the island.</p>
          <p class="sf-sel">Hover opens it. Dragging a file onto it opens it to accept the drop, wherever the drag began.</p>
          <p>Auto-collapse closes the notch after the pointer leaves, with a chosen delay. Animation speed makes opening and closing faster or slower.</p>
          <div class="sf-fig"><i></i></div>
        </article>
      </div>
    </div>`,
  editor: () => `
    <div class="win win--dark win--xcode">
      <div class="win__bar">${lights}<span class="xc-scheme">AskDroppy <em>›</em> My Mac</span><span class="xc-status">Build Succeeded <em>| Today at 11:38</em></span></div>
      <div class="win__body xc">
        <aside class="xc-tree">
          <span class="f d">AskDroppy</span><span class="f d i1">Sources</span>
          <span class="f i2 on">TodayRow.swift</span><span class="f i2">Composer.swift</span><span class="f i2">Mascot.swift</span><span class="f i2">AskSurface.swift</span>
          <span class="f i1">droplet.json</span><span class="f d i1">Resources</span>
        </aside>
        <div class="xc-main">
          <div class="xc-tabs"><span class="on">TodayRow.swift</span><span>Composer.swift</span></div>
          <pre class="xc-code">${code.map((l, i) => `<span class="ln" data-l="${i + 1}"><em>${i + 1}</em>${codeLine(l)}</span>`).join('')}</pre>
        </div>
      </div>
    </div>`,
  doc: () => `
    <div class="win win--light win--notes">
      <div class="win__bar">${lights}<span class="nt-title">Island spec — review notes</span></div>
      <div class="win__body nt">
        <aside class="nt-list"><b>Today</b>
          <span class="on"><strong>Island spec — review notes</strong><em>2:01 PM · Shoulder radius…</em></span>
          <span><strong>Onboarding copy</strong><em>11:20 AM · Maya's edits</em></span>
          <span><strong>Q4 roadmap</strong><em>Yesterday · Owners and dates</em></span>
        </aside>
        <div class="nt-doc">
          <h4>Island spec — review notes</h4>
          <p class="nt-meta">October 15 at 2:01 PM</p>
          <p>The island should read as one object on every display. On notchless screens it floats 8pt below the top edge and keeps the same corner family as the notch.</p>
          <p><span class="nt-sel">Contrast comes from fill, not borders. A surface that separates by tone reads as a single shape, even at twelve points.</span> Outlines make it look like a sticker on the wallpaper.</p>
          <p>Open questions: shoulder radius on the 16" panel, and whether hover-to-open should respect the auto-expand delay on external displays.</p>
        </div>
      </div>
    </div>`,
  calendar: () => `
    <div class="win win--light win--cal">
      <div class="win__bar">${lights}<span class="cal-title">Wednesday, October 15</span><span class="cal-seg"><i>Day</i><i class="on">Week</i><i>Month</i></span></div>
      <div class="win__body cal">
        ${['9 AM', '10 AM', '11 AM', 'Noon', '1 PM', '2 PM', '3 PM', '4 PM'].map((h) => `<div class="cal-h"><em>${h}</em></div>`).join('')}
        <div class="cal-ev e1"><b>Standup</b><span>9:30 – 9:45</span></div>
        <div class="cal-ev e2"><b>Geometry review</b><span>11:00 – 12:00 · Island spec</span></div>
        <div class="cal-ev e3"><b>Lunch with Maya</b><span>12:30 – 1:15</span></div>
        <div class="cal-ev e4"><b>Focus: onboarding copy</b><span>2:00 – 4:00</span></div>
        <div class="cal-now" style="--t:.14"><i></i></div>
      </div>
    </div>`,
};

function menubar(scene) {
  const m = MENUS[scene] || MENUS.desktop;
  return `<div class="menubar" aria-hidden="true">
    <div class="mb-l"><span class="mb-apple">${apple}</span><b>${m[0]}</b>${m.slice(1).map((x) => `<span>${x}</span>`).join('')}</div>
    <div class="mb-r"><span class="mb-ic">${ic.batt}</span><span class="mb-ic">${ic.wifi}</span><span class="mb-ic">${ic.cc}</span><span class="mb-clock">Wed Oct 15&nbsp;&nbsp;9:41 AM</span></div>
  </div>`;
}

function notchSurface() {
  // .ns is the Ask Droppy surface: a Liquid Glass body that grows out of the
  // physical camera housing (.ns__cut), which always stays solid black.
  return `<div class="ns" data-state="rest" data-mood="rest">
    <span class="ns__glass" aria-hidden="true"></span>
    <span class="ns__cut" aria-hidden="true"></span>
    <canvas class="ns__orb" aria-hidden="true"></canvas>
    <span class="ns__m" data-mascot="wing"></span>
    <span class="ns__label">Ask Droppy</span>
    <span class="ns__r"><i class="ns__dot"></i><span class="ns__rt"></span></span>
    <span class="ns__cam" aria-hidden="true"></span>
    <div class="ns__voice">
      <span class="v-l"><i class="v-dot"></i><span class="v-lab">Listening</span></span>
      <span class="v-r mono">0:00</span>
      <p class="v-tx"><span class="v-said"></span><span class="v-tail"></span></p>
    </div>
    <div class="ns__ask">
      <p class="ns__greet"><span class="g-text">Hey, what can I help with?</span><span class="g-think">Thinking<i>…</i></span></p>
      <div class="ns__field"><span class="ns__input"><span class="ph">Ask anything</span><span class="tx"></span><i class="caret"></i></span>
        <span class="wash w-mic" aria-hidden="true">${ic.mic}</span><span class="wash wash--accent w-send" aria-hidden="true"><i class="i-up">${ic.up}</i><i class="i-stop">${ic.stop}</i></span></div>
      <div class="ns__chips"><button type="button" tabindex="-1" data-chip="What's on today?">What's on today?</button><button type="button" tabindex="-1" data-chip="Draft a reply to Maya">Draft a reply to Maya</button><button type="button" tabindex="-1" data-chip="Find Q4 roadmap">Find Q4 roadmap</button></div>
      <p class="ns__hint"><kbd>Hold</kbd> the notch to talk</p>
    </div>
    <div class="ns__shelf">
      <p class="ns__you"></p>
      <p class="ns__ans"></p>
      <div class="ns__extra"></div>
    </div>
    <div class="ns__head-r"><button type="button" tabindex="-1" class="pill pill--more" data-expand><span class="more-t">More</span><span class="less-t">Less</span>${ic.expand}</button></div>
    <span class="ns__ring" aria-hidden="true"></span>
  </div>`;
}

function workspace() {
  return `<div class="ws" aria-hidden="true">
    <div class="ws__bar">${lights}<span class="ws__t">Ask Droppy</span><span class="ws__tag">Proposed workspace</span></div>
    <div class="ws__body">
      <div class="ws__chat">
        <p class="you">Turn my review notes into a launch checklist</p>
        <p class="ans">Here's a first pass. I grouped it by owner and pulled dates from your calendar.</p>
        <p class="you">Move accessibility before release notes</p>
        <p class="ans">Done. Release notes now start Oct 21.</p>
        <div class="ws__field">Reply…</div>
      </div>
      <div class="ws__doc">
        <p class="ws__h">Island spec — launch checklist</p>
        <ul>
          <li><s class="on"></s><span>Final geometry review</span><em>Oct 17</em></li>
          <li><s></s><span>Accessibility pass</span><em>Oct 20</em></li>
          <li><s></s><span>Release notes</span><em>Oct 21</em></li>
          <li><s></s><span>Beta build to testers</span><em>Oct 24</em></li>
          <li><s></s><span>Island on external displays</span><em>Oct 28</em></li>
        </ul>
      </div>
    </div>
  </div>`;
}

function dock(scene) {
  const front = RUNNING[scene];
  return `<div class="dock" aria-hidden="true"><div class="dock__plate"></div><div class="dock__row">${DOCK.map((d) =>
    d === '|' ? '<span class="dock__sep"></span>'
      : `<span class="dock__it${d[2] || d[0] === front ? ' is-on' : ''}" data-app="${d[0]}"><img src="/dock/${d[0]}.png" alt="" draggable="false" decoding="async" loading="lazy"><b>${d[1]}</b></span>`,
  ).join('')}</div></div>`;
}

// Dock magnification, modelled on the real thing: icons grow on a cosine falloff of
// cursor distance (about 3 icons wide), the row widens so neighbours slide apart,
// and everything relaxes back on pointer leave. Sizes are in screen points.
function dockMagnify(screen) {
  const d = screen.querySelector('.dock');
  if (!d || matchMedia('(hover: none)').matches) return;
  const items = [...d.querySelectorAll('.dock__it')];
  const BASE = 40, MAXS = 66, RANGE = 132;
  let raf = 0, mx = null;
  const apply = () => {
    raf = 0;
    const pt = screen.getBoundingClientRect().width / PT.W;
    items.forEach((it) => {
      let s = BASE;
      if (mx != null) {
        const r = it.getBoundingClientRect();
        const c = (r.left + r.width / 2 - mx) / pt;
        const k = Math.abs(c) < RANGE ? (Math.cos((c / RANGE) * Math.PI) + 1) / 2 : 0;
        s = BASE + (MAXS - BASE) * k;
      }
      it.style.setProperty('--s', s.toFixed(2));
    });
  };
  d.addEventListener('pointermove', (e) => { mx = e.clientX; d.classList.add('is-mag'); raf ||= requestAnimationFrame(apply); });
  d.addEventListener('pointerleave', () => { mx = null; d.classList.remove('is-mag'); raf ||= requestAnimationFrame(apply); });
  items.forEach((it) => it.addEventListener('click', () => {
    if (it.classList.contains('is-bounce')) return;
    it.classList.add('is-bounce');
    setTimeout(() => { it.classList.remove('is-bounce'); it.classList.add('is-on'); }, 1300);
  }));
}

export function buildMac(wrap) {
  const scene = wrap.dataset.scene || 'desktop';
  wrap.innerHTML = `
  <div class="mac" role="img" aria-label="MacBook with Ask Droppy in the notch">
    <div class="mac__lid">
      <div class="mac__bezel">
        <div class="screen" data-scene="${scene}">
          <div class="wall"></div>
          ${menubar(scene)}
          <div class="app">${SCENES[scene]()}</div>
          ${dock(scene)}
          ${workspace()}
          ${notchSurface()}
          <div class="glare"></div>
        </div>
      </div>
    </div>
    <div class="mac__hinge"></div>
    <div class="mac__base"><i class="mac__scoop"></i></div>
    <div class="mac__shadow"></div>
  </div>`;
  mountAll(wrap);
  const screen = wrap.querySelector('.screen');
  const pt = () => screen.offsetWidth / PT.W;
  // Surface glass: deep convex bezel, but no lensing along the top edge — that edge is
  // fused to the screen bezel, so the lens only lives on the sides and the floor.
  glass(wrap.querySelector('.ns__glass'), { bezel: () => 16 * pt(), scale: () => 30 * pt(), edges: 'nottop' });
  glass(wrap.querySelector('.dock__plate'), { bezel: () => 9 * pt(), scale: () => 16 * pt() });
  dockMagnify(screen);
  return new Mac(wrap);
}

const lerp = (a, b, t) => a + (b - a) * t;

export class Mac {
  constructor(wrap) {
    this.wrap = wrap;
    this.screen = wrap.querySelector('.screen');
    this.ns = wrap.querySelector('.ns');
    this.ws = wrap.querySelector('.ws');
    this.m = wrap.querySelector('.ns__m');
    this.orb = createOrb(wrap.querySelector('.ns__orb'));
    this.state = 'rest';
    this.apply(GEO.rest);
    this.wsApply(null);
  }
  q(sel) { return this.wrap.querySelector(sel); }

  apply(g) {
    const s = this.ns.style;
    for (const k in g) s.setProperty('--' + k, g[k]);
  }

  // Timed state change; CSS springs do the motion.
  set(state, { scrub = false } = {}) {
    this.ns.classList.toggle('is-scrub', scrub);
    this.state = state;
    this.ns.dataset.state = state;
    this.apply(GEO[state]);
    this.fit();
    requestAnimationFrame(() => this.fit()); // extras enter the flow only after the state flips
    return this;
  }

  // Shelf states size to their content, as an expanded surface re-queries its size
  // when the droplet's state changes. Never below the state's base height.
  fit() {
    const st = this.state;
    if (st !== 'shelf' && st !== 'xl') return;
    const h = this.fitHeight(st);
    if (h) this.ns.style.setProperty('--h', h);
  }
  fitHeight(st) {
    const sh = this.q('.ns__shelf');
    // Layout width, not getBoundingClientRect: camera zoom and intro transforms must
    // not change the measured point size (scrollHeight is untransformed too).
    const pt = this.screen.offsetWidth / PT.W;
    if (!pt) return 0;
    const need = Math.ceil(36 + sh.scrollHeight / pt + 22); // extras are out of flow unless xl
    return Math.min(PT.H * 0.66, Math.max(st === 'shelf' ? 96 : 120, need));
  }

  // Scroll-scrubbed blend between two states.
  blend(a, b, t) {
    this.ns.classList.add('is-scrub');
    const A = GEO[a], B = GEO[b], g = {};
    for (const k in A) g[k] = +lerp(A[k], B[k], t).toFixed(2);
    this.apply(g);
    const s = t < 0.5 ? a : b;
    if (this.ns.dataset.state !== s) this.ns.dataset.state = s;
    this.state = s;
    // Scrubbed shelf heights blend toward the content-fitted height, not the max.
    if (b === 'shelf' || a === 'shelf') {
      const fitH = this.fitHeight('shelf');
      if (fitH) {
        const hA = a === 'shelf' ? fitH : A.h, hB = b === 'shelf' ? fitH : B.h;
        this.ns.style.setProperty('--h', +lerp(hA, hB, t).toFixed(2));
      }
    }
  }

  mood(m) {
    this.ns.dataset.mood = m;
    setMood(this.m, m);
    // The orb carries the same mood vocabulary as the face.
    const om = { listen: 'listen', think: 'think', speak: 'respond', done: 'done' }[m] || 'idle';
    if (this.orb && this.orb.state !== om) this.orb.set(om);
    if (m === 'listen' && this._lastMood !== 'listen') this.voiceClock(true);
    if (m !== 'listen') this.voiceClock(false);
    this._lastMood = m;
    return this;
  }

  // Live transcript inside the voice capsule. `said` is confirmed, `tail` still settling.
  voice(said = '', tail = '') {
    this.q('.v-said').textContent = said;
    this.q('.v-tail').textContent = tail;
  }
  voiceClock(run) {
    clearInterval(this._clk);
    const el = this.q('.v-r');
    if (!run) return;
    const t0 = performance.now();
    el.textContent = '0:00';
    this._clk = setInterval(() => {
      if (this.ns.dataset.mood !== 'listen') return clearInterval(this._clk);
      const s = Math.floor((performance.now() - t0) / 1000);
      el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }, 250);
  }

  // Workspace window: null hides it at the shelf rect; t in [0,1] grows it from the shelf.
  wsApply(t) {
    const st = this.ws.style;
    const from = { x: (PT.W - GEO.shelf.w) / 2, y: 0, w: GEO.shelf.w, h: GEO.shelf.h, r: GEO.shelf.r };
    const k = t == null ? 0 : t;
    st.setProperty('--x', lerp(from.x, WS.x, k));
    st.setProperty('--y', lerp(from.y, WS.y, k));
    st.setProperty('--w', lerp(from.w, WS.w, k));
    st.setProperty('--h', lerp(from.h, WS.h, k));
    st.setProperty('--r', lerp(from.r, WS.r, k));
    this.ws.classList.toggle('is-on', t != null);
    this.ws.style.setProperty('--c', t == null ? 0 : Math.min(1, Math.max(0, (k - 0.55) / 0.35)));
  }
  workspace(on, { scrub = false } = {}) {
    this.ws.classList.toggle('is-scrub', scrub);
    this.ws.classList.toggle('is-timed', !scrub);
    if (on) {
      // Hand-off: the window appears exactly over the shelf, then the notch steps back.
      this.wsApply(0);
      requestAnimationFrame(() => requestAnimationFrame(() => { this.wsApply(1); this.set('wake'); this.mood('look-down'); }));
    } else {
      this.wsApply(null);
    }
  }

  setScene(scene) {
    this.wantScene = scene; // last request wins, even if a swap is already in flight
    if (this.screen.dataset.scene === scene || this.swapping) return;
    const app = this.q('.app');
    app.classList.add('is-out');
    this.swapping = true;
    setTimeout(() => {
      this.swapping = false;
      const s = this.wantScene;
      this.screen.dataset.scene = s;
      app.innerHTML = SCENES[s]();
      this.q('.menubar').outerHTML = menubar(s);
      const front = this.q(`.dock__it[data-app="${RUNNING[s]}"]`);
      if (front) front.classList.add('is-on');
      app.classList.remove('is-out');
    }, 180);
  }

  // Content helpers
  type(text, { speed = 28, token } = {}) {
    const tx = this.q('.ns__input .tx');
    const field = this.q('.ns__input');
    field.classList.toggle('has-text', !!text);
    if (!text) { tx.textContent = ''; return Promise.resolve(); }
    tx.textContent = '';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { tx.textContent = text; return Promise.resolve(); }
    return new Promise((res) => {
      let i = 0;
      const step = () => {
        if (token && token.dead) return res();
        tx.textContent = text.slice(0, ++i);
        i < text.length ? setTimeout(step, speed + Math.random() * 22) : res();
      };
      step();
    });
  }
  shelf({ you = '', ans = '', extra = '' } = {}) {
    this.q('.ns__you').textContent = you;
    this.q('.ns__you').hidden = !you;
    this.q('.ns__ans').innerHTML = ans;
    this.q('.ns__extra').innerHTML = extra;
    this.fit();
  }
  stream(html, { token, wps = 48 } = {}) {
    const el = this.q('.ns__ans');
    const words = html.split(/(\s+)/);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.innerHTML = html; this.fit(); return Promise.resolve(); }
    el.innerHTML = '';
    return new Promise((res) => {
      let i = 0;
      const step = () => {
        if (token && token.dead) return res();
        i = Math.min(words.length, i + 2);
        el.innerHTML = words.slice(0, i).join('');
        this.fit();
        i < words.length ? setTimeout(step, 1000 / wps * 2) : res();
      };
      step();
    });
  }
  right(text = '', kind = '') {
    this.q('.ns__rt').textContent = text;
    this.q('.ns__r').dataset.kind = kind;
  }
}

export const ICON = ic;
