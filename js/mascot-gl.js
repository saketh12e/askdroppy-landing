// Real-time Ask Droppy: a raymarched signed-distance drop, porcelain-glass material.
// No dependencies. Renders only while on screen, at most 60fps, DPR capped at 1.75.
// Falls back to the SVG mascot when WebGL is unavailable.

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision highp float;
uniform vec2 R; uniform float T;
uniform vec2 rot;      // yaw, pitch
uniform vec2 gaze;     // eye offset in body units
uniform float blink, happy, squash, hop, think, bright;

mat2 r2(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float smax(float a,float b,float k){return -smin(-a,-b,k);}
float sdEll(vec3 p,vec3 r){float k0=length(p/r),k1=length(p/(r*r));return k0*(k0-1.)/k1;}
float sdRC(vec3 p,vec3 a,vec3 b,float r1,float r2){
  vec3 ba=b-a;float l2=dot(ba,ba),rr=r1-r2,a2=l2-rr*rr,il2=1./l2;vec3 pa=p-a;float y=dot(pa,ba),z=y-l2;
  vec3 xv=pa*l2-ba*y;float x2=dot(xv,xv),y2=y*y*l2,z2=z*z*l2,k=sign(rr)*rr*rr*x2;
  if(sign(z)*a2*z2>k)return sqrt(x2+z2)*il2-r2; if(sign(y)*a2*y2<k)return sqrt(x2+y2)*il2-r1;
  return (sqrt(x2*a2*il2)+y*rr)*il2-r1;}

vec3 toLocal(vec3 p){
  p.y-=hop;
  p.xz=r2(rot.x)*p.xz; p.yz=r2(rot.y)*p.yz;
  float s=1.+squash; p.y/= (1.-squash*.9); p.xz/= s*.98+.02;
  return p;
}
float body(vec3 p){
  float b=sdEll(p-vec3(0.,-.18,0.),vec3(.98,.78,.82));
  float t=sdRC(p,vec3(-.02,.05,0.),vec3(-.5,1.08,-.02),.6,.045);
  float d=smin(b,t,.42);
  d=smax(d,-(p.y+.9),.22);                 // rests on a soft flat base
  // the fold: a shallow crease that wraps the lower right shoulder
  float fold=length(vec2(length(p.xz-vec2(.1,.05))-.86,p.y+.55))-.035;
  d+=.018*smoothstep(.09,0.,fold);
  return d;
}
float map(vec3 p){return body(toLocal(p));}
vec3 nrm(vec3 p){vec2 e=vec2(.0015,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}

// eyes, projected on the front of the body in local space
float eye(vec2 q,vec2 c,vec2 r){
  vec2 u=(q-c)/r; float e=length(u);
  float lid=step(u.y,1.-blink*2.05);                 // blink closes from the top
  float smile=step(1.,length((q-c-vec2(0.,-r.y*.85))/(r*vec2(1.05,1.25))));
  float shape=mix(1.,smile,happy);
  float thin=mix(1.,smoothstep(.62,.5,abs(u.y+.15)),happy); // happy: thin arc
  return smoothstep(1.03,.97,e)*lid*mix(1.,thin*shape,happy);
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  vec3 ro=vec3(0.,.02,4.1), rd=normalize(vec3(uv,-1.62));
  float t=0.,d; bool hit=false;
  for(int i=0;i<90;i++){d=map(ro+rd*t); if(d<.0008){hit=true;break;} t+=d*.9; if(t>8.)break;}
  if(!hit){gl_FragColor=vec4(0.);return;}
  vec3 p=ro+rd*t, n=nrm(p), v=-rd, lp=toLocal(p);

  vec3 L=normalize(vec3(-.55,.85,.7)), Rl=normalize(vec3(.9,-.1,-.45));
  float dif=clamp((dot(n,L)+.35)/1.35,0.,1.);
  float ao=0.;{float s=1.;for(int i=1;i<5;i++){float h=.06*float(i);ao+=(h-map(p+n*h))*s;s*=.6;}ao=clamp(1.-2.2*ao,0.,1.);}
  float thick=clamp(-map(p-n*.28)*3.2,0.,1.);       // thin → more light passes
  float fres=pow(1.-max(dot(n,v),0.),3.);
  vec3 H=normalize(L+v);
  float spec=pow(max(dot(n,H),0.),110.)*1.1+pow(max(dot(n,H),0.),18.)*.035;

  // porcelain key, cool shade; never clips before the specular
  vec3 shade=vec3(.62,.72,.98), lit=vec3(.93,.95,.99);
  vec3 col=mix(shade,lit,smoothstep(0.,1.,dif))*mix(.82,1.,ao);
  col+=vec3(.3,.5,1.)*(1.-thick)*.16;                      // cool subsurface
  col=mix(col,vec3(.42,.6,1.),clamp(-n.y,0.,1.)*.32);      // blue bounce from the stage
  col+=vec3(.6,.8,1.)*fres*.32;                            // rim
  col+=vec3(.75,.88,1.)*pow(max(dot(n,Rl),0.),3.)*.18;     // back light
  col=min(col,vec3(.96));
  col+=spec*.9;

  // eyes (only on the front-facing side)
  vec2 q=lp.xy;
  float front=smoothstep(.15,.45,lp.z);
  vec2 g=gaze+vec2(0.,think*.07);
  float e=max(eye(q,vec2(-.14,-.1)+g,vec2(.088,.15)), eye(q,vec2(.24,-.11)+g,vec2(.08,.138)));
  e*=front;
  vec3 eyeCol=vec3(.035,.06,.19)*(.8+.2*dif);
  col=mix(col,eyeCol,e);
  // glints
  float gl=smoothstep(.026,.012,length(q-(vec2(-.115,-.045)+g)))+smoothstep(.022,.01,length(q-(vec2(.262,-.06)+g)));
  col=mix(col,vec3(1.),gl*e*(1.-happy)*(.85+bright*.15));
  col*=1.+bright*.06;

  col=pow(col,vec3(.92));
  gl_FragColor=vec4(col,1.);
}`;

export function mountGL(canvas, { onFail } = {}) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: true, alpha: true });
  if (!gl) { onFail?.(); return null; }
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { console.warn('[mascot-gl]', e); onFail?.(); return null; }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['R', 'T', 'rot', 'gaze', 'blink', 'happy', 'squash', 'hop', 'think', 'bright'].forEach((k) => (U[k] = gl.getUniformLocation(prog, k)));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // target and current values; current eases toward target each frame (critically damped)
  const tgt = { yaw: -0.18, pitch: 0.06, gx: 0, gy: 0, blink: 0, happy: 0, squash: 0, hop: 0, think: 0, bright: 0 };
  const cur = { ...tgt };
  const vel = Object.fromEntries(Object.keys(tgt).map((k) => [k, 0]));
  const stiff = { yaw: 90, pitch: 90, gx: 160, gy: 160, blink: 900, happy: 200, squash: 420, hop: 260, think: 140, bright: 160 };

  let visible = false, raf = 0, last = 0, t0 = performance.now(), nextBlink = 3;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  };
  new ResizeObserver(resize).observe(canvas);

  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    const time = (now - t0) / 1000;
    if (!reduce && time > nextBlink && tgt.happy < 0.5) { tgt.blink = 1; setTimeout(() => (tgt.blink = 0), 110); nextBlink = time + 5.5 + Math.random() * 4; }
    let moving = false;
    for (const k in tgt) {
      const s = stiff[k], c = 2 * Math.sqrt(s);
      const a = s * (tgt[k] - cur[k]) - c * vel[k];
      vel[k] += a * dt; cur[k] += vel[k] * dt;
      if (Math.abs(vel[k]) > 1e-4 || Math.abs(tgt[k] - cur[k]) > 1e-4) moving = true;
      if (reduce) { cur[k] = tgt[k]; vel[k] = 0; }
    }
    const breathe = reduce ? 0 : Math.sin(time * 1.6) * 0.004; // barely there
    resize();
    gl.uniform2f(U.R, canvas.width, canvas.height);
    gl.uniform1f(U.T, time);
    gl.uniform2f(U.rot, cur.yaw, cur.pitch);
    gl.uniform2f(U.gaze, cur.gx, cur.gy);
    gl.uniform1f(U.blink, Math.max(0, Math.min(1, cur.blink)));
    gl.uniform1f(U.happy, Math.max(0, Math.min(1, cur.happy)));
    gl.uniform1f(U.squash, cur.squash + breathe);
    gl.uniform1f(U.hop, cur.hop);
    gl.uniform1f(U.think, cur.think);
    gl.uniform1f(U.bright, cur.bright);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (visible && (moving || !reduce)) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (visible && !raf) raf = requestAnimationFrame(frame); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = 0; kick(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { visible = !document.hidden && canvas.getBoundingClientRect().bottom > 0; kick(); });

  return {
    set(o) { Object.assign(tgt, o); kick(); },
    get target() { return tgt; },
    impulse(k, v) { vel[k] += v; kick(); },  };
}
