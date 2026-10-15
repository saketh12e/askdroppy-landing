// Ask Droppy demo state machine. Pure: transition(state, event) -> state | null.
// One state value drives the whole demo, never a pile of booleans.

export const S = {
  IDLE: 'idle', AWAKENING: 'awakening', READY: 'ready', LISTENING: 'listening',
  THINKING: 'thinking', RESPONDING: 'responding', COMPLETE: 'complete',
  EXPANDED: 'expanded', DISMISSING: 'dismissing',
};

// event -> { from: [states] | '*', to }
const T = {
  WAKE:     { from: [S.IDLE, S.DISMISSING], to: S.AWAKENING },
  AWOKE:    { from: [S.AWAKENING], to: S.READY },
  PROMPT:   { from: [S.READY, S.COMPLETE, S.EXPANDED, S.LISTENING, S.THINKING, S.RESPONDING], to: S.LISTENING },
  // Press and hold: straight into voice listening from anywhere calm, even asleep.
  HOLD:     { from: [S.IDLE, S.AWAKENING, S.READY, S.COMPLETE, S.EXPANDED, S.DISMISSING], to: S.LISTENING },
  SENT:     { from: [S.LISTENING], to: S.THINKING },
  STREAM:   { from: [S.THINKING], to: S.RESPONDING },
  DONE:     { from: [S.RESPONDING], to: S.COMPLETE },
  EXPAND:   { from: [S.COMPLETE], to: S.EXPANDED },
  COLLAPSE: { from: [S.EXPANDED], to: S.COMPLETE },
  DISMISS:  { from: [S.AWAKENING, S.READY, S.LISTENING, S.THINKING, S.RESPONDING, S.COMPLETE, S.EXPANDED], to: S.DISMISSING },
  GONE:     { from: [S.DISMISSING], to: S.IDLE },
};

export function transition(state, event) {
  const t = T[event];
  if (!t) return null;
  return t.from === '*' || t.from.includes(state) ? t.to : null;
}

// What the notch surface shows for each assistant state.
export const VIEW = {
  [S.IDLE]: { geo: 'rest', mood: 'rest' },
  [S.AWAKENING]: { geo: 'wake', mood: 'look' },
  [S.READY]: { geo: 'ask', mood: 'look-down' },
  [S.LISTENING]: { geo: 'ask', mood: 'listen' },
  [S.THINKING]: { geo: 'think', mood: 'think' }, // thinking is always the orb
  [S.RESPONDING]: { geo: 'shelf', mood: 'speak' },
  [S.COMPLETE]: { geo: 'shelf', mood: 'done' },
  [S.EXPANDED]: { geo: 'xl', mood: 'look-down' },
  [S.DISMISSING]: { geo: 'rest', mood: 'rest' },
};

export const LABEL = {
  idle: 'Idle', awakening: 'Awakening', ready: 'Ready', listening: 'Listening',
  thinking: 'Thinking', responding: 'Responding', complete: 'Complete',
  expanded: 'Expanded', dismissing: 'Dismissing',
};

// Spoken requests (press and hold). `said` streams in while held.
export const VOICE = {
  hero: { said: "What's on my plate today?", a: 'Three things. The <b>geometry review</b> at 11, lunch with Maya at 12:30, then two hours for <b>onboarding copy</b>.', scene: 'desktop' },
  demo: { said: 'Move my three o’clock to tomorrow and tell Maya', a: 'Done. <b>Geometry review</b> is now tomorrow at 3:00, and I’ve let Maya know.', scene: 'calendar',
    more: `<div class="x-list"><span><b>Moved</b>Geometry review · Thu 3:00 PM</span><span><b>Sent</b>“Can we do tomorrow at 3 instead?” to Maya</span></div>` },
  meet: { said: 'Remind me to call Maya at four', a: 'Got it. I’ll nudge you at 4:00.' },
  talk: { said: 'Move my 3 o’clock to tomorrow and tell Maya', a: 'Moved, and Maya knows.' },
};

// Quick actions offered when the composer opens (progressive disclosure, level 1).
export const CHIPS = {
  "What's on today?": { a: 'Standup at 9:30, the <b>geometry review</b> at 11, and lunch with Maya at 12:30.' },
  'Draft a reply to Maya': { a: '“Tomorrow at 3 works. I’ll bring the shoulder-radius options.” <b>Ready to send</b> from Mail.' },
  'Find Q4 roadmap': { a: 'Found <b>Q4-roadmap.pdf</b> in Downloads, opened yesterday in Preview.' },
};

// Prewritten demo content.
export const PROMPTS = {
  code: {
    q: 'Explain this code',
    a: `<b>TodayRow</b> lists tasks as full-width rows: the title leads, a spacer pushes the minutes to the trailing edge, and <code>.monospacedDigit()</code> stops the numbers from jittering. Padding is applied once, from <code>context.contentInsets</code>, so it stays right in every slot.`,
    more: `<div class="x-list"><span><b>Line 12</b>Spacer keeps at least DroppySpacing.md between title and value.</span><span><b>Line 19</b>Fills the slot, top-leading, as the guidelines ask.</span><span><b>Line 21</b>The only padding in the view.</span></div>`,
    hl: [12, 13, 19, 21],
  },
  notes: {
    q: 'Summarize my notes',
    a: `Your review notes say three things: the island floats <b>8pt</b> below the top edge on notchless displays, surfaces separate by <b>fill, not borders</b>, and two questions are still open.`,
    more: `<div class="x-list"><span><b>Open</b>Shoulder radius on the 16-inch panel</span><span><b>Open</b>Should hover respect the auto-expand delay on external displays?</span></div>`,
    scene: 'doc',
  },
  file: {
    q: 'Help me find a file',
    a: `Found it. <b>Q4-roadmap.pdf</b> was last opened yesterday in Preview. Two other files mention “island”:`,
    more: `<div class="x-files"><span><i class="fi pdf"></i>Q4-roadmap.pdf<em>Downloads · 2.4 MB</em></span><span><i class="fi key"></i>Island review.key<em>Design · 18 MB</em></span><span><i class="fi txt"></i>notch-metrics.txt<em>Desktop · 4 KB</em></span></div>`,
  },
  next: {
    q: 'What should I work on next?',
    a: `You have a clear hour before <b>Lunch with Maya</b>. The geometry review is done, so the best next step is the <b>onboarding copy</b> Maya edited at 11:20.`,
    more: `<div class="x-list"><span><b>Now</b>Onboarding copy · 45 min</span><span><b>Later</b>Reply to Maya about shoulder radius · 10 min</span></div>`,
    scene: 'calendar',
  },
};
