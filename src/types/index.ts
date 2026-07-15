// ─── Colour choices (user-facing light colour palette) ───────────────────────

export const COLORS = [
  { id: "warm-white", label: "Warm White", hex: "#FFF9E5" },
  { id: "cool-white", label: "Cool White", hex: "#E2F1FF" },
  { id: "amber",      label: "Amber",      hex: "#F59E0B" },
  { id: "pink",       label: "Pink",       hex: "#FB7185" },
  { id: "blue",       label: "Blue",       hex: "#3B82F6" },
  { id: "green",      label: "Green",      hex: "#22C55E" },
];

export type Color     = typeof COLORS[number];
export type CardState = "off" | "on" | "pending" | "error";
export type Panel     = "summary" | "brightness" | "color";

// A light's actual DIRIGERA/HA colour capability (attributes.supported_color_modes),
// not assumed — "rgb" (hs/xy/rgb*), "temp" (color_temp only), or "brightness" (no colour at all).
export type LightColorMode = "rgb" | "temp" | "brightness";

// ─── Device state types ───────────────────────────────────────────────────────

export type LightState = {
  id: string; device: string; type: "light";
  cardState: CardState; panel: Panel;
  brightness: number; selectedColor: Color;
  colorMode: LightColorMode;
  colorTempKelvin?: number;                        // current value, only meaningful when colorMode === "temp"
  colorTempRange?: { min: number; max: number };    // device's real min/max_color_temp_kelvin
};

export type SwitchState = {
  id: string; device: string; type: "switch";
  isOn: boolean; wattsNow: number; todayKwh: number;
};

export type MotionSensor   = { kind: "motion";   motionDetected: boolean; lastSeen: string };
export type TempSensor     = { kind: "temp";     tempC: number; trend: "up" | "down" | "stable" };
export type HumidSensor    = { kind: "humidity"; humidity: number };
export type AQISensor      = { kind: "aqi";      aqi: number; co2: number; pm25: number };
export type SensorPayload  = MotionSensor | TempSensor | HumidSensor | AQISensor;
export type SensorState    = { id: string; device: string; type: "sensor"; data: SensorPayload };

// ─── Energy / vehicle state types ─────────────────────────────────────────────

export type SolarState = {
  generatingKw: number; todayKwh: number;
  hourly: number[];
  status: "generating" | "idle";
};

export type PowerwallState = {
  pct: number; flowKw: number; reservePct: number;
  status: "charging" | "discharging" | "standby" | "backup";
};

export type GridState = { importKw: number; exportKw: number };

export type OutdoorState = { tempC: number; humidity: number; aqi: number; pm25: number; condition: string };

// Dedicated indoor sensor reading (sensor.kids_room_kids_temperature_*), not
// the per-room Matter SensorState array — that's deferred/empty per
// CLAUDE.md. null (not 0) means the entity is unavailable/unknown — the
// panel renders blank rather than a misleading zero.
export type IndoorState = { tempC: number | null; humidityPct: number | null };

// sensor.home_load_power — instantaneous whole-home draw, kW.
export type HomeLoadState = { loadKw: number };

export type SeatHeaterLevel      = "off" | "low" | "medium" | "high";
export type SteeringHeaterLevel  = "off" | "low" | "high";
export type ClimatePreset        = "off" | "keep" | "dog" | "camp";
export type ClimateFanMode       = "off" | "bioweapon";

// Shared pending → confirmed status for any HA-backed toggle/select/cover
// control that isn't part of the core device state itself (mirrors CardState
// "pending"/"error" but for controls that don't have their own card).
export type ControlStatus = "idle" | "pending" | "error";

export type TeslaControlKey =
  | "lock" | "climate" | "sentry" | "valet"
  | "seatHeaterFL" | "seatHeaterFR" | "steeringWheelHeater"
  | "climatePreset" | "climateFanMode"
  | "frunk" | "trunk" | "windows";

export type TeslaActions = {
  toggleClimate: () => void;
  toggleLock: () => void;
  toggleSentry: () => void;
  toggleValet: () => void;
  setSeatHeaterFL: (level: SeatHeaterLevel) => void;
  setSeatHeaterFR: (level: SeatHeaterLevel) => void;
  setSteeringWheelHeater: (level: SteeringHeaterLevel) => void;
  setClimatePreset: (preset: ClimatePreset) => void;
  setClimateFanMode: (mode: ClimateFanMode) => void;
  openFrunk: () => void;
  toggleTrunk: () => void;
  toggleWindows: () => void;
  honk: () => void;
  flash: () => void;
};

export type TeslaState = {
  model: string; batteryPct: number; rangeKm: number;
  status: "parked" | "charging" | "away";
  chargingKw?: number; tempC: number; climateOn: boolean; locked: boolean;
  location?: string;
  sentryMode: boolean;
  valetMode: boolean;
  seatHeaterFL: SeatHeaterLevel;
  seatHeaterFR: SeatHeaterLevel;
  steeringWheelHeater: SteeringHeaterLevel;
  climatePreset: ClimatePreset;
  climateFanMode: ClimateFanMode;
  frunkOpen: boolean;
  trunkOpen: boolean;
  windowsOpen: boolean;
};

// ─── Automations & Scenes ───────────────────────────────────────────────────

// HA reports "on"/"off" for a normally-functioning automation, but
// "unavailable"/"unknown" when the automation's integration/device can't be
// reached — that's a distinct, real failure state, not the same thing as a
// user deliberately disabling it. Kept separate from `status` (below), which
// only tracks this card's own enable/disable toggle in flight.
export type AutomationRunState = "on" | "off" | "unavailable";

export type AutomationState = {
  id: string;                       // entity_id, e.g. "automation.turn_off_lights_at_night"
  name: string;                     // friendly_name, trimmed
  state: AutomationRunState;
  lastTriggered: string | null;     // last_triggered attribute (ISO 8601), or null if never
  status: ControlStatus;            // enable/disable toggle's pending → confirmed cycle only —
                                     // "Run now" is fire-and-forget and isn't reflected here
};

// No persistent on/off state — scenes are fire-and-forget by design. The
// activation pulse is transient local UI state inside SceneCard, not
// app-level data.
export type SceneState = {
  id: string;                       // entity_id, e.g. "scene.movie_night"
  name: string;                     // friendly_name, trimmed
};

// Top-level app view. Deliberately separate from LightState's `Panel` (that's
// a light card's own internal summary/brightness/color sub-navigation, a
// different concept). "automations" also holds the Scenes section — kept as
// one view rather than splitting nav further, per the brief.
export type MainView = "house" | "automations";

// ─── Room ─────────────────────────────────────────────────────────────────────

export type Room = {
  id: string; name: string;
  lights: LightState[]; switches: SwitchState[]; sensors: SensorState[];
  roomBrightness: number;
};
