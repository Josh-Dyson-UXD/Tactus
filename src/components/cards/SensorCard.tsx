import { Thermometer, Droplets, Wind, Activity } from "lucide-react";
import type { SensorState, TempSensor, HumidSensor, AQISensor, CO2Sensor } from "@/types";
import { withAlpha, aqiLabel, humidLabel, co2Label } from "@/lib/helpers";

export function SensorCard({ state }: { state: SensorState }) {
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
    if (data.kind === "co2") {
      const { label, color } = co2Label(data.co2);
      return (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center rounded-tactus-sm size-[36px]" style={{ background: withAlpha(color, 0.1) }}>
              <span style={{ fontSize: 12, fontWeight: 700, color }}>CO₂</span>
            </div>
            <p className="text-[14px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)" }}>{device}</p>
          </div>
          <p style={{ fontFamily: "var(--tactus-font-mono)", color, fontSize: 48, fontWeight: 600, lineHeight: 1 }}>
            {data.co2}<span style={{ fontSize: 20, color: "var(--tactus-text-muted)" }}> ppm</span>
          </p>
          <p className="mt-2 text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{label}</p>
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
