import {
  Thermometer, Droplets, Sun, Moon, Cloud, CloudSun, CloudRain,
  CloudLightning, CloudSnow, CloudFog, Wind, AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Room, OutdoorState, TempSensor, HumidSensor, CO2Sensor, PM25Sensor } from "@/types";

// Indoor comfort domain for the range rail (°C). Fixed so the rail conveys
// absolute warmth/coolness, not just relative spread — a tight, cool home
// reads as a small segment low on the track.
const RAIL_MIN = 10;
const RAIL_MAX = 30;

function avg(nums: number[]) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null; }
function range(nums: number[]) { return nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : null; }
function fmtRange(r: { min: number; max: number }, dp: number) {
  return r.min.toFixed(dp) === r.max.toFixed(dp) ? r.min.toFixed(dp) : `${r.min.toFixed(dp)}–${r.max.toFixed(dp)}`;
}

const tempColor  = (t: number) => t < 18 ? "var(--tactus-blue-light)" : t > 26 ? "var(--tactus-pink)" : "var(--tactus-green)";
const humidColor = (h: number) => h < 30 ? "var(--tactus-amber)" : h > 65 ? "var(--tactus-blue)" : "var(--tactus-green)";
const co2Color   = (c: number) => c < 800 ? "var(--tactus-green)" : c < 1200 ? "var(--tactus-amber)" : "var(--tactus-pink)";
const pm25Color  = (v: number) => v <= 12 ? "var(--tactus-green)" : v <= 35 ? "var(--tactus-amber)" : "var(--tactus-pink)";

// HA weather state → friendly label + icon. Exported so other views (e.g.
// HomeView's outdoor glance) can reuse the same mapping instead of
// duplicating it.
export const CONDITION: Record<string, { label: string; Icon: LucideIcon }> = {
  "clear-night":     { label: "Clear",         Icon: Moon },
  "cloudy":          { label: "Cloudy",        Icon: Cloud },
  "fog":             { label: "Fog",           Icon: CloudFog },
  "hail":            { label: "Hail",          Icon: CloudSnow },
  "lightning":       { label: "Lightning",     Icon: CloudLightning },
  "lightning-rainy": { label: "Storms",        Icon: CloudLightning },
  "partlycloudy":    { label: "Partly cloudy", Icon: CloudSun },
  "pouring":         { label: "Pouring",       Icon: CloudRain },
  "rainy":           { label: "Rainy",         Icon: CloudRain },
  "snowy":           { label: "Snow",          Icon: CloudSnow },
  "snowy-rainy":     { label: "Sleet",         Icon: CloudSnow },
  "sunny":           { label: "Sunny",         Icon: Sun },
  "windy":           { label: "Windy",         Icon: Wind },
  "windy-variant":   { label: "Windy",         Icon: Wind },
  "exceptional":     { label: "Alert",         Icon: AlertTriangle },
};

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--tactus-font-sans)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--tactus-text-faint)",
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p style={eyebrow}>{children}</p>;
}

function Tile({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div style={{ flex: 1, background: "var(--tactus-bg-raised)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontFamily: "var(--tactus-font-mono)", color, fontSize: 16, fontWeight: 600, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 10, color: "var(--tactus-text-muted)" }}> {unit}</span>
      </div>
      <p style={{ ...eyebrow, marginTop: 6 }}>{label}</p>
    </div>
  );
}

function ConditionTile({ condition }: { condition: string }) {
  const c = CONDITION[condition] ?? { label: condition || "—", Icon: Cloud };
  const Icon = c.Icon;
  return (
    <div style={{ flex: 1, background: "var(--tactus-bg-raised)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--tactus-text-secondary)" }}>
        <Icon size={16} />
        <span style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 14, fontWeight: 600, lineHeight: 1 }}>{c.label}</span>
      </div>
      <p style={{ ...eyebrow, marginTop: 6 }}>Conditions</p>
    </div>
  );
}

function RangeRail({ coolest, warmest, avgTemp }: {
  coolest: { room: string; temp: number };
  warmest: { room: string; temp: number };
  avgTemp: number;
}) {
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - RAIL_MIN) / (RAIL_MAX - RAIL_MIN)) * 100));
  const color = tempColor(avgTemp);
  const single = coolest.temp === warmest.temp;
  const lo = pct(coolest.temp);
  const hi = pct(warmest.temp);
  const Dot = ({ left }: { left: number }) => (
    <div style={{ position: "absolute", left: `${left}%`, top: -3, width: 14, height: 14, borderRadius: "50%", background: "var(--tactus-bg-recessed)", border: `2px solid ${color}`, transform: "translateX(-50%)" }} />
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ position: "relative", height: 8, borderRadius: 9999, background: "var(--tactus-bg-raised)", margin: "4px 0 2px" }}>
        {!single && <div style={{ position: "absolute", left: `${lo}%`, right: `${100 - hi}%`, top: 0, bottom: 0, borderRadius: 9999, background: color }} />}
        <Dot left={lo} />
        {!single && <Dot left={hi} />}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--tactus-font-sans)", fontSize: 12 }}>
        <span>
          <span style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)" }}>{coolest.temp.toFixed(1)}°</span>
          <span style={{ color: "var(--tactus-text-muted)" }}> {coolest.room}</span>
        </span>
        {!single && (
          <span>
            <span style={{ color: "var(--tactus-text-muted)" }}>{warmest.room} </span>
            <span style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)" }}>{warmest.temp.toFixed(1)}°</span>
          </span>
        )}
      </div>
    </div>
  );
}

export function EnvironmentBar({ rooms, outdoor }: { rooms: Room[]; outdoor: OutdoorState }) {
  const allSensors = rooms.flatMap((r) => r.sensors);

  // One temp per room (with its name) for the rail endpoints.
  const roomTemps = rooms
    .map((r) => {
      const t = r.sensors.find((s) => s.data.kind === "temp");
      return t && t.data.kind === "temp" ? { room: r.name, temp: t.data.tempC } : null;
    })
    .filter((x): x is { room: string; temp: number } => x !== null)
    .sort((a, b) => a.temp - b.temp);

  const coolest = roomTemps[0] ?? null;
  const warmest = roomTemps.length ? roomTemps[roomTemps.length - 1] : null;
  const tempAvg = avg(roomTemps.map((t) => t.temp));

  const humidRange = range(allSensors.filter((s) => s.data.kind === "humidity").map((s) => (s.data as HumidSensor).humidity));
  const indoorCo2  = avg(allSensors.filter((s) => s.data.kind === "co2").map((s) => (s.data as CO2Sensor).co2));
  const indoorPm25 = avg(allSensors.filter((s) => s.data.kind === "pm25").map((s) => (s.data as PM25Sensor).pm25));

  return (
    <div className="rounded-tactus-xl overflow-hidden" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
      <div className="flex">

        {/* Indoor */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Eyebrow>Indoor</Eyebrow>
            {tempAvg !== null && (
              <span style={{ fontFamily: "var(--tactus-font-mono)", color: tempColor(tempAvg), fontSize: 20, fontWeight: 600 }}>
                {tempAvg.toFixed(1)}<span style={{ fontSize: 12, color: "var(--tactus-text-muted)" }}>°C avg</span>
              </span>
            )}
          </div>

          {coolest && warmest
            ? <RangeRail coolest={coolest} warmest={warmest} avgTemp={tempAvg ?? coolest.temp} />
            : <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 12, color: "var(--tactus-text-muted)" }}>No indoor sensors</p>}

          <div style={{ display: "flex", gap: 10 }}>
            {humidRange && <Tile label="Humid"  value={fmtRange(humidRange, 0)} unit="%"   color={humidColor((humidRange.min + humidRange.max) / 2)} />}
            {indoorCo2  !== null && <Tile label="CO₂"   value={indoorCo2.toFixed(0)}  unit="ppm" color={co2Color(indoorCo2)} />}
            {indoorPm25 !== null && <Tile label="PM2.5" value={indoorPm25.toFixed(0)} unit="µg"  color={pm25Color(indoorPm25)} />}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: "var(--tactus-border-subtle)", flexShrink: 0 }} />

        {/* Outdoor */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          <Eyebrow>Outdoor</Eyebrow>

          <div style={{ fontFamily: "var(--tactus-font-mono)", color: outdoor.tempC !== null ? tempColor(outdoor.tempC) : "var(--tactus-text-muted)", fontSize: 40, fontWeight: 600, lineHeight: 0.95, margin: "2px 0 4px" }}>
            {outdoor.tempC !== null ? outdoor.tempC.toFixed(1) : "—"}<span style={{ fontSize: 18, color: "var(--tactus-text-muted)" }}>°C</span>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
            <Tile label="Humid" value={outdoor.humidity.toFixed(0)} unit="%" color={humidColor(outdoor.humidity)} />
            <ConditionTile condition={outdoor.condition} />
          </div>
        </div>

      </div>
    </div>
  );
}
