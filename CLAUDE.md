# Tactus — Smart Home Dashboard

This file is the living build spec. Read it before touching code. It defines
what exists, what doesn't yet, and the rules that keep the system coherent as
it continues to evolve. The original build (Figma prototype → real app wired
to Home Assistant → deployed wall panel) is complete; this file now tracks an
already-shipped system, not a from-scratch build.

## What this project is

A custom smart-home control dashboard, design system: **Tactus**. Calm and
ambient at rest, tactile and physical on interaction. Primary surface is a
wall-mounted landscape tablet — as of this writing, a real iPad Air 4th Gen
running the real thing. A phone layout remains a planned sibling, not started.

Origin: visual design was built in Figma Make and exported as React/Tailwind
(the `src/app/App.tsx` + `src/imports/DashboardCanvas` files). That export was
the **visual source of truth** and still is for anything not explicitly
changed since — do not redesign existing cards/layout without a deliberate,
flagged decision (see "Design rules" and the Energy-view precedent below).

## Current state (production, live)

- Fully componentized (see "Target file structure"). No more monolithic
  `App.tsx` — it's now ~460 lines of orchestration only: HA connection
  lifecycle, pending/confirmed control state, and view routing.
- **Live Home Assistant data end to end.** No mock state anywhere in the
  shipped app. Real entities: 19 DIRIGERA lights across 6 rooms
  (bedroom/kitchen/living_room/laundry/bathroom/front_door), Tesla ("Ghost",
  a Model 3 Highland) with full quick-actions, Solar/Powerwall/Grid, one
  curated switch (a Kasa-style plug), automations & scenes (dynamically
  discovered, not curated), and per-room indoor air sensors (Kitchen,
  Bedroom, Living Room, Laundry).
- **Reconnect-safe.** On any WebSocket drop (HA restart, network blip), the
  app re-fetches full state on reconnect and merges it in rather than trusting
  stale cached values — see `mergeStates`/`rehydrate` in `App.tsx`/
  `ha-client.ts`. This was a real bug (fixed post-launch) that let the UI go
  silently stale indefinitely on an always-on panel; don't regress it.
- **Deployed.** Runs in Docker on the Mac mini behind a purpose-built proxy
  that hides the long-lived HA token from the browser entirely (see
  "Deployment" below) — this is not the naive dev setup, don't revert to it.
- **On the wall.** iPad Air 4, Safari, added to home screen, Guided Access
  (not Single App Mode — see "Open questions").
- Fonts: **Instrument Sans** (UI/labels) + **Geist Mono** (live numerals/
  data) — unchanged, still deliberate, don't swap.
- Data modelling unchanged in shape from the original design import:
  `LightState`, `SwitchState`, `SensorState`, `SolarState`, `PowerwallState`,
  `GridState`, `TeslaState`, `Room`, plus newer additions `AutomationState`,
  `SceneState`, `HomeLoadState`. `SensorState`'s discriminated
  union gained a `co2` kind (2026-07-22) for the Netatmo CO₂ ppm reading —
  kept separate from `aqi` since it isn't an AQI/PM2.5 metric — and a `pm25`
  kind (2026-07-23) for the Living Room IKEA air-quality sensor's PM2.5
  reading, since Netatmo's kitchen/bedroom modules don't report PM2.5.
  The dedicated `IndoorState` type is retired (2026-07-23) — see "Entity
  mapping" below. `ClimateState`/`HvacMode` added (2026-07-23) for the
  Living Room Sensibo split system — the first real per-room climate
  control (Tesla's `climate.ghost_climate` stays handled inside
  `TeslaCard`, a separate concept). `Room` gained a `climate: ClimateState[]`
  field alongside `sensors`.

## Build order (historical — all steps below are done)

1. ✅ **Tokens extracted** — `src/styles/theme.css`, no raw hex left in
   components (only inside `COLORS` and `withAlpha()`, both correct by design).
2. ✅ **Componentized** — see file structure below.
3. ✅ **HA data layer built** — `src/lib/ha-client.ts` (WebSocket + REST) and
   `src/lib/ha-types.ts` (entity ↔ Tactus-type adapter, per-entity mappers for
   incremental WS updates).
4. ✅ **Controls wired to real HA service calls** — pending → confirmed cycle
   generalized across lights, switches, Tesla (12 separate control keys),
   automations. Room/house-level bulk actions fan out to per-entity calls
   rather than having their own pending state.
5. ✅ **Deployed** — not Vercel (that plan was superseded early: this is
   local-network-only by design, no public exposure). Docker container on the
   Mac mini, token-hiding reverse proxy, iPad kiosk via Safari. See
   "Deployment" below for the real architecture.

Anything past this is genuinely new work, not resuming an old plan — treat
each addition as its own scoped task with the same checkpoint discipline used
throughout (see "Working with Claude Code" below).

## Target file structure (current, real)

```
src/
  app/
    App.tsx                 # HA connection lifecycle, control state, view routing
  components/
    cards/
      LightCard.tsx / SwitchCard.tsx / SensorCard.tsx (stubbed, unused)
      SolarCard.tsx / PowerwallCard.tsx / TeslaCard.tsx / EnergyFlowCard.tsx
      RoomCard.tsx / AutomationCard.tsx / SceneCard.tsx
    controls/
      BrightnessSlider.tsx / ColorTempSlider.tsx / RoomControls.tsx
    layout/
      HouseView.tsx          # rooms grid + nav to Energy/Automations
      RoomView.tsx
      EnergyView.tsx          # Solar/Powerwall/Tesla/EnergyFlow, behind nav
      AutomationsView.tsx     # automations + scenes, behind nav
      EnvironmentBar.tsx / SectionHeading.tsx
    icons/
  lib/
    ha-client.ts             # WebSocket + REST client, mergeStates(), auth-error signal
    ha-types.ts               # HA entity ↔ Tactus-type mapping, HA_ENTITIES map
    helpers.ts
  types/
    index.ts                 # includes MainView: "house" | "automations" | "energy"
  styles/
    theme.css                 # Tactus tokens, plus kiosk shell rules (safe-area,
                              # touch-behavior suppression) appended for iPad
server/
  index.js                   # deployment proxy — see "Deployment"
  package.json                # single dependency: ws
Dockerfile                    # multi-stage: vite build -> node runtime
docker-compose.yml
.env.example / .env (gitignored)
```

## Home Assistant integration

**Architecture:** Tactus → HA WebSocket API (live state + service calls) →
HA integrations → physical devices. Tactus never talks to Tesla, IKEA
DIRIGERA, or Nest directly — HA normalises everything into entities.

- **Auth in production:** the browser build holds NO token. A server-side
  proxy (see "Deployment") injects it. `VITE_HA_TOKEN` inlined into a client
  bundle is a **dev-only** pattern now — never do this for anything actually
  reachable beyond your own machine.
- **Initial load + reconnect:** `HAClient.fetchStates()` (REST) is the single
  code path for both first paint and every reconnect, triggered off
  `onConnectionChange(true)` — not just on mount. Merges into cached state via
  `mergeStates()` (strict `last_updated` comparison, cached wins ties) so a
  `state_changed` event that races ahead of a fetch response is never
  clobbered by stale fetched data.
- **Live updates:** WebSocket subscription to `state_changed` for every
  entity (not a curated subscribe_entities list — see "Known constraints").
- **Control:** WebSocket `call_service`. Pending state holds until HA confirms
  via `state_changed`, or a 7s timeout resolves to an error/unreachable state.
  Generalized across every domain via per-entity pending-timer maps in
  `App.tsx` — don't hardcode a new special case if it fits this pattern.
- **Entity mapping** (confirmed from HA Developer Tools → States; dates below
  are when each was actually verified against real hardware, not assumed):
  - `sensor.home_solar_power` (kW) + `sensor.home_solar_generated` (kWh
    today) → `SolarState`. Status "generating" if `generatingKw > 0.05`.
  - `sensor.home_percentage_charged` → `PowerwallState.pct`.
    `sensor.home_battery_power` → `flowKw`. **Sign convention confirmed
    2026-07-12 against real hardware: negative = charging, positive =
    discharging** — the opposite of the original assumption. Don't flip it
    back without re-confirming.
  - `sensor.home_grid_power` → split by sign into `GridState.importKw`/
    `exportKw`. **Sign convention still UNCONFIRMED against real export
    behaviour** — this is the one entity mapping that was never actually
    verified live, unlike Powerwall. Check next time the house is exporting:
    does the Energy Flow card's export arrow match reality? One-line fix in
    `mapHAStatesToGrid` if it needs flipping.
  - Tesla ("Ghost", confirmed **Model 3 Highland**, hardcoded — not an HA
    entity) → full `TeslaState` including quick-actions confirmed 2026-07-12:
    `lock.ghost_lock`, `climate.ghost_climate` (backs on/off + preset + fan
    mode — three `TeslaControlKey`s off one entity), `switch.ghost_sentry_mode`,
    `switch.ghost_valet_mode`, seat/steering-wheel heater `select.*` entities,
    `cover.ghost_frunk` (open-only, no close service exists),
    `cover.ghost_trunk`, `cover.ghost_windows`, `button.ghost_honk_horn`,
    `button.ghost_flash_lights`.
  - DIRIGERA → `LightState`: 19 `light.*` entities, room derived from
    `entity_id.split("_")[0]` when no `attributes.room` — this is a landmine,
    see "Known constraints".
  - One curated switch: `switch.kids_room_usb_lamp` — physically a Living
    Room lamp despite its entity_id/HA area; placed via `SWITCH_ROOM_OVERRIDE`
    in `ha-types.ts`, not derived. Only entry so far.
  - **Climate — Living Room Sensibo split system** (confirmed 2026-07-23):
    `climate.josh_s_device_split_system`, placed via `CLIMATE_ROOM_OVERRIDE`
    in `ha-types.ts` (same curated-single-entry pattern as the switch above),
    keyed to the Living Room lights' slug `living` since the entity_id
    doesn't encode a room. `isClimateEntity` matches only this one id — never
    a `climate.*` prefix, which would wrongly catch `climate.ghost_climate`
    (the Tesla's, handled separately inside `TeslaCard`). Scope is
    thermostat-only: on/off, HVAC mode (`hvac_modes`: cool/heat/dry/
    heat_cool/fan_only/off), target temp via `set_temperature`
    (`min_temp`/`max_temp`/`target_temp_step` from the entity), fan speed via
    `set_fan_mode` (`fan_modes`: quiet/low/medium/high/auto), and a
    current-temp/humidity readout. Control rides the same pending → confirmed
    cycle as switches (`climatePendingRef` in `App.tsx`, `ClimateCard`'s
    `status`). The temperature stepper is debounced 400ms (`ClimateCard`'s
    local optimistic `targetTemp` shadow, same pattern as `RoomCard`'s
    brightness) — don't call `set_temperature` per tap. Deferred Sensibo
    extras, real available future work: Climate React, Timer, swing
    position, filter clean/reset, firmware info.
  - **Automations & scenes are dynamically discovered**, not a curated list —
    anything matching `automation.*`/`scene.*` is picked up automatically,
    inserted (not just patched) if it appears after initial load.
  - `weather.forecast_home` → `OutdoorState`. No AQI/PM2.5 source — still 0.
  - **Indoor air sensors** (per-room `SensorState`, via `INDOOR_AIR_SENSORS`
    in `ha-types.ts`) — three device families feeding the same layer, with
    `co2`/`pm25` optional per entry:
    - **Netatmo Smart Weather Station** (2 indoor modules, confirmed
      2026-07-22): `sensor.kitchen_kitchen_{temperature,humidity,carbon_dioxide}`
      (Kitchen, battery add-on module) and
      `sensor.bedroom_bedroom_{temperature,humidity,carbon_dioxide}` (Bedroom,
      mains base station). Core three only — temp/humidity/CO₂;
      noise/pressure/battery/connectivity intentionally unmapped. Cloud-polled
      (~10 min), no local push — infrequent `state_changed` events here are
      expected, not a bug. No `temp_trend` attribute is exposed, so trend is
      hardcoded "stable". `sensor.bedroom_bedroom_switch` is deliberately
      excluded (a different device's battery — no Netatmo attribution).
    - **IKEA air-quality sensor, Living Room** (confirmed 2026-07-23), Zigbee
      via `dirigera_platform` — local, so `state_changed` arrives promptly,
      unlike Netatmo's cloud poll:
      `sensor.living_room_living_room_air_quality_{temperature,humidity,co2,current_pm2_5}`.
      The only sensor of the three families that reports **PM2.5** — hence
      `pm25` being optional on `INDOOR_AIR_SENSORS` entries. `max_measured_pm2_5`
      / `min_measured_pm2_5` are excluded (session extremes, not live readings).
      **Critical:** the Living Room's Tactus room slug is `living`, not
      `living_room` — same landmine as `SWITCH_ROOM_OVERRIDE` below; keying
      this under `living_room` spawns a phantom Living Room card.
    - **Laundry temp/humidity sensor** (confirmed 2026-07-23):
      `sensor.kids_room_kids_temperature_{temperature,humidity}`. Physically
      relocated from the kids' room to the Laundry — HA area/friendly_name
      now say "Laundry", but the entity_ids were never renamed, so they still
      carry the old `kids_room` slug. This was formerly the single source for
      a dedicated `IndoorState` type (now retired — see below); it's now just
      another `INDOOR_AIR_SENSORS` entry, temp/humidity only (no CO₂/PM2.5).
      Its `..._battery_percentage` entity is excluded, same convention as the
      other two device families' battery entities.
    - Together these feed the `EnvironmentBar` (redesigned 2026-07-23, see
      below): **Temp** and **Humidity** are a min–max range across whichever
      rooms report them, **CO₂** and **PM2.5** stay averages across whichever
      rooms report those.
  - **`IndoorState` is retired** (2026-07-23). It used to be the sole source
    for the `EnvironmentBar` Indoor temp/humidity, fed by the sensor that's
    now the Laundry entry above. The Environment bar no longer has one
    canonical "the house's" temp/humidity reading — it now shows the
    min–max range across all `INDOOR_AIR_SENSORS` rooms' temp/humidity
    values instead (rendered as a single value when min equals max).
  - **`EnvironmentBar` redesign** (2026-07-23) — purely presentational, no
    data-layer change. Indoor now leads with a tactile range rail: a
    recessed track with a coloured segment spanning coolest→warmest room,
    a dot at each end, room names labelling the endpoints, and the average
    shown top-right; Humidity/CO₂/PM2.5 sit in soft filled tiles below.
    Outdoor leads with a hero temperature, with Humidity and a new
    Conditions tile (weather icon + label, promoted from the old corner
    text) below. Indoor AQI (never had a source) and outdoor AQI/PM2.5 (no
    source yet — WAQI is the planned add) are left off entirely rather than
    showing meaningless zeros; `OutdoorState.aqi`/`pm25` stay wired at 0 in
    the data layer for when that source arrives.

- **Deferred — still not available in HA:**
  - `SwitchState`: one curated entry exists (above); no broader plug rollout.
  - Per-room `SensorState` (motion/temp/humidity/AQI/PM2.5): temp/humidity
    are wired for Kitchen, Bedroom, Living Room, and Laundry; CO₂ additionally
    for Kitchen/Bedroom/Living; PM2.5 additionally for Living Room only (see
    above). Motion and the wider MYGGSPRAY/Matter environmental sensors
    remain unwired, but the underlying blocker has partially cleared for the
    MYGGSPRAY ones: your **MYGGSPRAY sensors (bathroom, front door) now
    report reliably in HA** via `dirigera_platform`. Wiring them into
    `SensorCard`/`Room.sensors` is real, available work whenever it's
    prioritized — it's no longer blocked on hardware/integration, just not
    built.
  - **Eve motion sensors (laundry, kitchen) are NOT in HA.** Confirmed
    dead-end: `dirigera_platform`'s Matter coverage is explicitly out of
    scope for third-party (non-IKEA) devices, and Matter-direct-to-HA is
    blocked by the Docker-on-Mac setup (no BLE passthrough, no host
    networking, no HA-owned Thread border router). These two rooms'
    motion-light automations currently run natively in **Apple Home** as a
    deliberate fallback, invisible to Tactus/HA. Real fix requires either IKEA
    hardware replacements for these two sensors, or a Thread/Matter dongle on
    Linux hardware (a genuine architecture change, not a config tweak).
  - **Nest doorbell/camera**: not decided. Recommendation on the table was
    "wire up doorbell/motion/person events only, don't build a live-video
    card" — battery cameras can't sustain always-on streaming and would fight
    the wall-panel use case. No action taken either way.

## Idle screen (ambient standby)

After `IDLE_TIMEOUT_MS` (3 min, `App.tsx`) of no pointer/key activity
anywhere on the panel, a full-screen overlay (`IdleScreen.tsx`) fades in on
top of whatever view was showing — house, a room, Energy, or Automations —
regardless of `mainView`. Tapping anywhere wakes it (`onWake` just clears
the `idle` flag), returning to exactly the same `mainView`/`selectedRoomId`
underneath, since the overlay never touches that state.

Purely presentational: a large `HH:MM` clock, one status line (greeting +
lock summary + lights-on count), and five glance columns (Indoor, Outdoor,
Solar, Battery, Elsa) derived entirely from state `App.tsx` already holds —
no new HA entities, no data-layer changes. Colour is the resting exception:
everything is quiet grey/white by default, and only surfaces amber when
indoor CO₂ ≥ 800ppm or the car is unlocked. Dims (`brightness(0.6)`) between
22:00–06:00 for night viewing, and drifts a few px over ~4 minutes
(`motion/react`) for ambience and anti-image-retention on the always-on
panel.

**Font note:** the clock needs a true Geist Mono weight 300, not a
synthetically-bolded 400/600. `fonts.css` self-hosts weights 300 and 600 as
local `.woff2` files (`public/fonts/`) rather than depending on a Google
Fonts CDN fetch at runtime — more robust for an always-on kiosk that's
otherwise local-network-only per "Deployment" above, and confirmed via
`document.fonts` that both weights actually reach `status: "loaded"` (a
remote `@import` was tried first and silently failed to apply the 300
weight in one test environment, which is what surfaced the need for this).

**Not built yet:**
- Per-cluster deep-links on tap (e.g. tapping the Solar column jumping
  straight to Energy) — currently any tap just wakes to the underlying view.
- Sunset-based dimming instead of the fixed 22:00–06:00 clock window.
- A forecast glance — would need HA's `weather.get_forecasts` service call,
  not just the current-conditions state `OutdoorState` already reads.

## Design rules — do not violate these

- **No raw hex in components.** Every colour is a `--tactus-*` token.
- **No flat drop-shadows.** Elevation is a soft glow in the card's own
  accent colour, only on active/on states.
- **No generic spinners.** Pending states use the ambient pulse/breathe
  animation, never a spinner component.
- **Numerals always `--tactus-font-mono`**, labels/UI always
  `--tactus-font-sans`. Don't mix.
- **Radius scales with surface size** — use the existing scale.
- **Colour means state, not decoration.**
- **Dark theme is default and primary** — still no light theme, still don't
  block it.
- **New precedent, added post-launch:** when a view genuinely doesn't fit its
  viewport even with correct component sizing, the fix is **information
  architecture (move content behind a nav button, like Energy/Automations),
  not uniform scaling and not ad-hoc compacting of card dimensions.** Uniform
  scaling was tried and explicitly rejected — it broke touch targets well
  below Apple's 44pt minimum. If a future view has the same problem, look for
  an IA move before touching any card's size.

## Deployment

**Why a custom proxy, not just nginx/Caddy in front of the static build:** HA
authenticates its WebSocket **in-band**, not via a header — the client must
send `{"type":"auth","access_token":...}` as the first message after
`auth_required`. A header-injecting reverse proxy has no way to supply that.
So `server/index.js` (plain Node `http` + `ws`, no framework) does two jobs:

1. **REST**: proxies an **explicit allowlist** of `/api/*` calls (currently
   just `GET /api/states`) to HA, adding `Authorization` server-side.
   Deliberately not a wildcard — HA's REST API is fully-credentialed and
   includes service calls, template rendering, etc. Add to the allowlist one
   entry at a time if a future need arises, never by loosening the match.
2. **WebSocket**: proxies the `/api/websocket` upgrade, forwarding every frame
   unchanged in both directions **except** the client's outbound `auth`
   frame, whose token is substituted server-side before forwarding upstream.
   **Critical detail if you ever touch this file:** `ws` picks the wire
   opcode (text vs binary) from the JS type handed to `.send()`, and every
   message handler hands you a Buffer regardless of the original frame type.
   Every forward call must pass the original `isBinary` flag explicitly via
   `{ binary: isBinary }` — inferring it from the Buffer wrapper breaks the
   WS handshake outright in a real browser (a Node-to-Node test harness that
   `.toString()`s everything will NOT catch this; it only shows up against a
   real client).

Static file serving in the same proxy resolves paths against `dist/` and
verifies containment before touching the filesystem (path-traversal guard),
and sends `Cache-Control: no-cache` on `index.html` specifically (hashed
`/assets/*` files are cached immutable) — otherwise a kiosked iPad has no way
to pick up a rebuild. **This has not been proven against the real device
yet** — worth confirming after any future rebuild that Safari actually
refetches `index.html` rather than serving a stale cached copy.

**What still holds the token client-side, on purpose, for dev only:**
`VITE_HA_URL`/`VITE_HA_TOKEN` in `.env.local` for `npm run dev` against HA
directly. `HAClient` defaults its base URL to `window.location.origin` when
`VITE_HA_URL` is unset, which is what makes the same build work behind the
proxy with zero client-side token. Vite's dev server proxies `/api` to the
deployment proxy too, so `npm run dev` can exercise the real proxy path
without a rebuild.

**Docker gotchas hit during setup, don't repeat:**
- `.dockerignore` is required and easy to forget — without it, `COPY . .`
  walks the entire repo including root `node_modules` and `.git`, which can
  turn a sub-second build-context step into 400+ seconds of file enumeration
  even though the actual data transferred is tiny. Must exclude
  `node_modules`, `server/node_modules`, `dist`, `.git`, `.env*`.
- The build stage must `COPY package.json package-lock.json ./` and run
  `npm ci`, not just `package.json` + `npm install`. Without the lockfile,
  npm re-resolves the whole dependency tree from the registry instead of
  installing pinned versions — dramatically slower and non-reproducible.
- Interactive zsh does NOT treat `#` as a comment by default (unlike bash or
  a zsh script) — a command like `cp .env.example .env  # comment` gets every
  word after `#` passed as a literal argument to `cp`. Don't put inline `#`
  comments in commands meant to be pasted into a live terminal.

**Serving:** Docker container (`docker-compose.yml`, `restart:
unless-stopped`), port 8080, alongside the existing `homeassistant` container
on the same Mac mini. `.env` (gitignored) holds `HA_URL`/`HA_TOKEN` for the
container; `.env.local` (also gitignored) holds the dev-mode
`VITE_HA_URL`/`VITE_HA_TOKEN` pair — these are two different files serving
two different modes, don't conflate them.

**iPad:** Air 4th Gen (MYG02X/A), iPadOS 26.3. LCD not OLED — burn-in isn't a
real concern for a static dashboard. Native landscape 1180×820 points. Safari
→ Add to Home Screen → launched standalone → **Guided Access** (not
Single App Mode). This was a deliberate choice: Single App Mode survives
reboots/updates unattended but requires wiping and supervising the device via
Apple Configurator, which wasn't worth it for an iPad that wasn't already
spare. Real cost of this choice: **Guided Access does not survive a reboot or
iOS update** — after either, someone has to walk over and manually re-arm it.
Revisit Single App Mode if that manual re-arm becomes a real recurring
annoyance.

## Known constraints from prior builds (carry these over)

- MCP server credentials are session-scoped and cannot be accessed from
  artifact iframes. If any Claude-powered feature gets added to Tactus later,
  it must delegate via `sendPrompt()` rather than holding credentials
  client-side.
- Metric units only — kW, kWh, °C, km. Never imperial.
- **Room-slug derivation is a landmine.** `mapHAStatesToRooms` falls back to
  `entity_id.split("_")[0]` when no `attributes.room` exists — so
  `light.living_room_*` lands in slug `"living"`, `light.front_door_*` lands
  in `"front"`. This already caused a phantom duplicate Living Room card once
  (a switch placed under the two-word `"living_room"` slug instead of
  `"living"`). Any new entity naming needs to be checked against this, not
  assumed.
- **Color temperature convention confirmed 2026-07-10 against real DIRIGERA
  devices:** HA reports kelvin directly (`color_temp_kelvin`,
  `min/max_color_temp_kelvin`) for this integration — no mireds conversion
  needed here, unlike some other HA light integrations.
- **`unavailable` vs `unknown`** are both treated as the same "no real
  reading" / error state throughout (`numOrNull`, light/switch/automation
  mappers) — this was a deliberate simplification, not an oversight. If a
  future entity needs to distinguish them, that's new work, not a bug fix.
- Subscribes to `state_changed` for every HA entity (not a curated
  `subscribe_entities` list as originally scoped). Fine at current scale; a
  larger HA instance might warrant narrowing this.

## Open questions / real next items

- **House view still requires a swipe** to see the second row of room cards
  (6 rooms wrap to 2 rows at 3-per-row and only the first row fits above the
  fold on the iPad's 820pt viewport). Explicitly accepted as a pragmatic
  tradeoff over uniform scaling (rejected — broke touch targets) or further
  IA changes. Live with it and revisit only if it's a real daily annoyance.
- **Grid import/export sign convention unconfirmed** — see entity mapping
  above. Check against a real export event.
- **`Cache-Control: no-cache` on index.html unproven on the real iPad** —
  confirm a rebuild actually shows up without a manual force-refresh.
- **iPad battery/charger automation** — not built. Recommended: automate the
  charger via a smart plug, cutting power above ~80% and restoring below
  ~40%, since a kiosked tablet left permanently on charge sits at 100%
  indefinitely and degrades the battery faster than necessary.
- **Eve sensors (laundry/kitchen)** — architectural dead-end confirmed for
  HA-native; currently running on Apple Home fallback. Needs a real decision:
  replace the hardware with IKEA-native sensors, or invest in Thread/Matter
  hardware on Linux to bring Eve in properly.
- **Nest doorbell/camera** — no decision taken. Events-only (doorbell press/
  motion/person) was the recommendation; full video was advised against for
  this specific device (battery-powered, WebRTC-only, no HA recording).
- **Per-room SensorState** — temp/humidity now wired for Kitchen, Bedroom,
  Living Room, and Laundry (confirmed 2026-07-22 / 2026-07-23); CO₂
  additionally for Kitchen/Bedroom/Living, PM2.5 additionally for Living
  Room only. The `EnvironmentBar` Indoor panel now shows temp/humidity as a
  min–max range across these rooms (the dedicated `IndoorState` single-
  source type is retired) and CO₂/PM2.5 as averages. Motion is still unwired
  everywhere, and outdoor AQI/PM2.5 remain unsourced (no entity exists yet).
  MYGGSPRAY (bathroom/front door) is no longer blocked (reports fine in HA)
  but not yet wired into `SensorCard`/room UI — real, available work
  whenever it's a priority.
- Single App Mode — revisit if manually re-arming Guided Access after
  reboots/updates becomes a recurring annoyance.

## Working with Claude Code on this project

Patterns that have worked well across every task on this project so far —
worth continuing:

- **Checkpoint discipline.** Scope each task with explicit stop points
  ("show me your design before writing code", "show me the diff before
  committing"). Code has repeatedly caught its own bugs when forced to reason
  through the design before implementing, and holding the "don't merge"
  instruction until independently verified has caught real issues (a WS
  opcode bug that would have broken the app entirely in Safari; a
  checkpoint-1 ordering bug in the reconnect logic) that its own test
  harnesses couldn't reveal because they were built from a re-implementation
  of the logic being tested, not the real file.
- **Verify against the pushed branch, not the narrative.** Code's own summary
  of what it did is not sufic — pull the branch and read the actual diff.
  This caught real gaps more than once (a whole checkpoint's fixes sitting
  uncommitted in Code's own clone with nothing pushed; a task that appeared
  complete in narration but whose code hadn't reached the reviewed files).
- **A stale local `git checkout` is a recurring failure mode.** More than
  once, review happened against a local clone that hadn't been re-fetched
  since a much earlier point in the same task — always `git fetch && git
  pull` immediately before reading files to review, don't assume yesterday's
  checkout is current.
- **Real end-to-end testing beats a from-scratch reimplementation of the
  logic under test.** The strongest test evidence in this project came from
  driving the actual client code (`ha-client.ts`) against a controllable fake
  HA server and capturing real wire traffic, then grepping for what should
  and shouldn't appear in it — not from unit-testing a parallel
  reimplementation of the same logic.
