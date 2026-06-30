import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Thermometer, Droplets, Wind, Plug, Car, BatteryCharging, Activity, Zap, ArrowUpRight, ArrowDownLeft, Minus } from "lucide-react";
import svgPaths from "@/imports/DashboardCanvas/svg-x3tut2cuat";

// ─── Types ────────────────────────────────────────────────────────────────────

const COLORS = [
  { id: "warm-white", label: "Warm White", hex: "#FFF9E5" },
  { id: "cool-white", label: "Cool White", hex: "#E2F1FF" },
  { id: "amber",      label: "Amber",      hex: "#F59E0B" },
  { id: "pink",       label: "Pink",       hex: "#FB7185" },
  { id: "blue",       label: "Blue",       hex: "#3B82F6" },
  { id: "green",      label: "Green",      hex: "#22C55E" },
];
type Color     = typeof COLORS[number];
type CardState = "off" | "on" | "error";
type Panel     = "summary" | "brightness" | "color";

type LightState = {
  id: string; device: string; type: "light";
  cardState: CardState; panel: Panel;
  brightness: number; selectedColor: Color;
};

type SwitchState = {
  id: string; device: string; type: "switch";
  isOn: boolean; wattsNow: number; todayKwh: number;
};

type MotionSensor   = { kind: "motion";  motionDetected: boolean; lastSeen: string };
type TempSensor     = { kind: "temp";    tempC: number; trend: "up" | "down" | "stable" };
type HumidSensor    = { kind: "humidity"; humidity: number };
type AQISensor      = { kind: "aqi";     aqi: number; co2: number; pm25: number };
type SensorPayload  = MotionSensor | TempSensor | HumidSensor | AQISensor;
type SensorState    = { id: string; device: string; type: "sensor"; data: SensorPayload };

type SolarState = {
  generatingKw: number; todayKwh: number;
  hourly: number[]; // 24 values
  status: "generating" | "idle";
};

type PowerwallState = {
  pct: number; flowKw: number; reservePct: number;
  status: "charging" | "discharging" | "standby" | "backup";
};

type GridState = { importKw: number; exportKw: number };

type OutdoorState = { tempC: number; humidity: number; aqi: number; pm25: number; condition: string };

type TeslaState = {
  model: string; batteryPct: number; rangeKm: number;
  status: "parked" | "charging" | "away";
  chargingKw?: number; tempC: number; climateOn: boolean; locked: boolean;
};

type Room = {
  id: string; name: string;
  lights: LightState[]; switches: SwitchState[]; sensors: SensorState[];
  roomBrightness: number; roomColor: Color;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function dominantColor(lights: LightState[]): string {
  const on = lights.filter((l) => l.cardState === "on");
  if (!on.length) return "#242936";
  const freq: Record<string, number> = {};
  on.forEach((l) => { freq[l.selectedColor.hex] = (freq[l.selectedColor.hex] ?? 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

function aqiLabel(aqi: number) {
  if (aqi <= 50)  return { label: "Good",      color: "#22C55E" };
  if (aqi <= 100) return { label: "Moderate",  color: "#F59E0B" };
  if (aqi <= 150) return { label: "Unhealthy", color: "#FB7185" };
  return               { label: "Hazardous",   color: "#EF4444" };
}

function humidLabel(h: number) {
  if (h < 30) return { label: "Dry",         color: "#F59E0B" };
  if (h < 60) return { label: "Comfortable", color: "#22C55E" };
  return              { label: "Humid",       color: "#3B82F6" };
}

// ─── Figma SVG icons ──────────────────────────────────────────────────────────

function LightbulbIcon({ stroke }: { stroke: string }) {
  return <svg className="size-full" fill="none" viewBox="0 0 20 20"><path d={svgPaths.p3b32fe40} stroke={stroke} strokeLinecap="round" strokeWidth="2" /></svg>;
}
function SunIcon({ stroke, size = 32 }: { stroke: string; size?: number }) {
  const path = size <= 16 ? svgPaths.p37a9e280 : size <= 24 ? svgPaths.p15137b00 : svgPaths.p30bad300;
  const vb   = size <= 16 ? "0 0 16 16"        : size <= 24 ? "0 0 24 24"        : "0 0 32 32";
  return <svg className="size-full" fill="none" viewBox={vb}><path d={path} stroke={stroke} strokeLinecap="round" strokeWidth="2" /></svg>;
}
function WifiOffIcon({ stroke }: { stroke: string }) {
  return <svg className="size-full" fill="none" viewBox="0 0 22 22"><g clipPath="url(#wc)"><path d={svgPaths.p1899b200} stroke={stroke} strokeLinecap="round" strokeWidth="2" /></g><defs><clipPath id="wc"><rect width="22" height="22" fill="white" /></clipPath></defs></svg>;
}
function AlertIcon({ stroke }: { stroke: string }) {
  return <svg className="size-full" fill="none" viewBox="0 0 10 16.668"><g clipPath="url(#ac)"><path d={svgPaths.p1eb93300} stroke={stroke} strokeLinecap="round" strokeWidth="2" /></g><defs><clipPath id="ac"><rect width="10" height="16.668" fill="white" /></clipPath></defs></svg>;
}
function ChevronLeft() {
  return <svg className="size-full" fill="none" viewBox="0 0 24 24"><path d="M15 18L9 12L15 6" stroke="var(--tactus-text-secondary)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>;
}

// ─── Brightness slider ────────────────────────────────────────────────────────

function BrightnessSlider({ value, onChange, accent }: { value: number; onChange: (v: number) => void; accent: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const compute  = useCallback((x: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    onChange(Math.round(Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * 100));
  }, [onChange]);

  useEffect(() => {
    const mv = (e: MouseEvent | TouchEvent) => { if (dragging.current) compute("touches" in e ? e.touches[0].clientX : e.clientX); };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", mv); window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); window.removeEventListener("touchmove", mv); window.removeEventListener("touchend", up); };
  }, [compute]);

  return (
    <div ref={trackRef} className="relative h-[12px] rounded-full w-full cursor-pointer select-none" style={{ background: "var(--tactus-bg-track)" }}
      onMouseDown={(e) => { dragging.current = true; compute(e.clientX); }}
      onTouchStart={(e) => { dragging.current = true; compute(e.touches[0].clientX); }}
      onClick={(e) => compute(e.clientX)}>
      <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${value}%`, background: accent, boxShadow: `0 0 12px 0 ${withAlpha(accent, 0.5)}` }} />
      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-[24px]" style={{ left: `${value}%` }}>
        <svg viewBox="0 0 32 32" fill="none" className="size-full drop-shadow-md">
          <circle cx="16" cy="16" r="12" fill="var(--tactus-text-primary)" /><circle cx="16" cy="16" r="11" stroke={accent} strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}

// ─── Light card ───────────────────────────────────────────────────────────────

function LightCard({ state, onChange }: { state: LightState; onChange: (p: Partial<LightState>) => void }) {
  const { cardState, panel, brightness, selectedColor, device } = state;
  const isOn = cardState === "on", isOff = cardState === "off", isError = cardState === "error";
  const accent = isError ? "#EF4444" : isOn ? selectedColor.hex : "#475569";
  const accentLight = isOn ? withAlpha(accent, 0.13) : "var(--tactus-bg-hairline)";

  return (
    <motion.div className="relative flex flex-col items-start justify-between p-[24px] rounded-tactus-3xl w-full"
      style={{ minHeight: 480, background: isOff ? "var(--tactus-bg-base)" : "var(--tactus-bg-raised)", boxShadow: isError ? `0 0 28px 0 ${withAlpha("#EF4444", 0.12)}` : isOn ? `0 20px 30px 0 ${withAlpha(accent, 0.04)}` : "none" }}
      animate={{ background: isOff ? "var(--tactus-bg-base)" : "var(--tactus-bg-raised)" }} transition={{ duration: 0.4 }}
      onClick={() => onChange({ panel: "summary" })}>
      <div aria-hidden className="absolute inset-0 rounded-tactus-3xl pointer-events-none" style={{ border: isError ? "1px solid var(--tactus-red)" : "1px solid var(--tactus-border-default)" }} />

      {/* Header */}
      <div className="flex items-center justify-between w-full shrink-0">
        <div className="flex items-center gap-[12px]">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px] shrink-0" style={{ background: accentLight }}>
            {isError
              ? <div className="size-[20px] overflow-clip relative"><div className="absolute top-[8.33%] bottom-[8.33%] left-1/4 right-1/4"><AlertIcon stroke="var(--tactus-red)" /></div></div>
              : <div className="size-[20px]"><LightbulbIcon stroke={isOff ? "var(--tactus-text-muted)" : accent} /></div>}
          </div>
          <div className="flex flex-col gap-[2px]">
            <p className="text-[18px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOff ? "var(--tactus-text-secondary)" : "var(--tactus-text-primary)" }}>{device}</p>
            {isError && <p className="text-[11px] font-bold uppercase leading-none mt-[2px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-red)" }}>UNREACHABLE</p>}
          </div>
        </div>
        <div className="flex items-center px-[10px] py-[4px] rounded-full relative shrink-0" style={{ background: accentLight }}>
          <div aria-hidden className="absolute inset-0 rounded-full pointer-events-none" style={{ border: `1px solid ${withAlpha(accent, 0.25)}` }} />
          <p className="text-[11px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOff ? "var(--tactus-text-muted)" : accent }}>{isError ? "ERROR" : isOn ? "ON" : "OFF"}</p>
        </div>
      </div>

      {/* Rocker */}
      <div className="flex items-center justify-center w-full shrink-0">
        <div className="relative flex flex-col items-center justify-center p-[8px] rounded-tactus-xl" style={{ width: 120, height: 180, background: "var(--tactus-bg-base)", border: "2px solid var(--tactus-border-default)" }}>
          <div className="flex flex-col gap-[2px] w-full flex-1 overflow-clip rounded-[18px]">
            <motion.button className="flex flex-1 flex-col items-center justify-center w-full cursor-pointer min-h-0" animate={{ background: isOn ? accent : "var(--tactus-border-default)" }} transition={{ duration: 0.25 }} whileTap={{ scale: 0.97 }}
              onClick={(e) => { e.stopPropagation(); if (!isError) onChange({ cardState: "on" }); }} disabled={isError}>
              <p className="text-[12px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOn ? "var(--tactus-bg-base)" : "var(--tactus-text-muted)" }}>ON</p>
            </motion.button>
            <motion.button className="flex flex-1 flex-col items-center justify-center w-full relative cursor-pointer min-h-0" style={{ background: "var(--tactus-border-default)" }} whileTap={{ scale: 0.97 }}
              onClick={(e) => { e.stopPropagation(); if (!isError) onChange({ cardState: "off", panel: "summary" }); }} disabled={isError}>
              {isOn && <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "var(--tactus-inset-shadow)" }} />}
              <p className="text-[12px] font-bold uppercase leading-none relative" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>OFF</p>
            </motion.button>
            {!isOn && !isError && <div className="absolute left-[12px] right-[12px] top-1/2 -translate-y-1/2 h-px opacity-35 pointer-events-none" style={{ background: "var(--tactus-border-overlay)" }} />}
            {isError && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="size-[22px]"><WifiOffIcon stroke="var(--tactus-red)" /></div></div>}
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="w-full shrink-0 pt-[16px]" style={{ height: 100 }} onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          {isError ? (
            <motion.div key="err" className="flex flex-col gap-[12px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <div className="flex flex-col gap-[6px]">
                <p className="text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-red)" }}>Device not responding</p>
                <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>Check connection and try again.</p>
              </div>
              <button onClick={() => onChange({ cardState: "on" })} className="flex items-center justify-center px-[14px] h-[36px] rounded-full cursor-pointer" style={{ background: "var(--tactus-bg-base)", border: "1px solid var(--tactus-red)" }}>
                <p className="text-[12px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-red)" }}>RETRY</p>
              </button>
            </motion.div>
          ) : isOff ? (
            <motion.div key="off" className="flex items-start justify-center w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-[40px] items-center justify-center flex-1">
                <div className="size-[32px]"><SunIcon stroke="var(--tactus-border-default)" size={32} /></div>
                <div className="size-[32px] rounded-full" style={{ background: "var(--tactus-border-default)" }} />
              </div>
            </motion.div>
          ) : panel === "summary" ? (
            <motion.div key="sum" className="flex items-center justify-center w-full h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-[40px] items-center justify-center flex-1">
                <button className="flex flex-col items-center gap-[6px] w-[72px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onChange({ panel: "brightness" })}>
                  <div className="size-[32px]"><SunIcon stroke="var(--tactus-text-secondary)" size={32} /></div>
                  <p className="text-[13px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{brightness}%</p>
                </button>
                <button className="flex flex-col items-center gap-[6px] w-[72px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onChange({ panel: "color" })}>
                  <div className="size-[32px] rounded-full" style={{ background: selectedColor.hex }} />
                  <p className="text-[13px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{selectedColor.label.split(" ")[0]}</p>
                </button>
              </div>
            </motion.div>
          ) : panel === "brightness" ? (
            <motion.div key="br" className="flex flex-col gap-[12px] w-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <button className="flex items-center justify-between w-full cursor-pointer hover:opacity-75 transition-opacity" onClick={() => onChange({ panel: "summary" })}>
                <div className="size-[16px]"><SunIcon stroke="var(--tactus-text-secondary)" size={16} /></div>
                <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)" }}>
                  <span style={{ fontSize: 24, fontWeight: 600 }}>{brightness}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}> %</span>
                </p>
                <div className="size-[24px]"><SunIcon stroke={accent} size={24} /></div>
              </button>
              <BrightnessSlider value={brightness} onChange={(v) => onChange({ brightness: v })} accent={accent} />
            </motion.div>
          ) : (
            <motion.div key="col" className="flex flex-col gap-[12px] w-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-[12px] items-center w-full">
                {COLORS.map((c) => (
                  <button key={c.id} className="relative shrink-0 size-[36px] rounded-full cursor-pointer" onClick={() => onChange({ selectedColor: c })}>
                    <svg viewBox="0 0 36 36" fill="none" className="size-full">
                      {c.id === selectedColor.id && <rect x="1" y="1" width="34" height="34" rx="17" stroke={c.hex} strokeWidth="2" />}
                      <circle cx="18" cy="18" r="14" fill={c.hex} />
                    </svg>
                  </button>
                ))}
              </div>
              <p className="text-[13px] font-normal leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{selectedColor.label}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Smart switch card ────────────────────────────────────────────────────────

function SwitchCard({ state, onChange }: { state: SwitchState; onChange: (p: Partial<SwitchState>) => void }) {
  const { isOn, device, wattsNow, todayKwh } = state;
  const accent = isOn ? "#22C55E" : "#475569";

  return (
    <div className="relative flex flex-col items-start justify-between p-[24px] rounded-tactus-2xl w-full" style={{ background: isOn ? "var(--tactus-bg-raised)" : "var(--tactus-bg-base)", border: "1px solid var(--tactus-border-default)", minHeight: 260 }}>
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: isOn ? withAlpha(accent, 0.13) : "var(--tactus-bg-hairline)" }}>
            <Plug size={18} color={isOn ? accent : "var(--tactus-text-muted)"} />
          </div>
          <p className="text-[16px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOn ? "var(--tactus-text-primary)" : "var(--tactus-text-secondary)" }}>{device}</p>
        </div>
        <div className="flex items-center px-[10px] py-[4px] rounded-full relative" style={{ background: isOn ? withAlpha(accent, 0.13) : "var(--tactus-bg-hairline)" }}>
          <div aria-hidden className="absolute inset-0 rounded-full pointer-events-none" style={{ border: `1px solid ${withAlpha(accent, 0.25)}` }} />
          <p className="text-[11px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOn ? accent : "var(--tactus-text-muted)" }}>{isOn ? "ON" : "OFF"}</p>
        </div>
      </div>

      {/* Rocker */}
      <div className="flex items-center justify-center w-full">
        <div className="relative flex flex-col items-center justify-center p-[8px] rounded-tactus-lg" style={{ width: 100, height: 140, background: "var(--tactus-bg-base)", border: "2px solid var(--tactus-border-default)" }}>
          <div className="flex flex-col gap-[2px] w-full flex-1 overflow-clip rounded-[14px]">
            <motion.button className="flex flex-1 flex-col items-center justify-center w-full cursor-pointer min-h-0" animate={{ background: isOn ? accent : "var(--tactus-border-default)" }} transition={{ duration: 0.2 }} whileTap={{ scale: 0.97 }}
              onClick={() => onChange({ isOn: true, wattsNow: state.wattsNow || 45 })}>
              <p className="text-[11px] font-bold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color: isOn ? "var(--tactus-bg-base)" : "var(--tactus-text-muted)" }}>ON</p>
            </motion.button>
            <motion.button className="flex flex-1 flex-col items-center justify-center w-full relative cursor-pointer min-h-0" style={{ background: "var(--tactus-border-default)" }} whileTap={{ scale: 0.97 }}
              onClick={() => onChange({ isOn: false, wattsNow: 0 })}>
              {isOn && <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "var(--tactus-inset-shadow)" }} />}
              <p className="text-[11px] font-bold uppercase relative" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>OFF</p>
            </motion.button>
            {!isOn && <div className="absolute left-[10px] right-[10px] top-1/2 -translate-y-1/2 h-px opacity-35" style={{ background: "var(--tactus-border-overlay)" }} />}
          </div>
        </div>
      </div>

      {/* Power stats */}
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] uppercase font-semibold tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Now</p>
          <p style={{ fontFamily: "var(--tactus-font-mono)", color: isOn ? "var(--tactus-text-primary)" : "var(--tactus-text-muted)", fontSize: 18, fontWeight: 600 }}>{isOn ? wattsNow : 0}<span style={{ fontSize: 12, color: "var(--tactus-text-muted)" }}> W</span></p>
        </div>
        <div className="flex flex-col gap-1 text-right">
          <p className="text-[11px] uppercase font-semibold tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Today</p>
          <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)", fontSize: 18, fontWeight: 600 }}>{todayKwh.toFixed(1)}<span style={{ fontSize: 12, color: "var(--tactus-text-muted)" }}> kWh</span></p>
        </div>
      </div>
    </div>
  );
}

// ─── Sensor cards ─────────────────────────────────────────────────────────────

function SensorCard({ state }: { state: SensorState }) {
  const { device, data } = state;

  const cardInner = () => {
    if (data.kind === "temp") {
      const color = data.tempC < 18 ? "#3B82F6" : data.tempC > 26 ? "#FB7185" : "#22C55E";
      return (
        <>
          <div className="flex items-center justify-between w-full mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-tactus-sm size-[36px]" style={{ background: withAlpha(color, 0.1) }}>
                <Thermometer size={16} color={color} />
              </div>
              <p className="text-[14px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)" }}>{device}</p>
            </div>
          </div>
          <p style={{ fontFamily: "var(--tactus-font-mono)", color, fontSize: 48, fontWeight: 600, lineHeight: 1 }}>
            {data.tempC.toFixed(1)}<span style={{ fontSize: 20, color: "var(--tactus-text-muted)" }}>°C</span>
          </p>
          <p className="mt-2 text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>
            {data.trend === "up" ? "↑ Rising" : data.trend === "down" ? "↓ Falling" : "→ Stable"}
          </p>
        </>
      );
    }
    if (data.kind === "humidity") {
      const { label, color } = humidLabel(data.humidity);
      return (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center rounded-tactus-sm size-[36px]" style={{ background: withAlpha(color, 0.1) }}>
              <Droplets size={16} color={color} />
            </div>
            <p className="text-[14px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)" }}>{device}</p>
          </div>
          <p style={{ fontFamily: "var(--tactus-font-mono)", color, fontSize: 48, fontWeight: 600, lineHeight: 1 }}>
            {data.humidity}<span style={{ fontSize: 20, color: "var(--tactus-text-muted)" }}>%</span>
          </p>
          <p className="mt-2 text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{label}</p>
        </>
      );
    }
    if (data.kind === "motion") {
      const color = data.motionDetected ? "#F59E0B" : "#22C55E";
      return (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center rounded-tactus-sm size-[36px]" style={{ background: withAlpha(color, 0.1) }}>
              <Activity size={16} color={color} />
            </div>
            <p className="text-[14px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)" }}>{device}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
            <p style={{ fontFamily: "var(--tactus-font-sans)", color, fontSize: 22, fontWeight: 700 }}>
              {data.motionDetected ? "Motion" : "Clear"}
            </p>
          </div>
          <p className="mt-2 text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>Last seen {data.lastSeen}</p>
        </>
      );
    }
    if (data.kind === "aqi") {
      const { label, color } = aqiLabel(data.aqi);
      return (
        <>
          <div className="flex items-center justify-between w-full mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-tactus-sm size-[36px]" style={{ background: withAlpha(color, 0.1) }}>
                <Wind size={16} color={color} />
              </div>
              <p className="text-[14px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)" }}>{device}</p>
            </div>
            <div className="px-2.5 py-1 rounded-full" style={{ background: withAlpha(color, 0.1), border: `1px solid ${withAlpha(color, 0.25)}` }}>
              <p className="text-[10px] font-bold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color }}>{label}</p>
            </div>
          </div>
          <p style={{ fontFamily: "var(--tactus-font-mono)", color, fontSize: 40, fontWeight: 600, lineHeight: 1 }}>
            {data.aqi}<span style={{ fontSize: 14, color: "var(--tactus-text-muted)" }}> AQI</span>
          </p>
          <div className="mt-3 flex gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>CO₂</p>
              <p className="text-[13px] font-semibold" style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)" }}>{data.co2} <span style={{ color: "var(--tactus-text-muted)", fontSize: 11 }}>ppm</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>PM2.5</p>
              <p className="text-[13px] font-semibold" style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)" }}>{data.pm25} <span style={{ color: "var(--tactus-text-muted)", fontSize: 11 }}>µg/m³</span></p>
            </div>
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div className="relative flex flex-col p-5 rounded-tactus-xl w-full" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)", minHeight: 180 }}>
      {cardInner()}
    </div>
  );
}

// ─── Solar card ───────────────────────────────────────────────────────────────

const SOLAR_COLOR = "#F59E0B";

function SolarCard({ solar }: { solar: SolarState }) {
  const max = Math.max(...solar.hourly, 0.1);
  const currentHour = 10; // mock current hour

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl" style={{ background: "var(--tactus-bg-raised)", border: "1px solid var(--tactus-border-default)", boxShadow: solar.status === "generating" ? `0 20px 40px 0 ${withAlpha(SOLAR_COLOR, 0.06)}` : "none" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: withAlpha(SOLAR_COLOR, 0.12) }}>
            <div className="size-[20px]"><SunIcon stroke={SOLAR_COLOR} size={24} /></div>
          </div>
          <div>
            <p className="text-[16px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>Solar</p>
            <p className="text-[12px] mt-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>Rooftop Array · 10 kW</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full" style={{ background: withAlpha(SOLAR_COLOR, 0.1), border: `1px solid ${withAlpha(SOLAR_COLOR, 0.25)}` }}>
          <p className="text-[11px] font-bold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color: SOLAR_COLOR }}>{solar.status === "generating" ? "Generating" : "Standby"}</p>
        </div>
      </div>

      {/* Big number */}
      <div className="mb-1">
        <p style={{ fontFamily: "var(--tactus-font-mono)", color: SOLAR_COLOR, fontSize: 52, fontWeight: 600, lineHeight: 1 }}>
          {solar.generatingKw.toFixed(1)}<span style={{ fontSize: 20, color: "var(--tactus-text-dim)" }}> kW</span>
        </p>
      </div>
      <p className="mb-6 text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>Today's total: <span style={{ color: "var(--tactus-text-secondary)" }}>{solar.todayKwh.toFixed(1)} kWh</span></p>

      {/* Generation chart */}
      <div className="flex items-end gap-[3px] w-full" style={{ height: 48 }}>
        {solar.hourly.map((val, i) => (
          <div key={i} className="flex-1 rounded-sm transition-all"
            style={{ height: `${(val / max) * 100}%`, minHeight: 2, background: i === currentHour ? SOLAR_COLOR : withAlpha(SOLAR_COLOR, 0.25), boxShadow: i === currentHour ? `0 0 6px ${SOLAR_COLOR}` : "none" }} />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        <p className="text-[10px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>12am</p>
        <p className="text-[10px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>12pm</p>
        <p className="text-[10px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>11pm</p>
      </div>
    </div>
  );
}

// ─── Powerwall card ───────────────────────────────────────────────────────────

function PowerwallCard({ powerwall, grid }: { powerwall: PowerwallState; grid: GridState }) {
  const isCharging    = powerwall.status === "charging";
  const isDischarging = powerwall.status === "discharging";
  const color = isCharging ? "#22C55E" : isDischarging ? "#F59E0B" : "#3B82F6";

  // SVG arc
  const r = 54, circ = 2 * Math.PI * r;
  const filled = circ * (powerwall.pct / 100);
  const gap    = circ - filled;

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl" style={{ background: "var(--tactus-bg-raised)", border: "1px solid var(--tactus-border-default)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: withAlpha(color, 0.12) }}>
            <BatteryCharging size={18} color={color} />
          </div>
          <div>
            <p className="text-[16px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>Powerwall</p>
            <p className="text-[12px] mt-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>13.5 kWh capacity</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full" style={{ background: withAlpha(color, 0.1), border: `1px solid ${withAlpha(color, 0.25)}` }}>
          <p className="text-[11px] font-bold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color }}>{powerwall.status}</p>
        </div>
      </div>

      {/* Ring + percentage */}
      <div className="flex items-center gap-6 mb-4">
        <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
          <svg viewBox="0 0 128 128" className="size-full -rotate-90">
            <circle cx="64" cy="64" r={r} fill="none" stroke="var(--tactus-bg-track)" strokeWidth="9" />
            <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${filled} ${gap}`} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p style={{ fontFamily: "var(--tactus-font-mono)", color, fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{powerwall.pct}%</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1">
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Flow</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)", fontSize: 18, fontWeight: 600 }}>
              {isCharging ? "+" : isDischarging ? "−" : ""}{powerwall.flowKw.toFixed(1)}<span style={{ fontSize: 12, color: "var(--tactus-text-muted)" }}> kW</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Backup reserve</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)", fontSize: 16, fontWeight: 600 }}>{powerwall.reservePct}%</p>
          </div>
        </div>
      </div>

      {/* Grid flow */}
      <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-2 flex-1">
          <ArrowDownLeft size={14} color="var(--tactus-green)" />
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Import</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)", fontSize: 14, fontWeight: 600 }}>{grid.importKw.toFixed(1)} kW</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <ArrowUpRight size={14} color={SOLAR_COLOR} />
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Export</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)", fontSize: 14, fontWeight: 600 }}>{grid.exportKw.toFixed(1)} kW</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tesla card ───────────────────────────────────────────────────────────────

const TESLA_COLOR = "#3B82F6";

function TeslaCard({ tesla, onChange }: { tesla: TeslaState; onChange: (p: Partial<TeslaState>) => void }) {
  const isCharging = tesla.status === "charging";
  const r = 54, circ = 2 * Math.PI * r;
  const filled = circ * (tesla.batteryPct / 100);

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl" style={{ background: "var(--tactus-bg-raised)", border: "1px solid var(--tactus-border-default)", boxShadow: `0 20px 40px 0 ${withAlpha(TESLA_COLOR, 0.04)}` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: withAlpha(TESLA_COLOR, 0.12) }}>
            <Car size={18} color={TESLA_COLOR} />
          </div>
          <div>
            <p className="text-[16px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{tesla.model}</p>
            <p className="text-[12px] mt-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{tesla.location}</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full" style={{ background: withAlpha(TESLA_COLOR, 0.1), border: `1px solid ${withAlpha(TESLA_COLOR, 0.25)}` }}>
          <p className="text-[11px] font-bold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color: TESLA_COLOR }}>{tesla.status}</p>
        </div>
      </div>

      {/* Ring + range */}
      <div className="flex items-center gap-6 mb-5">
        <div className="relative shrink-0" style={{ width: 128, height: 128 }}>
          <svg viewBox="0 0 128 128" className="size-full -rotate-90">
            <circle cx="64" cy="64" r={r} fill="none" stroke="var(--tactus-bg-track)" strokeWidth="9" />
            <circle cx="64" cy="64" r={r} fill="none" stroke={isCharging ? "var(--tactus-green)" : TESLA_COLOR} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${filled} ${circ - filled}`} style={{ filter: `drop-shadow(0 0 6px ${isCharging ? "var(--tactus-green)" : TESLA_COLOR})` }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: isCharging ? "var(--tactus-green)" : TESLA_COLOR, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{tesla.batteryPct}%</p>
            <p style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)", fontSize: 11 }}>{tesla.rangeKm} km</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1">
          {isCharging && (
            <div>
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Charging</p>
              <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-green)", fontSize: 18, fontWeight: 600 }}>{tesla.chargingKw?.toFixed(1)}<span style={{ fontSize: 12, color: "var(--tactus-text-muted)" }}> kW</span></p>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Interior</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)", fontSize: 16, fontWeight: 600 }}>{tesla.tempC}°C</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        {/* Climate */}
        <button onClick={() => onChange({ climateOn: !tesla.climateOn })}
          className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-tactus-md cursor-pointer transition-opacity hover:opacity-80"
          style={{ background: tesla.climateOn ? withAlpha("#3B82F6", 0.12) : "var(--tactus-bg-overlay)", border: `1px solid ${tesla.climateOn ? withAlpha("#3B82F6", 0.25) : "var(--tactus-border-overlay)"}` }}>
          <svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0">
            <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07l14.14-14.14" stroke={tesla.climateOn ? "var(--tactus-blue)" : "var(--tactus-text-muted)"} strokeLinecap="round" strokeWidth="1.5" />
          </svg>
          <p className="text-[12px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: tesla.climateOn ? "var(--tactus-blue)" : "var(--tactus-text-muted)" }}>Climate</p>
        </button>
        {/* Lock */}
        <button onClick={() => onChange({ locked: !tesla.locked })}
          className="flex items-center gap-2 flex-1 px-3 py-2.5 rounded-tactus-md cursor-pointer transition-opacity hover:opacity-80"
          style={{ background: "var(--tactus-bg-overlay)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <svg viewBox="0 0 24 24" fill="none" className="size-4 shrink-0">
            {tesla.locked
              ? <><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--tactus-green)" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="var(--tactus-green)" strokeLinecap="round" strokeWidth="1.5" /></>
              : <><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--tactus-text-muted)" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="var(--tactus-text-muted)" strokeLinecap="round" strokeWidth="1.5" /></>}
          </svg>
          <p className="text-[12px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: tesla.locked ? "var(--tactus-green)" : "var(--tactus-text-muted)" }}>{tesla.locked ? "Locked" : "Unlocked"}</p>
        </button>
      </div>
    </div>
  );
}

// ─── Environment bar ──────────────────────────────────────────────────────────

function avg(nums: number[]) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null; }

function EnvMetric({ icon, value, unit, label, color }: { icon: React.ReactNode; value: string; unit: string; label: string; color: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-1">
        <span style={{ color, fontSize: 22, fontFamily: "var(--tactus-font-mono)", fontWeight: 700, lineHeight: 1 }}>{value}</span>
        <span style={{ color: "var(--tactus-text-muted)", fontSize: 12, fontFamily: "var(--tactus-font-mono)", fontWeight: 600 }}>{unit}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span style={{ color: "var(--tactus-text-faint)" }}>{icon}</span>
        <span style={{ color: "var(--tactus-text-faint)", fontSize: 11, fontFamily: "var(--tactus-font-sans)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
    </div>
  );
}

function EnvironmentBar({ rooms, outdoor }: { rooms: Room[]; outdoor: OutdoorState }) {
  const allSensors = rooms.flatMap((r) => r.sensors);

  const temps  = allSensors.filter((s) => s.data.kind === "temp").map((s) => (s.data as TempSensor).tempC);
  const humids = allSensors.filter((s) => s.data.kind === "humidity").map((s) => (s.data as HumidSensor).humidity);
  const aqis   = allSensors.filter((s) => s.data.kind === "aqi").map((s) => (s.data as AQISensor).aqi);
  const co2s   = allSensors.filter((s) => s.data.kind === "aqi").map((s) => (s.data as AQISensor).co2);

  const indoorTemp  = avg(temps);
  const indoorHumid = avg(humids);
  const indoorAqi   = avg(aqis);
  const indoorCo2   = avg(co2s);

  const tempColor  = (t: number) => t < 18 ? "var(--tactus-blue-light)" : t > 26 ? "var(--tactus-pink)" : "var(--tactus-green)";
  const humidColor = (h: number) => h < 30 ? "var(--tactus-amber)" : h > 65 ? "var(--tactus-blue)" : "var(--tactus-green)";
  const aqiColor   = (a: number) => a <= 50 ? "var(--tactus-green)" : a <= 100 ? "var(--tactus-amber)" : "var(--tactus-pink)";
  const co2Color   = (c: number) => c < 800 ? "var(--tactus-green)" : c < 1200 ? "var(--tactus-amber)" : "var(--tactus-pink)";

  return (
    <div className="rounded-tactus-xl overflow-hidden" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
      <div className="flex divide-x" style={{ divideColor: "var(--tactus-border-subtle)" }}>

        {/* Indoor */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-border-subtle)" }}>Indoor</p>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            {indoorTemp  !== null && <EnvMetric icon={<Thermometer size={12} />} value={indoorTemp.toFixed(1)}   unit="°C"  label="Temp"     color={tempColor(indoorTemp)} />}
            {indoorHumid !== null && <EnvMetric icon={<Droplets    size={12} />} value={indoorHumid.toFixed(0)}  unit="%"   label="Humidity" color={humidColor(indoorHumid)} />}
            {indoorAqi   !== null && <EnvMetric icon={<Wind        size={12} />} value={indoorAqi.toFixed(0)}    unit=" AQI" label="Air"     color={aqiColor(indoorAqi)} />}
            {indoorCo2   !== null && <EnvMetric icon={<span style={{ fontSize: 10, fontWeight: 700 }}>CO₂</span>} value={indoorCo2.toFixed(0)} unit=" ppm" label="Carbon" color={co2Color(indoorCo2)} />}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: "var(--tactus-border-subtle)", flexShrink: 0 }} />

        {/* Outdoor */}
        <div className="flex-1 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-border-subtle)" }}>Outdoor</p>
            <p className="text-[11px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>{outdoor.condition}</p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <EnvMetric icon={<Thermometer size={12} />} value={outdoor.tempC.toFixed(1)}  unit="°C"   label="Temp"     color={tempColor(outdoor.tempC)} />
            <EnvMetric icon={<Droplets    size={12} />} value={outdoor.humidity.toFixed(0)} unit="%"  label="Humidity" color={humidColor(outdoor.humidity)} />
            <EnvMetric icon={<Wind        size={12} />} value={outdoor.aqi.toFixed(0)}     unit=" AQI" label="Air"     color={aqiColor(outdoor.aqi)} />
            <EnvMetric icon={<span style={{ fontSize: 10, fontWeight: 700 }}>PM</span>}    value={outdoor.pm25.toFixed(1)} unit=" µg" label="PM2.5" color={aqiColor(outdoor.aqi)} />
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>{label}</p>
      {count !== undefined && <div className="flex items-center justify-center px-2 py-0.5 rounded-full" style={{ background: "var(--tactus-bg-overlay)" }}><p className="text-[10px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{count}</p></div>}
      <div className="flex-1 h-px" style={{ background: "var(--tactus-bg-overlay)" }} />
    </div>
  );
}

// ─── Room controls ────────────────────────────────────────────────────────────

function RoomControls({ roomBrightness, roomColor, onBrightnessChange, onColorChange, label = "Room" }: {
  roomBrightness: number; roomColor: Color;
  onBrightnessChange: (v: number) => void; onColorChange: (c: Color) => void;
  label?: string;
}) {
  return (
    <div className="px-8 py-5 flex flex-col gap-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>{label}</p>
      <div className="flex items-center gap-4">
        <div className="size-[16px] shrink-0"><SunIcon stroke="var(--tactus-text-muted)" size={16} /></div>
        <div className="flex-1"><BrightnessSlider value={roomBrightness} onChange={onBrightnessChange} accent={roomColor.hex} /></div>
        <div className="size-[20px] shrink-0"><SunIcon stroke={roomColor.hex} size={24} /></div>
        <p className="w-[42px] text-right text-[13px] shrink-0" style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)", fontWeight: 600 }}>{roomBrightness}%</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-[16px] h-[16px] shrink-0 rounded-full" style={{ background: roomColor.hex }} />
        <div className="flex gap-[10px] items-center flex-1">
          {COLORS.map((c) => {
            const isActive = c.id === roomColor.id;
            return (
              <button key={c.id} onClick={() => onColorChange(c)} className="relative shrink-0 cursor-pointer transition-transform hover:scale-110" style={{ width: 28, height: 28, outline: "none" }}>
                <svg viewBox="0 0 36 36" fill="none" className="size-full">
                  {isActive && <rect x="1" y="1" width="34" height="34" rx="17" stroke={c.hex} strokeWidth="2.5" />}
                  <circle cx="18" cy="18" r={isActive ? 12 : 14} fill={c.hex} />
                </svg>
              </button>
            );
          })}
        </div>
        <p className="text-[13px] font-normal shrink-0 w-[80px] text-right" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)" }}>{roomColor.label}</p>
      </div>
    </div>
  );
}

// ─── Room card (house overview) ───────────────────────────────────────────────

function RoomCard({ room, onNavigate, onToggleAll, onBrightnessChange, onColorChange }: {
  room: Room; onNavigate: () => void; onToggleAll: (on: boolean) => void;
  onBrightnessChange: (v: number) => void; onColorChange: (c: Color) => void;
}) {
  const { name, lights, switches, sensors, roomBrightness, roomColor } = room;
  const activeLights   = lights.filter((l) => l.cardState === "on").length;
  const activeSwitches = switches.filter((s) => s.isOn).length;
  const hasError       = lights.some((l) => l.cardState === "error");
  const allOff         = activeLights === 0 && activeSwitches === 0;
  const dominant       = dominantColor(lights);
  const isAnyOn        = !allOff;
  const tempSensor     = sensors.find((s) => s.data.kind === "temp");
  const motionSensor   = sensors.find((s) => s.data.kind === "motion");

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl w-full" style={{ background: allOff ? "var(--tactus-bg-base)" : "var(--tactus-bg-raised)", border: hasError ? `1px solid ${withAlpha("#EF4444", 0.4)}` : "1px solid var(--tactus-border-default)", boxShadow: isAnyOn ? `0 16px 40px 0 ${withAlpha(dominant, 0.07)}` : "none" }}>
      {/* Top row */}
      <button className="flex items-start justify-between w-full mb-5 text-left cursor-pointer hover:opacity-90 transition-opacity" onClick={onNavigate}>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[22px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: allOff ? "var(--tactus-text-dim)" : "var(--tactus-text-primary)" }}>{name}</h2>
          <div className="flex items-center gap-3">
            {activeLights > 0 && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{activeLights} light{activeLights > 1 ? "s" : ""}</p>}
            {activeSwitches > 0 && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{activeSwitches} plug{activeSwitches > 1 ? "s" : ""}</p>}
            {allOff && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>All off</p>}
            {tempSensor && tempSensor.data.kind === "temp" && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{tempSensor.data.tempC.toFixed(1)}°C</p>}
            {motionSensor && motionSensor.data.kind === "motion" && motionSensor.data.motionDetected && (
              <div className="flex items-center gap-1"><div className="size-1.5 rounded-full" style={{ background: "var(--tactus-amber)" }} /><p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-amber)" }}>Motion</p></div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasError && <div className="flex items-center px-2.5 py-1 rounded-full" style={{ background: withAlpha("#EF4444", 0.08), border: `1px solid ${withAlpha("#EF4444", 0.2)}` }}><p className="text-[10px] font-bold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-red)" }}>Error</p></div>}
          <div role="button" onClick={(e) => { e.stopPropagation(); onToggleAll(allOff); }} className="flex items-center justify-center size-[36px] rounded-full transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background: isAnyOn ? withAlpha(dominant, 0.15) : "var(--tactus-bg-overlay)", border: isAnyOn ? `1px solid ${withAlpha(dominant, 0.3)}` : "1px solid rgba(255,255,255,0.08)" }}>
            <svg viewBox="0 0 24 24" fill="none" className="size-[16px]"><path d="M12 3v6M6.3 6.3a8 8 0 1 0 11.4 0" stroke={isAnyOn ? dominant : "var(--tactus-text-muted)"} strokeLinecap="round" strokeWidth="2" /></svg>
          </div>
        </div>
      </button>

      {/* Light dots */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {lights.map((l) => {
          const on = l.cardState === "on", err = l.cardState === "error";
          const dc = err ? "var(--tactus-red)" : on ? l.selectedColor.hex : "var(--tactus-border-subtle)";
          return <div key={l.id} className="rounded-full shrink-0" title={`${l.device}`} style={{ width: 10, height: 10, background: dc, boxShadow: on ? `0 0 8px 0 ${withAlpha(l.selectedColor.hex, 0.5)}` : "none" }} />;
        })}
        {switches.map((s) => (
          <div key={s.id} className="rounded-sm shrink-0" title={`${s.device}`} style={{ width: 10, height: 10, background: s.isOn ? "var(--tactus-green)" : "var(--tactus-border-subtle)", boxShadow: s.isOn ? `0 0 8px 0 ${withAlpha("#22C55E", 0.5)}` : "none" }} />
        ))}
      </div>

      {/* Brightness */}
      <div className="w-full mb-4">
        <BrightnessSlider value={isAnyOn ? roomBrightness : 0} onChange={(v) => { if (isAnyOn) onBrightnessChange(v); }} accent={isAnyOn ? dominant : "var(--tactus-border-default)"} />
      </div>

      {/* Color swatches + manage */}
      <div className="flex items-center gap-2 w-full">
        {COLORS.map((c) => {
          const isActive = c.id === roomColor.id && isAnyOn;
          return (
            <button key={c.id} onClick={() => { if (isAnyOn) onColorChange(c); }} disabled={!isAnyOn} className="relative shrink-0 rounded-full" style={{ width: 24, height: 24, outline: "none", opacity: isAnyOn ? 1 : 0.2, cursor: isAnyOn ? "pointer" : "default" }}>
              <svg viewBox="0 0 36 36" fill="none" className="size-full">
                {isActive && <rect x="1" y="1" width="34" height="34" rx="17" stroke={c.hex} strokeWidth="2.5" />}
                <circle cx="18" cy="18" r={isActive ? 12 : 14} fill={c.hex} />
              </svg>
            </button>
          );
        })}
        <button onClick={onNavigate} className="ml-auto flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Manage</p>
          <svg viewBox="0 0 24 24" fill="none" className="size-[12px]"><path d="M9 18L15 12L9 6" stroke="var(--tactus-text-faint)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
        </button>
      </div>
    </div>
  );
}

// ─── House view ───────────────────────────────────────────────────────────────

function HouseView({ rooms, solar, powerwall, grid, tesla, outdoor, onNavigate, onUpdateRoom, onUpdateTesla }: {
  rooms: Room[]; solar: SolarState; powerwall: PowerwallState; grid: GridState; tesla: TeslaState; outdoor: OutdoorState;
  onNavigate: (id: string) => void;
  onUpdateRoom: (id: string, p: Partial<Room>) => void;
  onUpdateTesla: (p: Partial<TeslaState>) => void;
}) {
  const [houseBrightness, setHouseBrightness] = useState(75);
  const [houseColor, setHouseColor] = useState<Color>(COLORS[0]);

  const totalActive = rooms.reduce((s, r) => s + r.lights.filter(l => l.cardState === "on").length + r.switches.filter(s => s.isOn).length, 0);
  const totalDevices = rooms.reduce((s, r) => s + r.lights.length + r.switches.length, 0);

  const setAllLights = (on: boolean) => rooms.forEach((r) => onUpdateRoom(r.id, {
    lights:   r.lights.map((l) => l.cardState === "error" ? l : { ...l, cardState: on ? "on" : "off", panel: "summary" }),
    switches: r.switches.map((s) => ({ ...s, isOn: on, wattsNow: on ? (s.wattsNow || 45) : 0 })),
  }));

  const handleHouseBrightness = (v: number) => {
    setHouseBrightness(v);
    rooms.forEach((r) => onUpdateRoom(r.id, { roomBrightness: v, lights: r.lights.map((l) => l.cardState !== "on" ? l : { ...l, brightness: v }) }));
  };
  const handleHouseColor = (c: Color) => {
    setHouseColor(c);
    rooms.forEach((r) => onUpdateRoom(r.id, { roomColor: c, lights: r.lights.map((l) => l.cardState !== "on" ? l : { ...l, selectedColor: c }) }));
  };
  const toggleRoom = (room: Room, on: boolean) => onUpdateRoom(room.id, {
    lights: room.lights.map((l) => l.cardState === "error" ? l : { ...l, cardState: on ? "on" : "off", panel: "summary" }),
    switches: room.switches.map((s) => ({ ...s, isOn: on, wattsNow: on ? s.wattsNow || 45 : 0 })),
  });
  const handleRoomBrightness = (room: Room, v: number) => onUpdateRoom(room.id, { roomBrightness: v, lights: room.lights.map((l) => l.cardState !== "on" ? l : { ...l, brightness: v }) });
  const handleRoomColor = (room: Room, c: Color) => onUpdateRoom(room.id, { roomColor: c, lights: room.lights.map((l) => l.cardState !== "on" ? l : { ...l, selectedColor: c }) });

  return (
    <div className="min-h-screen" style={{ background: "var(--tactus-bg-base)" }}>
      <div className="sticky top-0 z-10" style={{ background: "var(--tactus-bg-blur)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>My Home</h1>
            <p className="text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{totalActive} of {totalDevices} devices active</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setAllLights(false)} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: "var(--tactus-bg-overlay)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)", fontSize: 13, fontWeight: 600 }}>All Off</button>
            <button onClick={() => setAllLights(true)} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: withAlpha("#FFF9E5", 0.1), border: `1px solid ${withAlpha("#FFF9E5", 0.2)}`, fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-warm-white)", fontSize: 13, fontWeight: 600 }}>All On</button>
          </div>
        </div>
        <RoomControls roomBrightness={houseBrightness} roomColor={houseColor} onBrightnessChange={handleHouseBrightness} onColorChange={handleHouseColor} label="All Lights" />
      </div>

      <div className="p-8 flex flex-col gap-10">
        {/* Environment bar */}
        <EnvironmentBar rooms={rooms} outdoor={outdoor} />

        {/* Energy section */}
        <div>
          <SectionHeading label="Energy" />
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            <SolarCard solar={solar} />
            <PowerwallCard powerwall={powerwall} grid={grid} />
            <TeslaCard tesla={tesla} onChange={onUpdateTesla} />
          </div>
        </div>

        {/* Rooms section */}
        <div>
          <SectionHeading label="Rooms" count={rooms.length} />
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room}
                onNavigate={() => onNavigate(room.id)}
                onToggleAll={(on) => toggleRoom(room, on)}
                onBrightnessChange={(v) => handleRoomBrightness(room, v)}
                onColorChange={(c) => handleRoomColor(room, c)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Room view ────────────────────────────────────────────────────────────────

function RoomView({ room, onBack, onUpdateRoom }: { room: Room; onBack: () => void; onUpdateRoom: (p: Partial<Room>) => void }) {
  const { lights, switches, sensors, roomBrightness, roomColor, name } = room;
  const activeCount = lights.filter(l => l.cardState === "on").length + switches.filter(s => s.isOn).length;
  const totalCount  = lights.length + switches.length;

  const updateLight  = (id: string, p: Partial<LightState>)  => onUpdateRoom({ lights:   lights.map((l) => l.id === id ? { ...l, ...p } : l) });
  const updateSwitch = (id: string, p: Partial<SwitchState>) => onUpdateRoom({ switches: switches.map((s) => s.id === id ? { ...s, ...p } : s) });

  const allOn  = () => onUpdateRoom({ lights: lights.map((l) => l.cardState === "error" ? l : { ...l, cardState: "on",  panel: "summary" }), switches: switches.map((s) => ({ ...s, isOn: true,  wattsNow: s.wattsNow || 45 })) });
  const allOff = () => onUpdateRoom({ lights: lights.map((l) => l.cardState === "error" ? l : { ...l, cardState: "off", panel: "summary" }), switches: switches.map((s) => ({ ...s, isOn: false, wattsNow: 0 })) });

  const handleRoomBrightness = (v: number) => onUpdateRoom({ roomBrightness: v, lights: lights.map((l) => l.cardState !== "on" ? l : { ...l, brightness: v }) });
  const handleRoomColor = (c: Color) => onUpdateRoom({ roomColor: c, lights: lights.map((l) => l.cardState !== "on" ? l : { ...l, selectedColor: c }) });

  return (
    <div className="min-h-screen" style={{ background: "var(--tactus-bg-base)" }}>
      <div className="sticky top-0 z-10" style={{ background: "var(--tactus-bg-blur)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center justify-center size-[36px] rounded-full cursor-pointer hover:opacity-80 transition-opacity shrink-0" style={{ background: "var(--tactus-bg-overlay)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="size-[18px]"><ChevronLeft /></div>
            </button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>My Home</span>
                <span style={{ color: "var(--tactus-text-faint)" }}>/</span>
                <h1 className="text-[18px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{name}</h1>
              </div>
              <p className="text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{activeCount} of {totalCount} devices active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={allOff} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: "var(--tactus-bg-overlay)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)", fontSize: 13, fontWeight: 600 }}>All Off</button>
            <button onClick={allOn} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: withAlpha("#FFF9E5", 0.1), border: `1px solid ${withAlpha("#FFF9E5", 0.2)}`, fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-warm-white)", fontSize: 13, fontWeight: 600 }}>All On</button>
          </div>
        </div>
        {lights.length > 0 && <RoomControls roomBrightness={roomBrightness} roomColor={roomColor} onBrightnessChange={handleRoomBrightness} onColorChange={handleRoomColor} />}
      </div>

      <div className="p-8 flex flex-col gap-10">
        {lights.length > 0 && (
          <div>
            <SectionHeading label="Lights" count={lights.length} />
            <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", alignItems: "start" }}>
              {lights.map((l) => <LightCard key={l.id} state={l} onChange={(p) => updateLight(l.id, p)} />)}
            </div>
          </div>
        )}
        {switches.length > 0 && (
          <div>
            <SectionHeading label="Smart Plugs" count={switches.length} />
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", alignItems: "start" }}>
              {switches.map((s) => <SwitchCard key={s.id} state={s} onChange={(p) => updateSwitch(s.id, p)} />)}
            </div>
          </div>
        )}
        {sensors.length > 0 && (
          <div>
            <SectionHeading label="Sensors" count={sensors.length} />
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", alignItems: "start" }}>
              {sensors.map((s) => <SensorCard key={s.id} state={s} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Initial data ─────────────────────────────────────────────────────────────

const INITIAL_OUTDOOR: OutdoorState = { tempC: 16.2, humidity: 68, aqi: 8, pm25: 2.1, condition: "Partly cloudy" };

const INITIAL_SOLAR: SolarState = {
  generatingKw: 4.2, todayKwh: 28.6, status: "generating",
  hourly: [0,0,0,0,0,0.1,0.4,1.1,2.2,3.4,4.2,4.8,4.9,4.5,3.9,3.1,2.1,1.1,0.3,0,0,0,0,0],
};
const INITIAL_POWERWALL: PowerwallState = { pct: 78, flowKw: 1.4, reservePct: 20, status: "charging" };
const INITIAL_GRID: GridState = { importKw: 0, exportKw: 1.1 };
const INITIAL_TESLA: TeslaState = { model: "Model Y", batteryPct: 68, rangeKm: 285, status: "parked", tempC: 22, climateOn: false, locked: true, location: "Parked at home" };

const INITIAL_ROOMS: Room[] = [
  {
    id: "living-room", name: "Living Room", roomBrightness: 75, roomColor: COLORS[0],
    lights: [
      { id: "lr-ceiling",   device: "Ceiling Lamp",    type: "light", cardState: "on",    panel: "summary", brightness: 75, selectedColor: COLORS[0] },
      { id: "lr-floor",     device: "Floor Lamp",      type: "light", cardState: "off",   panel: "summary", brightness: 50, selectedColor: COLORS[0] },
      { id: "lr-table",     device: "Table Lamp",      type: "light", cardState: "on",    panel: "summary", brightness: 60, selectedColor: COLORS[2] },
      { id: "lr-tv",        device: "TV Backlight",    type: "light", cardState: "on",    panel: "summary", brightness: 40, selectedColor: COLORS[4] },
      { id: "lr-bookshelf", device: "Bookshelf Light", type: "light", cardState: "on",    panel: "summary", brightness: 85, selectedColor: COLORS[5] },
      { id: "lr-entry",     device: "Entry Spot",      type: "light", cardState: "error", panel: "summary", brightness: 70, selectedColor: COLORS[0] },
    ],
    switches: [
      { id: "lr-tv-plug", device: "Television", type: "switch", isOn: true,  wattsNow: 145, todayKwh: 2.3 },
      { id: "lr-console", device: "Game Console", type: "switch", isOn: false, wattsNow: 0,   todayKwh: 1.1 },
    ],
    sensors: [
      { id: "lr-temp",   device: "Temperature",  type: "sensor", data: { kind: "temp",     tempC: 22.5, trend: "stable" } },
      { id: "lr-humid",  device: "Humidity",     type: "sensor", data: { kind: "humidity",  humidity: 48 } },
      { id: "lr-motion", device: "Motion",       type: "sensor", data: { kind: "motion",    motionDetected: true,  lastSeen: "just now" } },
      { id: "lr-aqi",    device: "Air Quality",  type: "sensor", data: { kind: "aqi",       aqi: 12, co2: 650, pm25: 3.2 } },
    ],
  },
  {
    id: "bedroom", name: "Bedroom", roomBrightness: 28, roomColor: COLORS[0],
    lights: [
      { id: "bd-ceiling", device: "Ceiling Light",  type: "light", cardState: "off", panel: "summary", brightness: 80, selectedColor: COLORS[0] },
      { id: "bd-left",    device: "Bedside Left",   type: "light", cardState: "on",  panel: "summary", brightness: 30, selectedColor: COLORS[0] },
      { id: "bd-right",   device: "Bedside Right",  type: "light", cardState: "on",  panel: "summary", brightness: 25, selectedColor: COLORS[0] },
    ],
    switches: [],
    sensors: [
      { id: "bd-temp",   device: "Temperature", type: "sensor", data: { kind: "temp",     tempC: 19.2, trend: "down" } },
      { id: "bd-humid",  device: "Humidity",    type: "sensor", data: { kind: "humidity",  humidity: 52 } },
      { id: "bd-motion", device: "Motion",      type: "sensor", data: { kind: "motion",    motionDetected: false, lastSeen: "6 hrs ago" } },
    ],
  },
  {
    id: "kitchen", name: "Kitchen", roomBrightness: 87, roomColor: COLORS[1],
    lights: [
      { id: "kt-ceiling", device: "Ceiling Light",  type: "light", cardState: "on",  panel: "summary", brightness: 100, selectedColor: COLORS[1] },
      { id: "kt-counter", device: "Counter Strips", type: "light", cardState: "on",  panel: "summary", brightness: 70,  selectedColor: COLORS[1] },
      { id: "kt-island",  device: "Island Light",   type: "light", cardState: "on",  panel: "summary", brightness: 90,  selectedColor: COLORS[0] },
      { id: "kt-cabinet", device: "Cabinet Light",  type: "light", cardState: "off", panel: "summary", brightness: 50,  selectedColor: COLORS[1] },
    ],
    switches: [
      { id: "kt-dishwasher",   device: "Dishwasher",   type: "switch", isOn: true,  wattsNow: 1200, todayKwh: 1.8 },
      { id: "kt-coffee",       device: "Coffee Maker", type: "switch", isOn: false, wattsNow: 0,    todayKwh: 0.3 },
    ],
    sensors: [
      { id: "kt-temp",   device: "Temperature", type: "sensor", data: { kind: "temp",    tempC: 24.1, trend: "up" } },
      { id: "kt-motion", device: "Motion",      type: "sensor", data: { kind: "motion",  motionDetected: true,  lastSeen: "1 min ago" } },
      { id: "kt-aqi",    device: "Air Quality", type: "sensor", data: { kind: "aqi",     aqi: 38, co2: 820, pm25: 6.1 } },
    ],
  },
  {
    id: "office", name: "Office", roomBrightness: 65, roomColor: COLORS[1],
    lights: [
      { id: "of-ceiling", device: "Ceiling Light", type: "light", cardState: "off", panel: "summary", brightness: 80, selectedColor: COLORS[1] },
      { id: "of-desk",    device: "Desk Lamp",     type: "light", cardState: "on",  panel: "summary", brightness: 85, selectedColor: COLORS[1] },
      { id: "of-shelf",   device: "Shelf Light",   type: "light", cardState: "on",  panel: "summary", brightness: 45, selectedColor: COLORS[2] },
    ],
    switches: [
      { id: "of-pc",      device: "Desktop PC", type: "switch", isOn: true,  wattsNow: 180, todayKwh: 3.2 },
      { id: "of-monitor", device: "Monitor",    type: "switch", isOn: true,  wattsNow: 45,  todayKwh: 0.8 },
    ],
    sensors: [
      { id: "of-temp",   device: "Temperature", type: "sensor", data: { kind: "temp",    tempC: 21.8, trend: "stable" } },
      { id: "of-motion", device: "Motion",      type: "sensor", data: { kind: "motion",  motionDetected: true,  lastSeen: "just now" } },
      { id: "of-aqi",    device: "Air Quality", type: "sensor", data: { kind: "aqi",     aqi: 22, co2: 780, pm25: 4.5 } },
    ],
  },
  {
    id: "hallway", name: "Hallway", roomBrightness: 50, roomColor: COLORS[0],
    lights: [
      { id: "hl-entrance", device: "Entrance Light", type: "light", cardState: "off", panel: "summary", brightness: 60, selectedColor: COLORS[0] },
      { id: "hl-stairs",   device: "Stair Light",    type: "light", cardState: "off", panel: "summary", brightness: 40, selectedColor: COLORS[0] },
    ],
    switches: [],
    sensors: [
      { id: "hl-motion", device: "Motion", type: "sensor", data: { kind: "motion", motionDetected: false, lastSeen: "22 min ago" } },
    ],
  },
  {
    id: "bathroom", name: "Bathroom", roomBrightness: 90, roomColor: COLORS[1],
    lights: [
      { id: "bt-ceiling", device: "Ceiling Light", type: "light", cardState: "on", panel: "summary", brightness: 100, selectedColor: COLORS[1] },
      { id: "bt-mirror",  device: "Mirror Light",  type: "light", cardState: "on", panel: "summary", brightness: 80,  selectedColor: COLORS[1] },
    ],
    switches: [],
    sensors: [
      { id: "bt-temp",  device: "Temperature", type: "sensor", data: { kind: "temp",     tempC: 23.4, trend: "stable" } },
      { id: "bt-humid", device: "Humidity",    type: "sensor", data: { kind: "humidity",  humidity: 72 } },
    ],
  },
];

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [rooms, setRooms]           = useState<Room[]>(INITIAL_ROOMS);
  const [solar]                     = useState<SolarState>(INITIAL_SOLAR);
  const [powerwall]                 = useState<PowerwallState>(INITIAL_POWERWALL);
  const [grid]                      = useState<GridState>(INITIAL_GRID);
  const [tesla, setTesla]           = useState<TeslaState>(INITIAL_TESLA);
  const [outdoor]                   = useState<OutdoorState>(INITIAL_OUTDOOR);
  const [selectedRoomId, setRoomId] = useState<string | null>(null);

  const updateRoom  = useCallback((id: string, p: Partial<Room>) => setRooms((prev) => prev.map((r) => r.id === id ? { ...r, ...p } : r)), []);
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) ?? null;

  return (
    <AnimatePresence mode="wait">
      {selectedRoom ? (
        <motion.div key={selectedRoom.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
          <RoomView room={selectedRoom} onBack={() => setRoomId(null)} onUpdateRoom={(p) => updateRoom(selectedRoom.id, p)} />
        </motion.div>
      ) : (
        <motion.div key="house" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
          <HouseView rooms={rooms} solar={solar} powerwall={powerwall} grid={grid} tesla={tesla} outdoor={outdoor}
            onNavigate={setRoomId} onUpdateRoom={updateRoom} onUpdateTesla={(p) => setTesla((t) => ({ ...t, ...p }))} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
