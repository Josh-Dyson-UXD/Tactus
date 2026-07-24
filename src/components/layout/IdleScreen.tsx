import { useState, useEffect } from "react";
import { motion } from "motion/react";
import type { Room, SolarState, PowerwallState, TeslaState, OutdoorState, TempSensor, HumidSensor, CO2Sensor } from "@/types";

function avg(nums: number[]) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null; }

function greetingFor(h: number) {
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

const CONDITION_LABEL: Record<string, string> = {
  "clear-night": "Clear", "cloudy": "Cloudy", "fog": "Fog", "hail": "Hail",
  "lightning": "Lightning", "lightning-rainy": "Storms", "partlycloudy": "Partly cloudy",
  "pouring": "Pouring", "rainy": "Rainy", "snowy": "Snow", "snowy-rainy": "Sleet",
  "sunny": "Sunny", "windy": "Windy", "windy-variant": "Windy", "exceptional": "Alert",
};
function conditionLabel(c: string) {
  return CONDITION_LABEL[c] ?? (c ? c.charAt(0).toUpperCase() + c.slice(1) : "—");
}

function batteryWord(s: PowerwallState["status"]) {
  return s === "charging" ? "charging" : s === "discharging" ? "discharging" : s === "backup" ? "on backup" : "holding";
}
function carWord(s: TeslaState["status"]) {
  return s === "charging" ? "charging" : s === "away" ? "away" : "parked";
}

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--tactus-font-sans)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--tactus-text-faint)",
};
const sub: React.CSSProperties = {
  fontFamily: "var(--tactus-font-sans)", fontSize: 12, fontWeight: 500, color: "var(--tactus-text-muted)",
};
const valueStyle: React.CSSProperties = {
  fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 28, lineHeight: 1,
  color: "var(--tactus-text-primary)", margin: "8px 0 7px",
};

function Column({ label, value, unit, children }: { label: string; value: string; unit?: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={eyebrow}>{label}</div>
      <div style={valueStyle}>{value}{unit && <span style={{ fontSize: 15, color: "var(--tactus-text-muted)" }}>{unit}</span>}</div>
      <div style={sub}>{children}</div>
    </div>
  );
}

export function IdleScreen({ rooms, solar, powerwall, tesla, outdoor, onWake }: {
  rooms: Room[]; solar: SolarState; powerwall: PowerwallState; tesla: TeslaState; outdoor: OutdoorState;
  onWake: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const dateStr = now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
  const night = now.getHours() >= 22 || now.getHours() < 6;

  const allSensors = rooms.flatMap((r) => r.sensors);
  const indoorTemp  = avg(allSensors.filter((s) => s.data.kind === "temp").map((s) => (s.data as TempSensor).tempC));
  const indoorHumid = avg(allSensors.filter((s) => s.data.kind === "humidity").map((s) => (s.data as HumidSensor).humidity));
  const indoorCo2   = avg(allSensors.filter((s) => s.data.kind === "co2").map((s) => (s.data as CO2Sensor).co2));

  const lightsOn = rooms.flatMap((r) => r.lights).filter((l) => l.cardState === "on").length;
  const carLocked = tesla.locked;
  const attention = !carLocked; // extend later (e.g. high CO₂, doors)
  const lockText  = carLocked ? "everything’s locked" : "car unlocked";
  const lightsText = lightsOn === 0 ? "all lights off" : `${lightsOn} light${lightsOn === 1 ? "" : "s"} on`;
  const statusText = `${greetingFor(now.getHours())} · ${lockText} · ${lightsText}`;

  const co2Elevated = indoorCo2 !== null && indoorCo2 >= 800;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}
      onPointerDown={onWake}
      style={{
        position: "fixed", inset: 0, zIndex: 50, background: "var(--tactus-bg-base)",
        filter: night ? "brightness(0.6)" : "none", transition: "filter 1.5s ease",
        cursor: "pointer",
      }}
    >
      <motion.div
        animate={{ x: [0, 6, 0, -6, 0], y: [0, 4, 0, -4, 0] }}
        transition={{ duration: 240, repeat: Infinity, ease: "easeInOut" }}
        style={{ height: "100%", display: "flex", flexDirection: "column", padding: "min(6vh,48px) min(6vw,64px)", boxSizing: "border-box" }}
      >
        <div style={{ textAlign: "center", fontFamily: "var(--tactus-font-sans)", fontSize: 14, fontWeight: 500, color: "var(--tactus-text-secondary)" }}>{dateStr}</div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: "clamp(64px, 12vw, 108px)", lineHeight: 0.9, letterSpacing: "0.01em", color: "var(--tactus-text-primary)" }}>
            {hh}:{mm}
          </div>
          <div style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 13, fontWeight: 500, color: attention ? "var(--tactus-amber)" : "var(--tactus-text-muted)" }}>
            {statusText}
          </div>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          <Column label="Indoor" value={indoorTemp !== null ? `${Math.round(indoorTemp)}°` : "—"}>
            {indoorHumid !== null ? `${Math.round(indoorHumid)}%` : "—"}
            {indoorCo2 !== null && <> · <span style={{ color: co2Elevated ? "var(--tactus-amber)" : "var(--tactus-text-muted)" }}>{Math.round(indoorCo2)} CO₂</span></>}
          </Column>

          <Column label="Outdoor" value={outdoor.tempC !== null ? `${Math.round(outdoor.tempC)}°` : "—"}>
            {conditionLabel(outdoor.condition)} · {Math.round(outdoor.humidity)}%
          </Column>

          <Column label="Solar" value={solar.generatingKw.toFixed(1)} unit=" kW">
            {solar.todayKwh.toFixed(1)} kWh today
          </Column>

          <Column label="Battery" value={`${Math.round(powerwall.pct)}`} unit="%">
            {batteryWord(powerwall.status)}
          </Column>

          <Column label="Ghost" value={`${Math.round(tesla.batteryPct)}`} unit="%">
            {Math.round(tesla.rangeKm)} km · {carWord(tesla.status)}
          </Column>
        </div>
      </motion.div>
    </motion.div>
  );
}
