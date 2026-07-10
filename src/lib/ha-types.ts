import { COLORS } from "@/types";
import type { Room, LightState, Color, SolarState, PowerwallState, GridState, TeslaState, OutdoorState } from "@/types";
import type { HAEntity, HAStateMap } from "@/lib/ha-client";

// Provisional entity IDs from CLAUDE.md's "Entity mapping" section — confirm
// the real ones via HA Developer Tools → States before relying on this in prod.
export const HA_ENTITIES = {
  solarPower: "sensor.solar_power",
  solarEnergyToday: "sensor.solar_energy_today",
  powerwallCharge: "sensor.powerwall_charge",
  powerwallFlow: "sensor.powerwall_power",
  powerwallReserve: "number.powerwall_backup_reserve",
  gridImport: "sensor.grid_import_power",
  gridExport: "sensor.grid_export_power",
  teslaBattery: "sensor.tesla_battery",
  teslaRange: "sensor.tesla_range",
  teslaChargerPower: "sensor.tesla_charger_power",
  teslaInsideTemp: "sensor.tesla_inside_temp",
  teslaTracker: "device_tracker.tesla",
  teslaLock: "lock.tesla",
  teslaClimate: "climate.tesla",
  outdoorWeather: "weather.home",
  outdoorAqi: "sensor.outdoor_aqi",
  outdoorPm25: "sensor.outdoor_pm25",
} as const;

const SOLAR_IDS = new Set<string>([HA_ENTITIES.solarPower, HA_ENTITIES.solarEnergyToday]);
const POWERWALL_IDS = new Set<string>([HA_ENTITIES.powerwallCharge, HA_ENTITIES.powerwallFlow, HA_ENTITIES.powerwallReserve]);
const GRID_IDS = new Set<string>([HA_ENTITIES.gridImport, HA_ENTITIES.gridExport]);
const TESLA_IDS = new Set<string>([
  HA_ENTITIES.teslaBattery, HA_ENTITIES.teslaRange, HA_ENTITIES.teslaChargerPower,
  HA_ENTITIES.teslaInsideTemp, HA_ENTITIES.teslaTracker, HA_ENTITIES.teslaLock, HA_ENTITIES.teslaClimate,
]);
const OUTDOOR_IDS = new Set<string>([HA_ENTITIES.outdoorWeather, HA_ENTITIES.outdoorAqi, HA_ENTITIES.outdoorPm25]);

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

function hexToRgb(hex: string): [number, number, number] {
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
// since /api/states doesn't expose HA's area registry. Confirm this naming
// convention holds for the real DIRIGERA setup before relying on it.
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
  const generatingKw = num(states, HA_ENTITIES.solarPower) / 1000;
  return {
    generatingKw,
    todayKwh: num(states, HA_ENTITIES.solarEnergyToday),
    // Hourly generation isn't in a single state snapshot — it needs HA's
    // history/statistics API. Left flat until that's wired up.
    hourly: Array(24).fill(0),
    status: generatingKw > 0.05 ? "generating" : "idle",
  };
}

export function mapHAStatesToPowerwall(states: HAStateMap): PowerwallState {
  const pct = num(states, HA_ENTITIES.powerwallCharge);
  const flowKw = num(states, HA_ENTITIES.powerwallFlow) / 1000;
  const reservePct = num(states, HA_ENTITIES.powerwallReserve);
  const status: PowerwallState["status"] =
    flowKw > 0.05 ? "charging" : flowKw < -0.05 ? "discharging" : pct <= reservePct ? "backup" : "standby";
  return { pct, flowKw: Math.abs(flowKw), reservePct, status };
}

export function mapHAStatesToGrid(states: HAStateMap): GridState {
  return {
    importKw: num(states, HA_ENTITIES.gridImport) / 1000,
    exportKw: num(states, HA_ENTITIES.gridExport) / 1000,
  };
}

export function mapHAStatesToTesla(states: HAStateMap): TeslaState {
  const tracker = states[HA_ENTITIES.teslaTracker];
  const climate = states[HA_ENTITIES.teslaClimate];
  const lock = states[HA_ENTITIES.teslaLock];
  const trackerState = tracker?.state ?? "home";
  const chargingKw = num(states, HA_ENTITIES.teslaChargerPower) / 1000;
  const status: TeslaState["status"] = chargingKw > 0.05 ? "charging" : trackerState !== "home" ? "away" : "parked";

  return {
    model: (tracker?.attributes.model as string) ?? "Tesla",
    batteryPct: num(states, HA_ENTITIES.teslaBattery),
    rangeKm: num(states, HA_ENTITIES.teslaRange),
    status,
    chargingKw: status === "charging" ? chargingKw : undefined,
    tempC: num(states, HA_ENTITIES.teslaInsideTemp),
    climateOn: climate?.state === "on" || climate?.state === "heat" || climate?.state === "cool",
    locked: lock?.state === "locked",
    location: (tracker?.attributes.friendly_name as string) ?? (trackerState === "home" ? "Parked at home" : trackerState),
  };
}

export function mapHAStatesToOutdoor(states: HAStateMap): OutdoorState {
  const weather = states[HA_ENTITIES.outdoorWeather];
  return {
    tempC: (weather?.attributes.temperature as number) ?? 0,
    humidity: (weather?.attributes.humidity as number) ?? 0,
    aqi: num(states, HA_ENTITIES.outdoorAqi),
    pm25: num(states, HA_ENTITIES.outdoorPm25),
    condition: weather?.state ?? "unknown",
  };
}
