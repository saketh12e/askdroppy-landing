# Ask Droppy — design notes

A concept site for a proposed Droppy droplet. It is not affiliated with Droppy.

## A — Research and reference lock

**What was verified (from getdroppy.app and its docs, read as text):**
- Droppy is a notch and island hub with 39 droplets. Its voice is short, confident, and lightly playful ("Not a notch app, definitely top notch."). Droplets are presented as small products inside Droppy's store ("each one built like a full Mac app").
- DroppyKit design rules: notch surfaces are always dark chrome. Text uses three roles (primary, secondary, tertiary) from `AdaptiveColors`. Widgets get no card around them; `notchSurfaceCardFill` is only for raised elements inside a widget. Spacing is a 4pt grid. Labels are sentence case, with no gradients and no outlines. Controls are flat washes (34, 28, or 24pt, 0.94 press, one accent). Motion comes from `DroppyAnimation` presets, and views handed to the host get no entrance transitions.
- Geometry: a shelf row starts at cutout height + 10 and 48pt in from each shoulder. The standard expanded surface is 352 × 93 (notch) or 370 × 93 (island). The maximum is two-thirds of the display, and the host owns the close spring. `notchWrap` splits the header across the two camera bands.

**What could not be verified:** fonts and colour values. The sandbox blocked direct access to getdroppy.app (no curl, and no browser could load it), so its computed font stack and hex colours are unknown. Decision: use the Apple-native system stack (`-apple-system`, SF Pro), which is what DroppyKit's native surfaces use. The blues are tuned to read as Droppy-adjacent cobalt, not copied from Droppy.

**Refero (styles fetched and applied):**
- *Sleeve* (dominant): bright white canvas; system sans with tight tracking only at display sizes; heavy dark primary CTA with a light secondary; app-native product imagery and no lifestyle photography.
- *Things* (borrowed): restrained single blue accent; 18px-ish card radius in mist gray; separating sections by fill rather than border.
- *Desktop.fm* (borrowed): one sculptural object at the centre of an otherwise sparse composition. That became the "Meet" section.
- *Honk / SuperHi* (checked, rejected): saturated blue plus mascot, but rounded "fun" type and sticker clutter read as childish. Kept only the idea of a full-bleed cobalt stage.
- Screens: assistant composers (Claude, Bard, Rox, Manus) and voice states (Meta AI, Pi, Rewind). Lessons used: suggestion chips under the composer, mic and send in the field, and a listening state that shows a waveform plus live transcript with the unconfirmed tail dimmed.
- Motion was **not** observed live (no browser access to the references). Every motion decision below is proposed, not copied.

**Reference lock:**
- Dominant: Sleeve-style bright editorial Mac product page.
- Preserve: (1) system type, bold and tightly tracked; (2) white and mist canvas with black ink; (3) real-looking hardware as the centrepiece; (4) one blue, used deliberately; (5) the notch is always pure black and flat.
- Anti-patterns: purple AI gradients, glass cards, glowing borders, particles, emoji art, chat-bubble branding, fade-up-everything.

## B — Tokens
See `css/tokens.css`. In summary:
- **Type:** one family. Display uses clamp 52→136 / −0.045em / 0.96, section 36→76 / −0.035em, card 20→26, lead 18→22, body 17, UI 15, micro 13.
- **Colour:** canvas `#fff`, mist `#f4f5f7`, ink `#0b0c0e`, ink-2 `#5c6270`, ink-3 `#6f7480`, cobalt `#1d4cff` / deep `#0627a8`, native accent `#0a84ff`, night `#050506`. Notch text is white at 94, 62, and 38%; fill is white at 8.5%.
- **Spacing:** 4pt grid (4 to 144).
- **Radii:** 6, 10, 14, 22, 32, and pill. Notch shapes use their own scale in points.
- **Motion:** instant 120ms, small 200ms, large 340ms. Springs are CSS `linear()` curves generated from k=170/c=20 (~2% overshoot, used for surface morphs) and k=120/c=19 (no visible overshoot, used for the character).
- **Breakpoints:** 1080, 860, and 640.

## C — Mascot
- **Silhouette:** a drop whose tip leans up and left, resting on a flattened base, with a crease ("the fold") wrapping the lower right shoulder. The idea is a bead of water that just slipped out of the notch and sat down. It reads at 13pt without eyes or lighting (see the mark in `assets/mark.svg`).
- **Eyes:** tall ovals set right of centre, with the right eye slightly smaller. That asymmetry is the personality.
- **Material:** porcelain white with cool blue shadow, blue bounce light from the stage, a narrow rim light, and a tight specular. The eyes are ink-navy with one glint each.
- **Builds:** `mascot-gl.js` is a raymarched SDF hero rendered in real time with spring-driven expression uniforms. `mascot.js` covers SVG at wing, mark, icon, and macro sizes. The static fallback is the SVG, used when WebGL is missing or with reduced motion.
- **Expressions:** rest, look (pupils widen), look-down (toward content), listen (larger eyes, slight lean), think (eyes up and right, narrowed), speak (bright glints), done (happy arcs plus one small hop). Blinks come every 6–10s and only while visible. There is no idle bounce.

## E — Motion storyboard (major sequences)
| | Trigger | From → to | Timing | Properties | Reduced motion |
|---|---|---|---|---|---|
| A Awakening | load + 1.9s | notch 146×24 → 226×24, eyes fade in the left wing | 640ms spring | width, opacity | instant |
| B Notch → conversation | click (hero), scroll 0.38–0.45, prompt (demo) | 226×24 → 448×156, shoulders 7→14 | spring, or scrubbed | width, height, radius, mascot position | instant / scrubbed |
| C Conversation → workspace | scroll 0.66–0.78, flow tab 3, day 16:30 | the window starts exactly on the shelf rect, then grows to 760×540 while the notch steps back to wake | 560ms spring, or scrubbed | left, top, size, radius, content fade from 55% | instant |
| D Material change | Meet enters the viewport | the companion drops from above at 0.18× scale into a full-size sculpture | scroll-scrubbed | translate, scale, shadow | static |
| E Bento | in-view or interaction | each tile has its own behaviour: waveform, selection highlight, drag to notch, tilt, grid morph, text swap | 200–640ms | varies | static states |
| F Demo | prompt, expand, reset, Esc | one state machine (idle → … → complete ↔ expanded → dismissing) | spring | as B | instant |
| G Home | scroll 0.82–0.95, final CTA hover | workspace → shelf → rest; the eyes look at the CTA | scrub / spring | as B | instant |

The camera for the story (sections 01–02) is one sticky stage of 720vh. It moves from the hero framing to a notch close-up, out to the wide workspace view, and back in, all scrubbed and reversible. Typing is scrubbed too, so it un-types when you scroll back up. Every timed sequence runs on a cancellable token, so rapid input never interleaves two runs.

Quiet by design: the "Belong" specimens and the "truth" panel do not move at all.

## F — QA performed
- State machine: `node js/assistant.check.mjs` (transitions, rapid re-prompt, illegal expand, dismiss and re-wake).
- Story scrub sampled at 15 progress points in both directions at 1440×900, 1280×720, and 375×812: notch geometry, camera, captions, and workspace hand-off.
- WebGL mascot verified by reading back pixels: silhouette, eyes, and material ramp. The first pass clipped to white and was retuned.
- Fixed during QA: a demo stall when a prompt arrived mid-awakening; a scene-swap race on rapid tab clicks; shelf content overflowing its surface (the shelf now sizes to its content, like an expanded surface re-querying size); the workspace view overlapping captions on short viewports; macro keycaps overflowing on mobile; ink-3 contrast (raised to 4.6:1).
- Accessibility: 40 focusable controls with no unlabeled ones; tabs use roving tabindex and arrow keys; Esc closes the hero and demo notches; headings run in order; all live text uses `aria-live`.
- Not possible here: visual screenshots, since screenshot tools were blocked in this session. Real-device frame-rate profiling is also untested.

## G — Capability boundaries
- **Droppy today:** notch and island surfaces, shelf widgets, live activities, and 39 droplets.
- **DroppyKit today:** shelf widgets, live activities, expanded surfaces (up to two-thirds of the display, with host-owned motion), HUDs, settings panes, and MCP tools. There is no documented text-input API.
- **Proposed:** Ask Droppy itself, voice, selection context, file summarising, and the detached companion workspace. The workspace is a separate window, not a DroppyKit surface.
- **Simulated on this site:** everything. Responses are prewritten, and no model is connected.
