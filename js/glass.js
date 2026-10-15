// Liquid Glass, simulated for the browser.
//
// Real lensing: each glass element gets an SVG filter whose displacement map is
// generated from the element's own rounded-rect signed distance field. Pixels in
// the bezel band are pushed along the inward normal, strongest at the rim, which
// bends the content behind the edge the way a thick convex lens does.
// The map is used through `backdrop-filter: url(#id)`. Only Chromium renders that,
// so other engines get the same element with blur + saturation (no lensing).
//
// Usage: glass(el, { bezel, scale, radii, edges }) — sizes are read from layout,
// so transforms (camera zoom) do not invalidate the map.

const NS = 'http://www.w3.org/2000/svg';
// Safari/Firefox parse url() backdrop filters but don't render them, so gate on Blink.
export const lensing = /Chrome\/\d+/.test(navigator.userAgent) && CSS.supports('backdrop-filter', 'url(#a)')
  && !matchMedia('(prefers-reduced-transparency: reduce)').matches;
document.documentElement.classList.toggle('lens', lensing);

let defs;
function root() {
  if (defs) return defs;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  defs = document.createElementNS(NS, 'defs');
  svg.append(defs);
  document.body.prepend(svg);
  return defs;
}

const cache = new Map();
// Rounded box SDF with per-corner radii [tl, tr, br, bl].
function sdf(x, y, w, h, R) {
  const cx = x - w / 2, cy = y - h / 2;
  const r = cx < 0 ? (cy < 0 ? R[0] : R[3]) : (cy < 0 ? R[1] : R[2]);
  const qx = Math.abs(cx) - (w / 2 - r), qy = Math.abs(cy) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

// Returns a data URL: R/G encode displacement (128 = none), B unused.
function makeMap(w, h, R, bezel, edges, res) {
  const key = [w, h, R.join(), bezel, edges, res].join('|');
  if (cache.has(key)) return cache.get(key);
  const W = Math.max(2, Math.round(w * res)), H = Math.max(2, Math.round(h * res));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const im = x.createImageData(W, H);
  const d8 = im.data;
  const s = 1 / res;
  for (let j = 0; j < H; j++) {
    const py = (j + 0.5) * s;
    for (let i = 0; i < W; i++) {
      const px = (i + 0.5) * s;
      const k = (j * W + i) * 4;
      let r = 128, g = 128;
      const d = -sdf(px, py, w, h, R);
      if (d > 0 && d < bezel && !(edges === 'nottop' && py < bezel * 1.2)) {
        const e = 0.6;
        const nx = sdf(px + e, py, w, h, R) - sdf(px - e, py, w, h, R);
        const ny = sdf(px, py + e, w, h, R) - sdf(px, py - e, w, h, R);
        const L = Math.hypot(nx, ny) || 1;
        // Convex squircle profile: steep at the rim, flat toward the centre.
        const t = 1 - d / bezel;
        const m = Math.pow(t, 2.2);
        r = 128 - (nx / L) * m * 127;
        g = 128 - (ny / L) * m * 127;
      }
      d8[k] = r; d8[k + 1] = g; d8[k + 2] = 128; d8[k + 3] = 255;
    }
  }
  x.putImageData(im, 0, 0);
  const url = c.toDataURL();
  if (cache.size > 120) cache.delete(cache.keys().next().value);
  cache.set(key, url);
  return url;
}

let n = 0;
const live = new Set();

export function glass(el, opts = {}) {
  el.classList.add('glass');
  if (!lensing) return { refresh() {}, el };
  const id = `lg${++n}`;
  const f = document.createElementNS(NS, 'filter');
  f.setAttribute('id', id);
  f.setAttribute('filterUnits', 'userSpaceOnUse');
  f.setAttribute('primitiveUnits', 'userSpaceOnUse');
  f.setAttribute('color-interpolation-filters', 'sRGB');
  f.setAttribute('x', 0); f.setAttribute('y', 0);
  const img = document.createElementNS(NS, 'feImage');
  img.setAttribute('preserveAspectRatio', 'none');
  img.setAttribute('result', 'map');
  const dm = document.createElementNS(NS, 'feDisplacementMap');
  dm.setAttribute('in', 'SourceGraphic');
  dm.setAttribute('in2', 'map');
  dm.setAttribute('xChannelSelector', 'R');
  dm.setAttribute('yChannelSelector', 'G');
  f.append(img, dm);
  root().append(f);

  const o = { bezel: 18, scale: 36, radii: null, edges: 'all', ...opts };
  let last = '', timer = 0, lastFast = 0;
  const radii = () => {
    if (o.radii) return typeof o.radii === 'function' ? o.radii() : o.radii;
    const cs = getComputedStyle(el);
    return ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map((p) => parseFloat(cs[p]) || 0);
  };
  const build = (res) => {
    const w = el.offsetWidth, h = el.offsetHeight;
    if (w < 4 || h < 4) return;
    const R = radii().map((r) => Math.min(r, w / 2, h / 2));
    const bz = Math.min(typeof o.bezel === 'function' ? o.bezel(w, h) : o.bezel, w / 2, h / 2);
    const key = [w, h, R.join(), bz, res].join('|');
    if (key === last) return;
    last = key;
    img.setAttribute('href', makeMap(w, h, R, bz, o.edges, res));
    for (const a of [f, img]) { a.setAttribute('width', w); a.setAttribute('height', h); }
    const sc = typeof o.scale === 'function' ? o.scale(w, h) : o.scale;
    dm.setAttribute('scale', sc);
  };
  // While a surface is morphing, build cheap half-resolution maps; settle at full.
  const refresh = () => {
    const now = performance.now();
    if (now - lastFast > 90) { lastFast = now; build(0.4); }
    clearTimeout(timer);
    timer = setTimeout(() => build(1), 140);
  };
  new ResizeObserver(refresh).observe(el);
  el.style.setProperty('--lens', `url(#${id})`);
  build(1);
  const api = { el, refresh, set(k, v) { o[k] = v; last = ''; refresh(); } };
  live.add(api);
  return api;
}

// Specular light: one soft key light that follows the pointer a little, shared by
// every glass element. Elements read --lx / --ly (0..1) in their own box.
let raf = 0, px = innerWidth * 0.3, py = -200;
function lightTick() {
  raf = 0;
  document.querySelectorAll('.glass.is-lit').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || !r.width) return;
    const lx = Math.min(1.2, Math.max(-0.2, (px - r.left) / r.width));
    const ly = Math.min(1.2, Math.max(-0.2, (py - r.top) / r.height));
    el.style.setProperty('--lx', (lx * 100).toFixed(1) + '%');
    el.style.setProperty('--ly', (ly * 100).toFixed(1) + '%');
  });
}
addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; raf ||= requestAnimationFrame(lightTick); }, { passive: true });
