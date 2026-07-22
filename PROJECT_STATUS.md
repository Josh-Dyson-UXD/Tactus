# Tactus — project status (portable summary)

Paste this at the start of a new chat, or drop it into the Tactus Claude
Project's knowledge, to pick up with full context. `CLAUDE.md` in the repo
root is the detailed technical spec Claude Code reads automatically — this
file is the shorter narrative version for a fresh conversation.

## What Tactus is

A custom smart-home wall panel: dark, calm, tactile design system built in
Figma Make, wired to a real Home Assistant instance. Runs on an iPad Air 4th
Gen mounted on the wall. Controls: 19 IKEA DIRIGERA lights across 6 rooms,
Tesla ("Ghost", Model 3 Highland — lock, climate, sentry/valet, seat/steering
heaters, frunk/trunk/windows), solar + Powerwall + grid, one smart plug,
automations and scenes (all live, all controllable from the panel).

## Current state: shipped and running

The whole build arc is done: tokens extracted from the Figma export,
componentized into a real file structure, wired to live HA data over
WebSocket + REST, controls wired with a proper pending → confirmed cycle
(not optimistic UI), deployed behind a custom token-hiding proxy in Docker on
the Mac mini, and running on the actual iPad via Safari + Guided Access.

Two things worth knowing about that journey:

**A real staleness bug got caught and fixed.** The original build only
fetched HA state once, on load — a WebSocket reconnect (HA restart, network
blip) never re-synced, so on an always-on panel the UI would silently drift
out of date forever. Fixed: every reconnect now re-fetches and merges state,
with careful handling of races (a live event landing while a fetch is mid-
flight) and in-flight pending commands.

**The deployment needed a real proxy, not just a static file server.** A
long-lived HA token gives full control of the house, and a plain Vite build
inlines it straight into browser-readable JS. HA also authenticates its
WebSocket in-band (not via a header), so a simple nginx reverse proxy
couldn't hide it either — hence a small custom Node proxy that intercepts and
substitutes the token server-side for both REST and WebSocket traffic.

## What's genuinely still open

- The house view needs one swipe to see the second row of rooms (accepted
  tradeoff — the alternative, uniform scaling, broke touch targets badly).
- Grid import/export sign convention was never confirmed against a real
  export event (Powerwall's was; grid's wasn't).
- iPad cache-busting on rebuild is implemented but unproven on the real
  device.
- No battery/charger automation for the iPad yet (recommended: cut power via
  smart plug above ~80%, restore below ~40%).
- Eve motion sensors (laundry, kitchen) can't get into HA cleanly — running
  on an Apple Home fallback. Needs a real decision: replace with IKEA
  hardware, or invest in proper Thread/Matter hardware.
- Nest doorbell/camera: not wired in at all. Recommendation on the table was
  events-only (doorbell press/motion/person), not live video.
- Per-room motion/temp/humidity sensors are no longer hardware-blocked
  (bathroom/front door sensors report fine in HA) but aren't wired into the
  room cards yet.
- Guided Access (not Single App Mode) means a reboot or iOS update needs a
  manual re-arm on the iPad. Worth revisiting if that gets annoying.

## How this project has actually been worked

Claude Code does the implementation on scoped branches with real checkpoint
discipline: design sign-off before code, diff review before commit, and
holding merges until independently verified against the actual pushed branch
rather than trusting Code's own summary of what it did. That discipline has
caught real bugs more than once — including one that would have broken the
whole app in Safari, invisible to Code's own test harness because the harness
tested a reimplementation of the logic rather than the real file. Keep doing
this rather than letting a task get merged on narration alone.
