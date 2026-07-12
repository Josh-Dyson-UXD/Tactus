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

export type TeslaState = {
  model: string; batteryPct: number; rangeKm: number;
  status: "parked" | "charging" | "away";
  chargingKw?: number; tempC: number; climateOn: boolean; locked: boolean;
  location?: string;
};

// ─── Room ─────────────────────────────────────────────────────────────────────

export type Room = {
  id: string; name: string;
  lights: LightState[]; switches: SwitchState[]; sensors: SensorState[];
  roomBrightness: number;
};
