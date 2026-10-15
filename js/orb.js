// The Ask Droppy intelligence orb.
//
// Signature behaviour (deliberately not Siri's swirling plasma): the orb is the
// mascot's own body, turned luminous. It keeps the drop's point — a soft peak that
// leans toward whatever it is attending to — and ripples travel outward from that
// point like a touched droplet.
//   idle     slow breath, no ripples, point at rest
//   listen   ripple amplitude follows the voice level; the point leans toward the speaker
//   think    the point circles the equator; light condenses into the core
//   respond  pulses travel core → rim in time with streamed words
//   done     one ring wave, rim warms for a beat, the surface settles flat
//
// One shared Three.js renderer draws every orb into its own 2D canvas, so any number
// of orbs cost one WebGL context. Orbs render only while visible and not idle-settled.

// Three.js loads on demand (first orb that becomes visible), keeping it off the critical path.
let THREE = null;
const threeReady = import('three').then((m) => { THREE = m; });

const VERT = /* glsl */`
uniform float uTime, uLevel, uThink, uRespond, uDone, uLean;
uniform vec3 uDir;
varying vec3 vP; varying float vRip;
vec3 hash(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return -1.+2.*fract(sin(p)*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);vec3 u=f*f*(3.-2.*f);
  return mix(mix(mix(dot(hash(i),f),dot(hash(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(hash(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
             mix(mix(dot(hash(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(hash(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);}
void main(){
  vec3 n=normalize(position);
  vec3 dir=normalize(uDir);
  float a=acos(clamp(dot(n,dir),-1.,1.));
  float rip=sin(a*mix(7.,11.,uRespond)-uTime*mix(5.,10.,uRespond))*exp(-a*.85);
  float d=rip*(.012+uLevel*.08+uRespond*.03);
  d+=noise(n*2.1+uTime*.32)*(.025+uLevel*.045+uThink*.02);
  d+=.13*uLean*pow(max(dot(n,dir),0.),7.);
  d+=uDone*.07*sin(a*4.-uTime*9.)*exp(-a*1.3);
  vRip=rip;
  vec3 p=n*(1.+d);
  vP=(modelViewMatrix*vec4(p,1.)).xyz;
  gl_Position=projectionMatrix*vec4(vP,1.);
}`;

const FRAG = /* glsl */`
uniform float uLevel, uThink, uRespond, uDone;
varying vec3 vP; varying float vRip;
void main(){
  vec3 n=normalize(cross(dFdx(vP),dFdy(vP)));   // faceted-free: dense mesh + screen-space normal
  vec3 v=normalize(-vP);
  float fr=pow(1.-max(dot(n,v),0.),2.);
  float core=pow(max(dot(n,v),0.),3.);
  // Cobalt glass lit from within. Every additive term is weighted toward blue so the
  // body never drifts to cyan/green, then a soft shoulder compresses highlights.
  vec3 deep=vec3(.02,.07,.42), mid=vec3(.08,.3,.95), rim=vec3(.5,.78,1.);
  vec3 c=mix(deep,mid,smoothstep(0.,.8,fr+.18));
  c=mix(c,rim,smoothstep(.55,1.,fr)*.85);
  c+=vec3(.18,.42,1.)*pow(core,1.8)*(.35+uLevel*.3+uThink*.5+uRespond*.28);
  c+=vec3(.25,.5,1.)*smoothstep(.5,1.,vRip)*(.1+uLevel*.45+uRespond*.2);
  vec3 L1=normalize(vec3(-.5,.75,.6)), L2=normalize(vec3(.6,-.5,.45));
  c+=vec3(.95,.97,1.)*pow(max(dot(reflect(-L1,n),v),0.),60.)*.9+vec3(.3,.55,1.)*pow(max(dot(reflect(-L2,n),v),0.),16.)*.2;
  c+=vec3(.45,.7,1.)*uDone*.25*fr;
  c=c/(1.+max(c-1.,0.));                     // shoulder: keep hue when a channel would clip
  gl_FragColor=vec4(c,1.);
}`;

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX = 640;
let shared = null;

function getShared() {
  if (shared !== null) return shared;
  if (!THREE) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = MAX;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power', preserveDrawingBuffer: false, premultipliedAlpha: false });
    renderer.setPixelRatio(1);
    renderer.setSize(MAX, MAX, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // shader colours are authored in display space
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 10);
    cam.position.z = 4.7;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, toneMapped: false,
      uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uThink: { value: 0 }, uRespond: { value: 0 }, uDone: { value: 0 }, uLean: { value: 0.5 }, uDir: { value: new THREE.Vector3(-0.4, 0.6, 0.7) } },
    });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 24), mat);
    scene.add(mesh);
    shared = { canvas, renderer, scene, cam, mat, mesh };
  } catch (e) {
    console.warn('[orb] WebGL unavailable', e);
    shared = false;
  }
  return shared;
}

const orbs = new Set();
let raf = 0, last = 0;
function loop(now) {
  raf = 0;
  const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
  let any = false;
  for (const o of orbs) if (o._tick(dt)) any = true;
  if (any) raf = requestAnimationFrame(loop);
  else last = 0;
}
const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

const STATES = {
  idle:    { level: 0, think: 0, respond: 0, done: 0, lean: 0.45 },
  listen:  { level: 0.45, think: 0, respond: 0, done: 0, lean: 0.95 },
  think:   { level: 0.04, think: 1, respond: 0, done: 0, lean: 0.75 },
  respond: { level: 0.12, think: 0.2, respond: 1, done: 0, lean: 0.5 },
  done:    { level: 0, think: 0, respond: 0, done: 1, lean: 0.35 },
};

export function createOrb(canvas) {
  let S = getShared();
  threeReady.then(() => { S = getShared(); draw(); });
  const ctx = canvas.getContext('2d');
  const tgt = { ...STATES.idle, dx: -0.4, dy: 0.6 };
  const cur = { ...tgt };
  let state = 'idle', visible = false, t = Math.random() * 10, ext = null, settle = 0;

  const draw = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.clearRect(0, 0, w, h);
    if (!S) { // static fallback: a lit sphere drawn in 2D
      const g = ctx.createRadialGradient(w * 0.38, h * 0.32, w * 0.04, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#eaf6ff'); g.addColorStop(0.35, '#3d86ff'); g.addColorStop(0.85, '#0b2fc4'); g.addColorStop(1, 'rgba(11,47,196,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); ctx.fill();
      return;
    }
    // Small orbs render at a minimum internal size: tiny viewports undersample the
    // displaced mesh and alias the rim (green fringing from mixed partial pixels).
    const s = Math.min(MAX, Math.max(w, h, 256));
    const U = S.mat.uniforms;
    U.uTime.value = t; U.uLevel.value = cur.level; U.uThink.value = cur.think; U.uRespond.value = cur.respond;
    U.uDone.value = cur.done; U.uLean.value = cur.lean; U.uDir.value.set(cur.dx, cur.dy, 0.75).normalize();
    S.mesh.rotation.y = Math.sin(t * 0.3) * 0.25;
    S.renderer.setScissorTest(false);
    S.renderer.setViewport(0, 0, MAX, MAX);
    S.renderer.clear();
    S.renderer.setViewport(0, 0, s, s);
    S.renderer.setScissor(0, 0, s, s); S.renderer.setScissorTest(true);
    S.renderer.render(S.scene, S.cam);
    ctx.drawImage(S.canvas, 0, MAX - s, s, s, 0, 0, w, h);
  };

  const api = {
    _tick(dt) {
      if (!visible) return false;
      t += reduce ? 0 : dt;
      if (state === 'listen' && ext == null && !reduce) {
        tgt.level = 0.3 + 0.5 * Math.abs(Math.sin(t * 5.1) * Math.sin(t * 1.9 + 1.3)) + 0.15 * Math.random();
      }
      if (state === 'think') { tgt.dx = Math.cos(t * 1.5) * 0.95; tgt.dy = 0.1 + Math.sin(t * 0.8) * 0.25; }
      const k = 1 - Math.exp(-dt * 8);
      let moving = false;
      for (const key in cur) { const d = tgt[key] - cur[key]; cur[key] += d * k; if (Math.abs(d) > 0.002) moving = true; }
      draw();
      // Keep animating while active; once idle and settled, stop to save battery.
      if (state !== 'idle' || moving) { settle = 0; return !reduce; }
      return ++settle < 30;
    },
    set(s) {
      if (!STATES[s]) return api;
      state = s;
      Object.assign(tgt, STATES[s]);
      if (s !== 'think') { tgt.dx = -0.4; tgt.dy = 0.6; }
      if (s === 'done') setTimeout(() => { if (state === 'done') tgt.done = 0; }, 900);
      if (reduce) { Object.assign(cur, tgt); draw(); } else kick();
      return api;
    },
    get state() { return state; },
    level(v) { ext = v; if (v != null) tgt.level = v; kick(); },
    lookAt(nx, ny) { if (state !== 'think') { tgt.dx = nx; tgt.dy = ny; kick(); } },
    redraw: draw,
  };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) { draw(); kick(); } }).observe(canvas);
  orbs.add(api);
  return api;
}
