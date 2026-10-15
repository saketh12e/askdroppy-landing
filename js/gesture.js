// One interaction grammar for every notch on the page.
//
//   click / Enter          wake → open the glass composer
//   press & hold / Space   (after 260 ms) the mascot dissolves into the orb: listening
//   release                listening → thinking → answer streams into the shelf
//   Esc / click outside    everything folds back home
//
// The hold threshold is short enough to feel immediate and long enough that a
// normal click never triggers voice. While held, a progress ring fills around the
// notch so the gesture teaches itself.

import { press } from 'motion';

const HOLD_MS = 260;

export function notchGesture(el, { onTap, onHoldStart, onHoldEnd, onHoldCancel, ring }) {
  let timer = 0, holding = false, downAt = 0;
  const start = () => {
    downAt = performance.now();
    holding = false;
    ring?.classList.add('is-charging');
    timer = setTimeout(() => {
      holding = true;
      ring?.classList.remove('is-charging');
      ring?.classList.add('is-held');
      onHoldStart?.();
    }, HOLD_MS);
  };
  const end = (success) => {
    clearTimeout(timer);
    ring?.classList.remove('is-charging', 'is-held');
    // Releasing a held voice press anywhere sends it — drifting off the notch while
    // talking is normal. Only a pointercancel (or blur) cancels.
    if (holding) { holding = false; success !== 'cancel' ? onHoldEnd?.(performance.now() - downAt) : onHoldCancel?.(); }
    else if (success === true) onTap?.();
  };

  // Pointer (motion's press filters secondary buttons/multitouch and gives keyboard Enter).
  press(el, () => { start(); return (ev, { success }) => end(ev.type === 'pointercancel' ? 'cancel' : success); });

  // Space is our hold key for keyboard users; Enter stays a click (handled by press()).
  el.addEventListener('keydown', (e) => {
    if (e.key === ' ' && !e.repeat) { e.preventDefault(); start(); }
  });
  el.addEventListener('keyup', (e) => { if (e.key === ' ') { e.preventDefault(); end(true); } });
  el.addEventListener('blur', () => { if (holding) end('cancel'); else clearTimeout(timer); });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
