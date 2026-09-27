# Tactus — project status (portable summary)

## Kids Room update — 2026-09-27

Kids Room now appears in Tactus using the temperature and humidity entities
previously mapped to Laundry: `sensor.kids_room_temperature_temperature`
and `sensor.kids_room_temperature_humidity`. Josh confirmed the readings
should move to Kids Room. Existing power-point assignments are unchanged,
including Donut in Living Room. This supersedes the sensor placement in the
older notes below. Live preview verified temperature and humidity readings.
The Home room list now stays in this order: Living Room, Kitchen, Bedroom,
Kids Room, Bathroom, Laundry, Toilet, Front Door.

Paste this at the start of a new chat, or drop it into the Tactus Claude
Project's knowledge, to pick up with full context. `CLAUDE.md` in the repo
root is the detailed technical spec Claude Code reads automatically — this
file is the shorter narrative version for a fresh conversation.

**Last reconciled 2026-08-21**, against a working repo checkout plus a fresh
Home Assistant Developer Tools → States dump — not from memory alone. Where
the two disagreed, the States dump won. This file had drifted badly out of
sync with `CLAUDE.md` before this pass (frozen since the original build,
while `CLAUDE.md` had moved through an entire UI redesign and two new
integrations); if it drifts again, treat `CLAUDE.md` as the source of truth
and regenerate this one from it, not the reverse.

## What Tactus is

A custom smart-home wall panel: dark, calm, tactile design system built in
Figma Make, wired to a real Home Assistant instance. Runs on an iPad Air 4th
Gen mounted on the wall. Controls: IKEA DIRIGERA lights across **7 rooms**
(bedroom, kitchen, living room, laundry, bathroom, front door, and toilet —
the last added 2026-08-19), Tesla ("Ghost", Model 3 Highland — lock, climate,
sentry/valet, seat/steering heaters, frunk/trunk/windows), a Sensibo split
system in the Living Room (the first real per-room climate control, separate
from Ghost's own climate), solar + Powerwall + grid, one smart plug,
per-room indoor air readings (Netatmo in Kitchen/Bedroom, IKEA air-quality in
Living Room, a relocated sensor in Laundry), automations and scenes (all
live, all controllable from the panel).

## Current state: shipped, redesigned, and still evolving

The original build arc — tokens, componentization, live HA data, proxied
deployment, the physical iPad install — was done first and hasn't regressed.
Since then, two more substantial phases of work have shipped on top of it:

**A full UI redesign (Phases 1–4b, completed 2026-07-24–25).** Tactus moved
from a full-screen-view-swap model to a persistent left nav rail (Home /
Devices / Energy / Automations) with a real Devices board, restyled room
detail, restyled Energy and Automations views, and three deep-control
overlay sheets (Light / Climate / Ghost). An ambient idle screen now fades
in after 3 minutes of inactivity — clock, status line, and five glance
columns, dimming for night viewing. The redesign is complete; anything
touching the UI now is new scope, not a remaining phase.

**Climate and richer environmental data.** The Living Room's Sensibo split
system is fully wired — on/off, HVAC mode, target temp, fan speed, current
temp/humidity — accounting for Sensibo's real quirks (cloud-polled roughly
once a minute, IR is one-way so HA's state is a belief rather than a fact).
Netatmo and an IKEA air-quality sensor now feed real per-room temp/humidity/
CO₂/PM2.5 into the Environment bar as a min–max range rather than one
house-wide reading.

**Eve motion sensors were fully retired (2026-08-19)** in favour of IKEA
MYGGSPRAY, closing an open question that had been sitting unresolved for
weeks. All five rooms needing motion sensing (bathroom, toilet, kitchen,
laundry, front door) now report natively in HA — the Apple Home fallback
layer these automations used to run on is gone. This is also where the
toilet became a seventh room, and where a genuine Thread network reset had
to be recovered from (see "What actually happened" below).

Two things worth knowing from the redesign/expansion arc, alongside the two
that were already documented from the original build (the staleness-on-
reconnect bug, and why a custom proxy was needed for the token):

**A live bug was caught late, not by the app.** During the MYGGSPRAY
migration, Thread re-pairing silently renamed two sensor entity IDs (the
Living Room air-quality sensor and the Laundry temp/humidity sensor).
Because a missing entity fails quiet rather than erroring, both had been
returning nothing for about two days before a fresh States dump caught it —
Tactus's own reconnect/staleness handling can't help here, since the
WebSocket stayed healthy the whole time and nothing ever errored. Fixed in
`ha-types.ts` 2026-08-21. The underlying cause — `dirigera_platform`'s
`hub_event_listener.py` throwing on a `None` reference after an integration
reload — is a real upstream bug, flagged but not yet filed.

**A phantom room may currently exist.** A fresh States dump shows both
`light.arch` (on) and `light.living_room_arch` (unavailable) — most likely
one physical fixture left under two entity IDs from a re-pairing. Room
derivation works correctly off the entity_id it's given; the fix here is in
HA (rename or delete the stale one), not in Tactus's code. Worth confirming
on the actual panel whether this currently shows as a spurious 8th room.

## What's genuinely still open

- **The house view swipe tradeoff needs re-checking, not just re-counting.**
  Originally accepted at 6 rooms (2 rows); the new toilet room makes it 7
  (3 rows). Whether this still matters depends on whether the post-redesign
  `HomeView` (a scrollable list, not a 3-per-row grid) actually inherited the
  problem — that hasn't been re-verified since the redesign shipped.
- The phantom "arch" room above — confirm on the panel, fix in HA.
- Grid import/export sign convention was never confirmed against a real
  export event (Powerwall's was; grid's wasn't).
- iPad cache-busting on rebuild is implemented but unproven on the real
  device.
- No battery/charger automation for the iPad yet (recommended: cut power via
  smart plug above ~80%, restore below ~40%).
- Nest doorbell/camera: still not wired in, no decision taken. Events-only
  (doorbell press/motion/person) was the recommendation, not live video.
- Per-room **motion** sensing (all five MYGGSPRAY rooms) is unwired into the
  UI — no longer blocked on hardware, just not built. Outdoor AQI/PM2.5
  remain unsourced.
- The `dirigera_platform` crash above hasn't been filed upstream.
- A staleness guard on the Living Room heater automation (checking
  `last_updated` before triggering) was recommended after it broke twice
  from entity drift, but isn't built.
- Guided Access (not Single App Mode) means a reboot or iOS update needs a
  manual re-arm on the iPad. Worth revisiting if that gets annoying.
- **Voice control** — proposed (push-to-talk over the existing WebSocket,
  on-device speech recognition), not started; mic permissions under Guided
  Access need early verification.
- **A phone layout** remains a planned sibling, not started — likely
  task-first IA rather than a responsive version of the wall-panel layout.
- **Tailscale / remote access** — Tactus is LAN-only by design, which is the
  real blocker on whether a phone layout is even worth building, since a
  phone is most valuable away from home. Open architectural decision, not a
  task yet.

## What actually happened during the Eve→MYGGSPRAY migration

Worth keeping as institutional memory, since it's likely to recur with any
future re-pairing: a Thread network reset (attempting to commission a new
MYGGSPRAY sensor) orphaned several Matter-over-Thread devices. Recovery
involved discovering that two HomePod minis were running a separate Thread
fabric on stale credentials, which partitioned the network whenever both
were powered — the HomePods and the Apple TV (3rd-gen, A2843) turned out to
be load-bearing Thread infrastructure, not incidental hardware. The working
recovery/commissioning order — pair into Apple Home first, then share to
IKEA via Matter multi-admin, one device at a time with pauses for mesh
reconvergence — is now the documented approach for any future re-pairing.

## How this project has actually been worked

Claude Code does the implementation on scoped branches with real checkpoint
discipline: design sign-off before code, diff review before commit, and
holding merges until independently verified against the actual pushed branch
rather than trusting Code's own summary of what it did. That discipline has
caught real bugs more than once — including one that would have broken the
whole app in Safari, invisible to Code's own test harness because the
harness tested a reimplementation of the logic rather than the real file.
Keep doing this rather than letting a task get merged on narration alone.

The same discipline applies to this file and `CLAUDE.md` themselves: this
pass was written against a real repo checkout and a real HA States dump,
specifically because narrating "what's probably still true" is exactly how
this file drifted the first time.
