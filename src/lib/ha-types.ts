import { COLORS } from "@/types";
import type { Room, LightState, Color, SolarState, PowerwallState, GridState, TeslaState, OutdoorState } from "@/types";
import type { HAEntity, HAStateMap } from "@/lib/ha-client";

// Real entity IDs confirmed from HA Developer Tools → States, 2026-07-10 —
// see CLAUDE.md "Entity mapping" section.
export const HA_ENTITIES = {
  solarPower: "sensor.home_solar_power",
  solarEnergyToday: "sensor.home_solar_generated",
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
  outdoorWeather: "weather.forecast_home",
} as const;

const SOLAR_IDS = new Set<string>([HA_ENTITIES.solarPower, HA_ENTITIES.solarEnergyToday]);
const POWERWALL_IDS = new Set<string>([HA_ENTITIES.powerwallCharge, HA_ENTITIES.powerwallFlow, HA_ENTITIES.powerwallReserve]);
const GRID_IDS = new Set<string>([HA_ENTITIES.gridPower]);
const TESLA_IDS = new Set<string>([
  HA_ENTITIES.teslaBattery, HA_ENTITIES.teslaRange, HA_ENTITIES.teslaChargerPower,
  HA_ENTITIES.teslaInsideTemp, HA_ENTITIES.teslaTracker, HA_ENTITIES.teslaLock, HA_ENTITIES.teslaClimate,
]);
const OUTDOOR_IDS = new Set<string>([HA_ENTITIES.outdoorWeather]);

export function isSolarEntity(id: string)     { return SOLAR_IDS.has(id); }
export function isPowerwallEntity(id: string) { return POWERWALL_IDS.has(id); }
export function isGridEntity(id: string)      { return GRID_IDS.has(id); }
export function isTeslaEntity(id: string)     { return TESLA_IDS.has(id); }
export function isOutdoorEntity(id: string)   { return OUTDOOR_IDS.has(id); }
export function isLightEntity(id: string)     { return id.startsWith("light."); }

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

export function mapLightEntity(entity: HAEntity): LightState {
  const isUnavailable = entity.state === "unavailable" || entity.state === "unknown";
  const isOn = entity.state === "on";
  const brightness255 = entity.attributes.brightness as number | undefined;
  const brightness = brightness255 !== undefined ? Math.round((brightness255 / 255) * 100) : 0;
  const rgb = entity.attributes.rgb_color as [number, number, number] | undefined;

  return {
    id: entity.entity_id,
    device: (entity.attributes.friendly_name as string) ?? entity.entity_id,
    type: "light",
    cardState: isUnavailable ? "error" : isOn ? "on" : "off",
    panel: "summary",
    brightness,
    selectedColor: rgb ? nearestColor(rgb) : COLORS[0],
  };
}

function roomNameFromSlug(slug: string): string {
  return slug.split("_").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
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

  return Array.from(roomLights.entries()).map(([slug, lights]) => {
    const onLights = lights.filter((l) => l.cardState === "on");
    return {
      id: slug,
      name: roomNameFromSlug(slug),
      lights,
      switches: [],
      sensors: [],
      roomBrightness: onLights.length ? Math.round(onLights.reduce((s, l) => s + l.brightness, 0) / onLights.length) : 0,
      roomColor: onLights[0]?.selectedColor ?? COLORS[0],
    };
  });
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
  // sensor.home_battery_power is already in kW — confirm the sign convention
  // against your actual Powerwall install (positive vs negative for
  // charge/discharge) before trusting the "charging"/"discharging" label below.
  const flowKw = round(num(states, HA_ENTITIES.powerwallFlow), 1);
  const reservePct = num(states, HA_ENTITIES.powerwallReserve);
  const status: PowerwallState["status"] =
    flowKw > 0.05 ? "charging" : flowKw < -0.05 ? "discharging" : pct <= reservePct ? "backup" : "standby";
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
  const trackerState = tracker?.state ?? "home"; // "not_home" | "home" from device_tracker.ghost_location
  // sensor.ghost_charger_power is already in kW.
  const chargingKw = round(num(states, HA_ENTITIES.teslaChargerPower), 1);
  const status: TeslaState["status"] = chargingKw > 0.05 ? "charging" : trackerState !== "home" ? "away" : "parked";

  return {
    // Model name isn't exposed as an HA entity/attribute — hardcoded per CLAUDE.md.
    model: "Model Y",
    batteryPct: round(num(states, HA_ENTITIES.teslaBattery), 0),
    rangeKm: round(num(states, HA_ENTITIES.teslaRange), 0), // already km
    status,
    chargingKw: status === "charging" ? chargingKw : undefined,
    tempC: num(states, HA_ENTITIES.teslaInsideTemp),
    climateOn: climate?.state === "on" || climate?.state === "heat" || climate?.state === "cool",
    locked: lock?.state === "locked",
    location: trackerState === "home" ? "Parked at home" : "Away",
  };
}

export function mapHAStatesToOutdoor(states: HAStateMap): OutdoorState {
  const weather = states[HA_ENTITIES.outdoorWeather];
  return {
    tempC: (weather?.attributes.temperature as number) ?? 0,
    humidity: (weather?.attributes.humidity as number) ?? 0,
    // No AQI/PM2.5 sensor exists in HA yet (per CLAUDE.md "Deferred" section).
    // Left at 0 rather than reading a nonexistent entity — revisit once an
    // AQI sensor is added.
    aqi: 0,
    pm25: 0,
    condition: weather?.state ?? "unknown",
  };
}
