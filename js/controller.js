// One assistant controller per simulated Mac. Every notch on the page speaks the same
// grammar (click = composer, hold = voice/orb, release = think → answer, Esc = home)
// and goes through the same state machine, so behaviour is identical everywhere.

import { S, transition, VIEW, LABEL } from './assistant.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const runner = () => { let tok = { dead: true }; return () => { tok.dead = true; tok = { dead: false }; return tok; }; };
export const wait = (ms, tok) => new Promise((res, rej) => setTimeout(() => (tok.dead ? rej('cancel') : res()), reduce ? Math.min(ms, 60) : ms));
export const swallow = (e) => { if (e !== 'cancel') console.error(e); };

// Progressive disclosure, level 2: richer controls appear only once the shelf is
// expanded. They are real buttons inside the glass.
const ACTIONS = `<div class="ns__acts">
  <button type="button" class="pill" data-act="copy">Copy</button>
  <button type="button" class="pill" data-act="open">Open in Calendar</button>
  <button type="button" class="pill pill--accent" data-act="ws">Continue in workspace</button>
</div>`;

export class Assistant {
  constructor(mac, { onState } = {}) {
    this.mac = mac;
    this.st = S.IDLE;
    this.go = runner();
    this.onState = onState;
    this.voiceMode = false;
    this.ns = mac.ns;
    this.ns.classList.add('is-live');

    // Controls that live inside the glass surface.
    this.ns.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-chip]');
      const act = e.target.closest('[data-act]');
      const exp = e.target.closest('[data-expand]');
      if (chip) { e.stopPropagation(); this.ask({ q: chip.dataset.chip, ...this.chips?.[chip.dataset.chip] }); }
      if (exp) { e.stopPropagation(); this.toggleExpand(); }
      if (act) {
        e.stopPropagation();
        const a = act.dataset.act;
        if (a === 'ws') { this.mac.workspace(true); this.onState?.('workspace'); }
        else { act.textContent = a === 'copy' ? 'Copied' : 'Opened'; act.disabled = true; }
      }
    });
  }

  get state() { return this.st; }

  to(ev) {
    const n = transition(this.st, ev);
    if (!n) return false;
    this.st = n;
    const v = VIEW[n];
    const geo = n === S.LISTENING && this.voiceMode ? 'voice' : v.geo;
    this.mac.set(geo).mood(v.mood);
    this.mac.right(n === S.COMPLETE ? 'Done' : '', n === S.COMPLETE ? 'done' : '');
    this.ns.dataset.as = n;
    this.onState?.(n, LABEL[n]);
    return true;
  }

  async wake(tok) {
    if (this.st === S.IDLE || this.st === S.DISMISSING) this.to('WAKE');
    if (this.st === S.AWAKENING) { await wait(320, tok); this.to('AWOKE'); }
  }

  // Click: open the composer, or close if already open.
  async tap() {
    if ([S.READY, S.COMPLETE, S.EXPANDED].includes(this.st)) return this.dismiss();
    if (this.st !== S.IDLE && this.st !== S.DISMISSING && this.st !== S.AWAKENING) return;
    const tok = this.go();
    this.voiceMode = false;
    this.mac.workspace(false);
    this.mac.type(''); this.mac.shelf({});
    try { await this.wake(tok); } catch (e) { swallow(e); }
  }

  // Hold: mascot dissolves into the orb; the transcript streams while held.
  holdStart(v) {
    const tok = this.go();
    this.voiceMode = true;
    this.voiceReq = v;
    this.mac.workspace(false);
    if (v.scene) this.mac.setScene(v.scene);
    if (!this.to('HOLD')) { this.voiceMode = false; return; }
    this.mac.shelf({});
    const words = v.said.split(' ');
    this.heard = 0;
    this.mac.voice('', '');
    (async () => {
      try {
        await wait(380, tok);
        while (this.heard < words.length) {
          this.heard++;
          this.mac.voice(words.slice(0, this.heard - 1).join(' ') + (this.heard > 1 ? ' ' : ''), words[this.heard - 1]);
          await wait(170 + Math.random() * 80, tok);
        }
        this.mac.voice(v.said, '');
      } catch (e) { swallow(e); }
    })();
  }

  // Release: finish the sentence, think, answer.
  async holdEnd() {
    if (this.st !== S.LISTENING || !this.voiceMode) return;
    const tok = this.go();
    const v = this.voiceReq;
    this.mac.voice(v.said, '');
    try {
      await wait(160, tok);
      this.to('SENT');
      await wait(650, tok);
      this.to('STREAM');
      this.mac.shelf({ you: v.said, ans: '', extra: (v.more || '') + ACTIONS });
      await wait(160, tok);
      await this.mac.stream(v.a, { token: tok });
      if (tok.dead) return;
      this.to('DONE');
    } catch (e) { swallow(e); }
    this.voiceMode = false;
  }

  holdCancel() { this.dismiss(); }

  // Typed prompt (prompt buttons, chips).
  async ask(P) {
    const tok = this.go();
    this.voiceMode = false;
    this.mac.workspace(false);
    try {
      if (P.scene) this.mac.setScene(P.scene);
      await this.wake(tok);
      this.mac.shelf({});
      this.to('PROMPT');
      await this.mac.type(P.q, { token: tok, speed: 12 });
      await wait(240, tok);
      this.to('SENT');
      await wait(600, tok);
      this.to('STREAM');
      this.mac.shelf({ you: P.q, ans: '', extra: (P.more || '') + ACTIONS });
      P.onAnswer?.();
      await wait(160, tok);
      await this.mac.stream(P.a, { token: tok });
      if (tok.dead) return;
      this.to('DONE');
    } catch (e) { swallow(e); }
  }

  toggleExpand() {
    if (this.st === S.EXPANDED) this.to('COLLAPSE');
    else this.to('EXPAND');
  }

  async dismiss() {
    const tok = this.go();
    this.voiceMode = false;
    this.mac.workspace(false);
    if (!this.to('DISMISS')) return;
    this.mac.type('');
    try { await wait(420, tok); this.to('GONE'); this.mac.shelf({}); } catch (e) { swallow(e); }
  }
}
