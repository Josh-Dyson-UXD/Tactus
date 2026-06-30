# Tactus — Smart Home Dashboard

This file is the build spec. Read it before touching code. It defines what
exists, what doesn't yet, and the rules that keep the system coherent as it
grows from a Figma Make prototype into a real app wired to Home Assistant.

## What this project is

A custom smart-home control dashboard, design system: **Tactus**. Calm and
ambient at rest, tactile and physical on interaction. Primary surface is a
wall-mounted landscape tablet; a phone layout is a planned sibling.

Origin: visual design was built in Figma Make and exported as React/Tailwind
(the `src/app/App.tsx` + `src/imports/DashboardCanvas` files). That export is
the **visual source of truth** — do not redesign it. Your job is to make it
real: extract it into a proper system, then connect it to live data.

## Current state (as of handoff)

- Single 1,100-line `src/app/App.tsx` containing all components, types, and
  hardcoded `INITIAL_*` mock state. No live data. No HA connection.
- Visual design is good and should be preserved exactly — colours, radii,
  spacing, motion timings, layout.
- All design values were inline hex/px literals in JSX. A token layer has
  been extracted into `src/styles/theme.css` (see below) — **this replaces
  the stock shadcn `theme.css` that Figma Make generates by default.**
- Fonts: **Instrument Sans** (UI/labels) + **Geist Mono** (live numerals/
  data). This was a deliberate choice — keep it, do not swap to DM Sans.
- Data modelling is already correct and should be kept: `LightState`,
  `SwitchState`, `SensorState` (discriminated union: motion/temp/humidity/
  aqi), `SolarState`, `PowerwallState`, `GridState`, `TeslaState`, `Room`.
  These map directly onto Home Assistant entities later — don't redesign
  the shape, just change where the values come from.

## Build order (do these in sequence, don't skip ahead)

1. **Extract tokens.** Replace `src/styles/theme.css` with the Tactus token
   file provided. Go through `App.tsx` and replace every hardcoded hex/px
   value with the matching token (e.g. `#0b0c10` → `var(--tactus-bg-base)`
   or the Tailwind utility `bg-tactus-bg-base`). No raw hex left in JSX
   except inside the `COLORS` array (those are user-facing light-colour
   choices, not system tokens) and the `withAlpha()` glow helper, which
   reads token hex values at runtime — that's correct, leave it.

2. **Split the component inventory.** Break `App.tsx` into the structure
   below. Keep every component's logic and styling identical — this is a
   refactor, not a rewrite.

3. **Build the Home Assistant data layer.** Replace `INITIAL_SOLAR`,
   `INITIAL_POWERWALL`, `INITIAL_GRID`, `INITIAL_TESLA`, `INITIAL_ROOMS`,
   `INITIAL_OUTDOOR` with live values from HA. See "Home Assistant
   integration" below.

4. **Wire controls to HA service calls.** Toggling a `LightCard`, dragging
   `BrightnessSlider`, picking a colour — these currently only mutate local
   React state. They need to call HA services and reflect the *pending →
   confirmed* cycle (see Microinteraction rules below) rather than
   optimistically flipping state instantly.

5. **Deploy.** Vercel, same pattern as Aire/WorkBoard.

## Target file structure

```
src/
  app/
    App.tsx                 # shell, routing between HouseView/RoomView only
  components/
    cards/
      LightCard.tsx
      SwitchCard.tsx
      SensorCard.tsx
      SolarCard.tsx
      PowerwallCard.tsx
      TeslaCard.tsx
      RoomCard.tsx
    controls/
      BrightnessSlider.tsx
      RoomControls.tsx
    layout/
      HouseView.tsx
      RoomView.tsx
      EnvironmentBar.tsx
      SectionHeading.tsx
    icons/                   # LightbulbIcon, SunIcon, WifiOffIcon, AlertIcon, ChevronLeft
  lib/
    ha-client.ts             # WebSocket + REST client (see below)
    ha-types.ts              # mapping between HA entity shapes and Room/LightState/etc.
    helpers.ts                # withAlpha, dominantColor, aqiLabel, humidLabel
  types/
    index.ts                 # Color, CardState, Panel, LightState, SwitchState,
                              # SensorState + payloads, SolarState, PowerwallState,
                              # GridState, OutdoorState, TeslaState, Room
  styles/
    theme.css                 # Tactus tokens (provided separately)
    globals.css / tailwind.css / fonts.css  # unchanged
```

## Home Assistant integration

**Architecture:** Tactus → HA WebSocket API (live state + service calls) →
HA integrations → physical devices. Tactus never talks to Tesla, IKEA
DIRIGERA, or Nest directly — HA normalises everything into entities.

- **Auth:** long-lived access token from the HA user profile. Store as an
  env var, never commit it. The token grants full HA control — treat it
  like a password.
- **Initial load:** REST API (`GET /api/states`) for first paint, mapped
  into the `Room[]` / `SolarState` / etc. shapes already defined in types.
- **Live updates:** WebSocket subscription to `state_changed` events for
  every entity referenced on screen. Update only the changed entity's
  slice of state, don't re-fetch everything.
- **Control:** WebSocket `call_service` for actions — `light.turn_on`,
  `switch.toggle`, `climate.set_temperature`, etc. Optimistic UI is fine for
  the toggle press itself, but the **pending state must hold until HA
  confirms** the entity actually changed, then resolve to the confirmed
  value — not just whatever the user requested. If a command times out or
  the device doesn't update, show the existing error/unreachable state on
  the card, not a silent failure.
- **Entity mapping (provisional — confirm exact entity IDs from your HA
  Developer Tools → States before building):**
  - `sensor.powerwall_*` → `PowerwallState`
  - `sensor.solar_*` / Tesla solar entities → `SolarState`
  - `sensor.grid_*` → `GridState`
  - Tesla integration entities (`device_tracker`, `sensor.*_battery`,
    `lock.*`, `climate.*`) → `TeslaState`
  - DIRIGERA light/group entities → `LightState`
  - Plug/switch entities → `SwitchState`
  - Motion/temp/humidity/AQI sensor entities → `SensorState` payloads
- **Camera streams** (Nest doorbell) are out of scope for this build phase
  — they need separate RTSP/WebRTC handling (HA's `go2rtc`) and aren't part
  of the entity/state model above. Don't try to fit them into the same
  WebSocket state pipe; design a dedicated `DoorbellCard` loading/stream
  state when that phase starts.

## Design rules — do not violate these

- **No raw hex in components.** Every colour is a `--tactus-*` token. If a
  new colour is needed, add it to `theme.css` first, then reference it.
- **No flat drop-shadows.** Elevation is a soft glow in the card's own
  accent colour, only on active/on states. See `--tactus-glow-strength-*`.
- **No generic spinners.** Pending/awaiting-confirmation states use an
  ambient pulse/breathe animation (`--tactus-motion-pending-pulse`), never
  a spinner component. This is a hard rule carried over from the Aire
  system's "Breather" pattern — same philosophy, new name if needed here.
- **Numerals are always `--tactus-font-mono`** (Geist Mono). Labels and UI
  text are always `--tactus-font-sans` (Instrument Sans). Don't mix.
- **Radius scales with surface size** — bigger card, bigger radius. Use the
  existing `--tactus-radius-*` scale, don't introduce arbitrary values.
- **Colour means state, not decoration.** Amber = on/active/solar. Green =
  good/battery. Blue = informational/EV. Red = error. Don't reach for a
  token outside its semantic meaning just because it looks nice somewhere.
- **Dark theme is default and primary.** A light "day" theme is a future
  phase — don't build it speculatively, but don't hardcode anything in a
  way that would block it later (i.e. keep using tokens, not literals).

## Known constraints from prior builds (carry these over)

- MCP server credentials are session-scoped and cannot be accessed from
  artifact iframes. If any Claude-powered feature gets added to Tactus
  later, it must delegate via `sendPrompt()` rather than holding
  credentials client-side. Not relevant to the HA connection itself (that's
  a direct WebSocket/REST client), but relevant if AI features are added.
- Metric units only — kW, kWh, °C, km. Never imperial.

## Open questions to confirm before deploying

- Exact HA entity IDs for the Powerwall, solar, grid, and Tesla integration
  (placeholders above — confirm via Developer Tools → States).
- Whether the wall tablet runs a browser kiosk pointed at the Vercel
  deployment, or a local network-only build (affects whether the HA token
  can ever be client-side vs. needing a small backend proxy).
