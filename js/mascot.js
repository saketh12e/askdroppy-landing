// Ask Droppy mascot — one silhouette, many scales.
// Silhouette: a drop that leans its tip up-left and sits on a flat-ish base, the
// way a bead of water rests after leaving the notch. Eyes sit right of centre on
// purpose; the slight asymmetry is the personality.

export const BODY = 'M40 6C46 18 62 26 76 36C92 47 94 72 82 84C72 93 30 94 18 84C6 74 6 50 20 36C28 27 36 20 40 6Z';
const EYES = [
  { cx: 47, cy: 60, rx: 4.4, ry: 7 },
  { cx: 64, cy: 59, rx: 4, ry: 6.4 },
];
const HAPPY = 'M42.5 61Q47 55.5 51.5 61M59.5 60Q64 54.5 68.5 60';

let uid = 0;
const ns = 'http://www.w3.org/2000/svg';

function svg(variant) {
  const id = `m${++uid}`;
  const eyes = EYES.map((e, i) => `<ellipse class="m-eye m-eye--${i ? 'r' : 'l'}" cx="${e.cx}" cy="${e.cy}" rx="${e.rx}" ry="${e.ry}"/>`).join('');

  if (variant === 'mark') {
    // Monochrome mark: silhouette with eye cut-outs, takes currentColor.
    return `<svg viewBox="0 0 100 100" class="mascot mascot--mark" aria-hidden="true" focusable="false">
      <defs><mask id="${id}k"><rect width="100" height="100" fill="#fff"/><g class="m-eyes" fill="#000">${eyes}</g></mask></defs>
      <path d="${BODY}" fill="currentColor" mask="url(#${id}k)"/></svg>`;
  }

  if (variant === 'ink') {
    // The headline's full stop: an ink drop whose eyes are cut out of the black.
    return `<svg viewBox="0 0 100 100" class="mascot mascot--ink" data-mood="rest" aria-hidden="true" focusable="false">
      <g class="m-bodyg"><path class="m-body" d="${BODY}" fill="currentColor"/>
      <g class="m-eyes">${eyes}<path class="m-happy" d="${HAPPY}"/></g></g></svg>`;
  }

  const detailed = variant === 'hero' || variant === 'macro' || variant === 'icon';
  return `<svg viewBox="0 0 100 100" class="mascot mascot--${variant}" data-mood="rest" aria-hidden="true" focusable="false">
    <defs>
      <radialGradient id="${id}b" cx="36%" cy="30%" r="80%">
        <stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#f1f5ff"/>
        <stop offset=".86" stop-color="#c3d3fa"/><stop offset="1" stop-color="#9fb8f4"/>
      </radialGradient>
      ${detailed ? `<radialGradient id="${id}s" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#2a4fd6" stop-opacity="0"/><stop offset="1" stop-color="#2a4fd6" stop-opacity=".28"/></linearGradient>` : ''}
    </defs>
    <g class="m-bodyg">
      <path class="m-body" d="${BODY}" fill="url(#${id}b)"/>
      ${detailed ? `<path d="${BODY}" fill="url(#${id}o)"/>
      <path class="m-fold" d="M66 87.5C76 85 84 78 86.5 68" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse cx="32" cy="34" rx="9" ry="6" transform="rotate(-38 32 34)" fill="url(#${id}s)"/>` : ''}
      <g class="m-eyes">${eyes}
        ${detailed ? `<circle class="m-glint" cx="48.6" cy="56" r="1.4"/><circle class="m-glint" cx="65.4" cy="55.4" r="1.2"/>` : ''}
        <path class="m-happy" d="${HAPPY}"/>
      </g>
    </g></svg>`;
}

export function mountAll(root = document) {
  root.querySelectorAll('[data-mascot]:not([data-mounted])').forEach((el) => {
    el.innerHTML = svg(el.dataset.mascot);
    el.dataset.mounted = '';
  });
}

export function setMood(el, mood) {
  const s = el?.querySelector?.('svg') ?? el;
  if (s) s.dataset.mood = mood;
}

// Gaze: point the eyes of `el` toward a viewport point, limited radius.
export function lookAt(el, x, y, reach = 3.2) {
  const r = el.getBoundingClientRect();
  if (!r.width) return;
  const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 420);
  el.style.setProperty('--gx', ((dx / d) * k * reach).toFixed(2));
  el.style.setProperty('--gy', ((dy / d) * k * reach * 0.8).toFixed(2));
}
export function lookHome(el) { el.style.setProperty('--gx', 0); el.style.setProperty('--gy', 0); }

// Pointer tracking for a set of mascots, only while their section is on screen.
export function track(els, { radius = 520 } = {}) {
  let px = -1e4, py = -1e4, raf = 0;
  const visible = new Set();
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))));
  els.forEach((el) => io.observe(el));
  const tick = () => {
    raf = 0;
    visible.forEach((el) => {
      const r = el.getBoundingClientRect();
      const near = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2)) < radius;
      near ? lookAt(el, px, py) : lookHome(el);
    });
  };
  addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; raf ||= requestAnimationFrame(tick); }, { passive: true });
  document.addEventListener('pointerleave', () => visible.forEach(lookHome));
}

// Occasional blink — every 6–10 s, only for visible mascots at rest. No idle bounce.
export function blinker() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const loop = () => {
    setTimeout(() => {
      if (!document.hidden) {
        document.querySelectorAll('.mascot[data-mood="rest"], .mascot[data-mood="look"]').forEach((s) => {
          const r = s.getBoundingClientRect();
          if (r.bottom > 0 && r.top < innerHeight && r.width) {
            s.classList.add('is-blink');
            setTimeout(() => s.classList.remove('is-blink'), 150);
          }
        });
      }
      loop();
    }, 6000 + Math.random() * 4000);
  };
  loop();
}
