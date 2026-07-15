import { COLORS } from "@/types";
import type {
  Room, LightState, LightColorMode, Color, SolarState, PowerwallState, GridState, TeslaState, OutdoorState,
  HomeLoadState, TeslaControlKey, SeatHeaterLevel, SteeringHeaterLevel, ClimatePreset, ClimateFanMode,
  AutomationState, AutomationRunState, SceneState, IndoorState,
} from "@/types";
import type { HAEntity, HAStateMap } from "@/lib/ha-client";

// Real entity IDs confirmed from HA Developer Tools → States, 2026-07-10 —
// see CLAUDE.md "Entity mapping" section. Tesla quick-action/comfort entities
// confirmed 2026-07-12.
export const HA_ENTITIES = {
  solarPower: "sensor.home_solar_power",
  solarEnergyToday: "sensor.home_solar_generated",
  homeLoadPower: "sensor.home_load_power",
  powerwallCharge: "sensor.home_percentage_charged",
  powerwallFlow: "sensor.home_battery_power",
  powerwallReserve: "number.home_backup_reserve",
  gridPower: "sensor.home_grid_power", // single signed sensor — split by sign, not two separate entities
  teslaBattery: "sensor.ghost_battery_level",
  teslaRange: "sensor.ghost_estimate_battery_range",
  teslaChargerPower: "sensor.ghost_charger_power",
  teslaInsideTemp: "sensor.ghost_inside_temperature",
  teslaTracker: "device_tracker.ghost_location",
  teslaLock: "lock.ghost_lock",
  teslaClimate: "climate.ghost_climate",
  teslaHonk: "button.ghost_honk_horn",
  teslaFlash: "button.ghost_flash_lights",
  teslaSentry: "switch.ghost_sentry_mode",
  teslaValet: "switch.ghost_valet_mode",
  teslaSeatHeaterFL: "select.ghost_seat_heater_front_left",
  teslaSeatHeaterFR: "select.ghost_seat_heater_front_right",
  teslaSteeringWheelHeater: "select.ghost_steering_wheel_heater",
  teslaFrunk: "cover.ghost_frunk",
  teslaTrunk: "cover.ghost_trunk",
  teslaWindows: "cover.ghost_windows",
  outdoorWeather: "weather.forecast_home",
  indoorTemp: "sensor.kids_room_kids_temperature_temperature",
  indoorHumidity: "sensor.kids_room_kids_temperature_humidity",
  carOutsideTemp: "sensor.ghost_outside_temperature",
} as const;

// The car only reports while awake, so a reading older than this must not
// stick around looking live — fall back to the weather entity instead.
export const OUTDOOR_CAR_MAX_AGE_MS = 30 * 60 * 1000;

const SOLAR_IDS = new Set<string>([HA_ENTITIES.solarPower, HA_ENTITIES.solarEnergyToday]);
const HOME_LOAD_IDS = new Set<string>([HA_ENTITIES.homeLoadPower]);
const POWERWALL_IDS = new Set<string>([HA_ENTITIES.powerwallCharge, HA_ENTITIES.powerwallFlow, HA_ENTITIES.powerwallReserve]);
const GRID_IDS = new Set<string>([HA_ENTITIES.gridPower]);
const TESLA_IDS = new Set<string>([
  HA_ENTITIES.teslaBattery, HA_ENTITIES.teslaRange, HA_ENTITIES.teslaChargerPower,
  HA_ENTITIES.teslaInsideTemp, HA_ENTITIES.teslaTracker, HA_ENTITIES.teslaLock, HA_ENTITIES.teslaClimate,
  HA_ENTITIES.teslaHonk, HA_ENTITIES.teslaFlash, HA_ENTITIES.teslaSentry, HA_ENTITIES.teslaValet,
  HA_ENTITIES.teslaSeatHeaterFL, HA_ENTITIES.teslaSeatHeaterFR, HA_ENTITIES.teslaSteeringWheelHeater,
  HA_ENTITIES.teslaFrunk, HA_ENTITIES.teslaTrunk, HA_ENTITIES.teslaWindows,
]);
const OUTDOOR_IDS = new Set<string>([HA_ENTITIES.outdoorWeather, HA_ENTITIES.carOutsideTemp]);
const INDOOR_IDS = new Set<string>([HA_ENTITIES.indoorTemp, HA_ENTITIES.indoorHumidity]);

// Reverse lookup for clearing a pending Tesla control once its entity's
// state_changed confirms. climate.ghost_climate backs three separate keys
// (on/off, preset, fan mode) — that one's handled as a special case by the
// caller instead of through this map, since a single entity can't map to
// three keys.
export const TESLA_CONTROL_ENTITY: Partial<Record<string, TeslaControlKey>> = {
  [HA_ENTITIES.teslaLock]: "lock",
  [HA_ENTITIES.teslaSentry]: "sentry",
  [HA_ENTITIES.teslaValet]: "valet",
  [HA_ENTITIES.teslaSeatHeaterFL]: "seatHeaterFL",
  [HA_ENTITIES.teslaSeatHeaterFR]: "seatHeaterFR",
  [HA_ENTITIES.teslaSteeringWheelHeater]: "steeringWheelHeater",
  [HA_ENTITIES.teslaFrunk]: "frunk",
  [HA_ENTITIES.teslaTrunk]: "trunk",
  [HA_ENTITIES.teslaWindows]: "windows",
};

export function isSolarEntity(id: string)     { return SOLAR_IDS.has(id); }
export function isHomeLoadEntity(id: string)  { return HOME_LOAD_IDS.has(id); }
export function isPowerwallEntity(id: string) { return POWERWALL_IDS.has(id); }
export function isGridEntity(id: string)      { return GRID_IDS.has(id); }
export function isTeslaEntity(id: string)     { return TESLA_IDS.has(id); }
export function isOutdoorEntity(id: string)   { return OUTDOOR_IDS.has(id); }
export function isIndoorEntity(id: string)    { return INDOOR_IDS.has(id); }
export function isLightEntity(id: string)     { return id.startsWith("light."); }

// Unlike every other domain above (curated HA_ENTITIES map), automations and
// scenes are discovered dynamically at runtime by entity_id prefix — see
// CLAUDE.md task note. There is no fixed list to check membership against.
export function isAutomationEntity(id: string) { return id.startsWith("automation."); }
export function isSceneEntity(id: string)      { return id.startsWith("scene."); }

function num(states: HAStateMap, id: string, fallback = 0): number {
  const raw = states[id]?.state;
  const n = raw !== undefined ? parseFloat(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// HA sensors often report many decimal places (e.g. 85.0161988630409). The UI
// expects clean numerals — round to a fixed precision before display.
function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// Like num(), but preserves "no real reading" as null instead of coercing to
// a fallback — unavailable/unknown/missing entities should render blank, not
// a misleading 0.
function numOrNull(states: HAStateMap, id: string, decimals: number): number | null {
  const raw = states[id]?.state;
  if (raw === undefined || raw === "unavailable" || raw === "unknown") return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? round(n, decimals) : null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// DIRIGERA lights report rgb_color, not one of Tactus's fixed swatches — snap
// to the nearest COLORS entry so the UI's colour picker stays in sync with reality.
function nearestColor(rgb: [number, number, number]): Color {
  let best: Color = COLORS[0];
  let bestDist = Infinity;
  for (const c of COLORS) {
    const [r, g, b] = hexToRgb(c.hex);
    const dist = (r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2;
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  return best;
}

// Real device capability from attributes.supported_color_modes — confirmed
// against the actual 15 DIRIGERA light.* entities in HA (2026-07-10). HA
// reports "hs"/"xy"/"rgb"/"rgbw"/"rgbww" for full-colour lights (never a mode
// literally named "rgb" on our devices — they report "hs" — but any of these
// implies a full colour picker makes sense), "color_temp" alone for tunable-
// white-only lights, and just "brightness" for dimmer-only lights.
function colorModeFromSupported(modes: string[]): LightColorMode {
  if (modes.some((m) => m === "hs" || m === "xy" || m === "rgb" || m === "rgbw" || m === "rgbww")) return "rgb";
  if (modes.includes("color_temp")) return "temp";
  return "brightness";
}

export function mapLightEntity(entity: HAEntity): LightState {
  const isUnavailable = entity.state === "unavailable" || entity.state === "unknown";
  const isOn = entity.state === "on";
  const brightness255 = entity.attributes.brightness as number | null | undefined;
  const brightness = brightness255 != null ? Math.round((brightness255 / 255) * 100) : 0;
  const rgb = entity.attributes.rgb_color as [number, number, number] | null | undefined;

  const supportedModes = (entity.attributes.supported_color_modes as string[] | undefined) ?? [];
  const colorMode = colorModeFromSupported(supportedModes);

  const minK = entity.attributes.min_color_temp_kelvin as number | undefined;
  const maxK = entity.attributes.max_color_temp_kelvin as number | undefined;
  const currentK = entity.attributes.color_temp_kelvin as number | null | undefined;
  const colorTempRange = (minK !== undefined && maxK !== undefined) ? { min: minK, max: maxK } : undefined;
  const colorTempKelvin = currentK ?? (colorTempRange ? Math.round((colorTempRange.min + colorTempRange.max) / 2) : undefined);

  return {
    id: entity.entity_id,
    // Some DIRIGERA friendly_names carry a trailing space (e.g. "Pendants ") — trim it.
    device: ((entity.attributes.friendly_name as string) ?? entity.entity_id).trim(),
    type: "light",
    cardState: isUnavailable ? "error" : isOn ? "on" : "off",
    panel: "summary",
    brightness,
    colorMode,
    selectedColor: rgb ? nearestColor(rgb) : COLORS[0],
    colorTempRange,
    colorTempKelvin,
  };
}

function roomNameFromSlug(slug: string): string {
  return slug.split("_").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
}

// Average brightness across a room's (or the whole house's) currently-on
// lights. Shared so it can be recomputed live from the lights array itself —
// not just once at initial load — every time any light's confirmed state
// changes, regardless of what triggered the change (individual toggle, room
// bulk action, or house bulk action).
export function computeRoomBrightness(lights: LightState[]): number {
  const onLights = lights.filter((l) => l.cardState === "on");
  return onLights.length ? Math.round(onLights.reduce((s, l) => s + l.brightness, 0) / onLights.length) : 0;
}

// Rooms are derived from DIRIGERA light entity_ids (light.<room>_<device>),
// since /api/states doesn't expose HA's area registry. Confirmed against the
// real 19 light.* entities in HA — room prefixes are: bedroom, kitchen,
// living_room, laundry, bathroom, front_door.
//
// SwitchState and per-room SensorState are deferred per CLAUDE.md — every
// room comes back with switches: [] and sensors: [] until that data layer exists.
export function mapHAStatesToRooms(states: HAStateMap): Room[] {
  const roomLights = new Map<string, LightState[]>();

  for (const entity of Object.values(states)) {
    if (!isLightEntity(entity.entity_id)) continue;
    const [, objectId] = entity.entity_id.split(".");
    const roomSlug = (entity.attributes.room as string) ?? objectId.split("_")[0];
    const lights = roomLights.get(roomSlug) ?? [];
    lights.push(mapLightEntity(entity));
    roomLights.set(roomSlug, lights);
  }

  return Array.from(roomLights.entries()).map(([slug, lights]) => ({
    id: slug,
    name: roomNameFromSlug(slug),
    lights,
    switches: [],
    sensors: [],
    roomBrightness: computeRoomBrightness(lights),
  }));
}

export function mapHAStatesToSolar(states: HAStateMap): SolarState {
  // sensor.home_solar_power is already in kW (small instantaneous values,
  // e.g. 0.581) — do NOT divide by 1000 here, that was wrong for this entity.
  const generatingKw = round(num(states, HA_ENTITIES.solarPower), 1);
  return {
    generatingKw,
    todayKwh: round(num(states, HA_ENTITIES.solarEnergyToday), 1),
    // Hourly generation isn't in a single state snapshot — it needs HA's
    // history/statistics API. Left flat until that's wired up.
    hourly: Array(24).fill(0),
    status: generatingKw > 0.05 ? "generating" : "idle",
  };
}

export function mapHAStatesToPowerwall(states: HAStateMap): PowerwallState {
  const pct = round(num(states, HA_ENTITIES.powerwallCharge), 0);
  // sensor.home_battery_power is already in kW. Confirmed against the real
  // Powerwall (2026-07-12): negative = charging (power flowing into the
  // battery), positive = discharging (power flowing out) — the opposite of
  // the initial assumption.
  const flowKw = round(num(states, HA_ENTITIES.powerwallFlow), 1);
  const reservePct = num(states, HA_ENTITIES.powerwallReserve);
  const status: PowerwallState["status"] =
    flowKw < -0.05 ? "charging" : flowKw > 0.05 ? "discharging" : pct <= reservePct ? "backup" : "standby";
  return { pct, flowKw: round(Math.abs(flowKw), 1), reservePct, status };
}

export function mapHAStatesToGrid(states: HAStateMap): GridState {
  // There's only ONE signed grid-power sensor in HA (sensor.home_grid_power),
  // not separate import/export sensors. Split by sign: positive = importing
  // from grid, negative = exporting to grid. Confirm this sign convention
  // matches reality once live (may need flipping).
  const gridKw = num(states, HA_ENTITIES.gridPower);
  return {
    importKw: round(Math.max(0, gridKw), 1),
    exportKw: round(Math.max(0, -gridKw), 1),
  };
}

export function mapHAStatesToTesla(states: HAStateMap): TeslaState {
  const tracker = states[HA_ENTITIES.teslaTracker];
  const climate = states[HA_ENTITIES.teslaClimate];
  const lock = states[HA_ENTITIES.teslaLock];
  const sentry = states[HA_ENTITIES.teslaSentry];
  const valet = states[HA_ENTITIES.teslaValet];
  const seatFL = states[HA_ENTITIES.teslaSeatHeaterFL];
  const seatFR = states[HA_ENTITIES.teslaSeatHeaterFR];
  const wheelHeater = states[HA_ENTITIES.teslaSteeringWheelHeater];
  const frunk = states[HA_ENTITIES.teslaFrunk];
  const trunk = states[HA_ENTITIES.teslaTrunk];
  const windows = states[HA_ENTITIES.teslaWindows];
  const trackerState = tracker?.state ?? "home"; // "not_home" | "home" from device_tracker.ghost_location
  // sensor.ghost_charger_power is already in kW.
  const chargingKw = round(num(states, HA_ENTITIES.teslaChargerPower), 1);
  const status: TeslaState["status"] = chargingKw > 0.05 ? "charging" : trackerState !== "home" ? "away" : "parked";

  return {
    // Model name isn't exposed as an HA entity/attribute (it's HA device-registry
    // data, not entity state — a different, more complex API than /api/states).
    // Hardcoded per CLAUDE.md; confirmed against the real HA device page
    // (2026-07-12): "Model 3 Highland".
    model: "Model 3 Highland",
    batteryPct: round(num(states, HA_ENTITIES.teslaBattery), 0),
    rangeKm: round(num(states, HA_ENTITIES.teslaRange), 0), // already km
    status,
    chargingKw: status === "charging" ? chargingKw : undefined,
    tempC: num(states, HA_ENTITIES.teslaInsideTemp),
    climateOn: climate?.state === "on" || climate?.state === "heat" || climate?.state === "cool",
    locked: lock?.state === "locked",
    location: trackerState === "home" ? "Parked at home" : "Away",
    sentryMode: sentry?.state === "on",
    valetMode: valet?.state === "on",
    seatHeaterFL: (seatFL?.state as SeatHeaterLevel) ?? "off",
    seatHeaterFR: (seatFR?.state as SeatHeaterLevel) ?? "off",
    steeringWheelHeater: (wheelHeater?.state as SteeringHeaterLevel) ?? "off",
    climatePreset: (climate?.attributes.preset_mode as ClimatePreset) ?? "off",
    climateFanMode: (climate?.attributes.fan_mode as ClimateFanMode) ?? "off",
    // Covers report "open"/"closed" (also transiently "opening"/"closing") —
    // treat anything other than a confirmed "open" as closed for display;
    // the pending pulse (not this state string) covers the in-between UI.
    frunkOpen: frunk?.state === "open",
    trunkOpen: trunk?.state === "open",
    windowsOpen: windows?.state === "open",
  };
}

export function mapHAStatesToHomeLoad(states: HAStateMap): HomeLoadState {
  // sensor.home_load_power is already in kW (e.g. 0.354).
  return { loadKw: round(num(states, HA_ENTITIES.homeLoadPower), 2) };
}

// Per-entity mapper, mirroring mapLightEntity — lets the WS handler patch a
// single automation in place without recomputing the whole array (and losing
// any other automation's in-flight `status`). "unavailable"/"unknown" is a
// real HA integration/device failure, distinct from the user deliberately
// switching the automation off — kept as its own AutomationRunState rather
// than collapsed into "off".
export function mapAutomationEntity(entity: HAEntity): AutomationState {
  const runState: AutomationRunState =
    entity.state === "on" ? "on" : entity.state === "off" ? "off" : "unavailable";
  return {
    id: entity.entity_id,
    name: ((entity.attributes.friendly_name as string) ?? entity.entity_id).trim(),
    state: runState,
    lastTriggered: (entity.attributes.last_triggered as string | null | undefined) ?? null,
    status: "idle",
  };
}

export function mapSceneEntity(entity: HAEntity): SceneState {
  return {
    id: entity.entity_id,
    name: ((entity.attributes.friendly_name as string) ?? entity.entity_id).trim(),
  };
}

// Sorted alphabetically by friendly_name per the brief — dynamic discovery,
// not a curated list, so there's no other stable order to fall back on.
export function mapHAStatesToAutomations(states: HAStateMap): AutomationState[] {
  return Object.values(states)
    .filter((e) => isAutomationEntity(e.entity_id))
    .map(mapAutomationEntity)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function mapHAStatesToScenes(states: HAStateMap): SceneState[] {
  return Object.values(states)
    .filter((e) => isSceneEntity(e.entity_id))
    .map(mapSceneEntity)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function mapHAStatesToIndoor(states: HAStateMap): IndoorState {
  return {
    tempC: numOrNull(states, HA_ENTITIES.indoorTemp, 1),
    humidityPct: numOrNull(states, HA_ENTITIES.indoorHumidity, 0),
  };
}

// Car reads live only while awake — trust it only if it's a real number,
// not unavailable/unknown, and its last_updated is within
// OUTDOOR_CAR_MAX_AGE_MS, otherwise a stale awake-time reading would stick
// around looking current. No device_tracker "home" gate: the tracker
// (HA_ENTITIES.teslaTracker) is already mapped, but it's dispatched down the
// isTeslaEntity branch in App.tsx's WS handler, not isOutdoorEntity, so
// wiring it in here wouldn't actually get a recompute on location change —
// not the "trivial" case the brief called for. Freshness alone covers the
// "car went away and stopped reporting" case anyway.
function carOutdoorTempC(states: HAStateMap): number | null {
  const car = states[HA_ENTITIES.carOutsideTemp];
  if (!car || car.state === "unavailable" || car.state === "unknown") return null;
  const n = parseFloat(car.state);
  if (!Number.isFinite(n)) return null;
  const updatedAt = new Date(car.last_updated).getTime();
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > OUTDOOR_CAR_MAX_AGE_MS) return null;
  return round(n, 1);
}

export function mapHAStatesToOutdoor(states: HAStateMap): OutdoorState {
  const weather = states[HA_ENTITIES.outdoorWeather];
  const weatherTempRaw = weather?.attributes.temperature as number | undefined;
  const weatherTempC = typeof weatherTempRaw === "number" ? round(weatherTempRaw, 1) : null;

  return {
    tempC: carOutdoorTempC(states) ?? weatherTempC,
    humidity: (weather?.attributes.humidity as number) ?? 0,
    // No AQI/PM2.5 sensor exists in HA yet (per CLAUDE.md "Deferred" section).
    // Left at 0 rather than reading a nonexistent entity — revisit once an
    // AQI sensor is added.
    aqi: 0,
    pm25: 0,
    condition: weather?.state ?? "unknown",
  };
}
