import { useState, useRef, useEffect } from "react";
import { Plug, ChevronRight } from "lucide-react";
import type { Room, LightState, Color, HvacMode, TempSensor, HumidSensor, CO2Sensor, PM25Sensor } from "@/types";
import { withAlpha, co2Label, pm25Label } from "@/lib/helpers";
import { ChevronLeft } from "@/components/icons";
import { BrightnessSlider } from "@/components/controls/BrightnessSlider";
import { ClimateCard } from "@/components/cards/ClimateCard";
import { LightSheet } from "@/components/cards/LightSheet";

const COMMIT_DELAY = 400;

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--tactus-font-sans)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--tactus-text-faint)",
};

const tempColor  = (t: number) => t < 18 ? "var(--tactus-blue-light)" : t > 26 ? "var(--tactus-pink)" : "var(--tactus-green)";
const humidColor = (h: number) => h < 30 ? "var(--tactus-amber)" : h > 65 ? "var(--tactus-blue)" : "var(--tactus-green)";

function AirColumn({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "16px 8px" }}>
      <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 24, color, lineHeight: 1 }}>
        {value}<span style={{ fontSize: 12, color: "var(--tactus-text-muted)" }}>{unit}</span>
      </p>
      <p style={{ ...eyebrow, marginTop: 8 }}>{label}</p>
    </div>
  );
}

export function RoomView({ room, onBack, onUpdateRoom, onLightToggle, onLightBrightness, onLightColor, onLightColorTemp, onSwitchToggle, onClimatePower, onClimateMode, onClimateTemp, onClimateFan }: {
  room: Room; onBack: () => void; onUpdateRoom: (p: Partial<Room>) => void;
  onLightToggle: (entityId: string, on: boolean) => void;
  onLightBrightness: (entityId: string, v: number) => void;
  onLightColor: (entityId: string, c: Color) => void;
  onLightColorTemp: (entityId: string, kelvin: number) => void;
  onSwitchToggle: (entityId: string, on: boolean) => void;
  onClimatePower: (entityId: string, on: boolean) => void;
  onClimateMode: (entityId: string, mode: HvacMode) => void;
  onClimateTemp: (entityId: string, temp: number) => void;
  onClimateFan: (entityId: string, fan: string) => void;
}) {
  const { lights, switches, sensors, climate, roomBrightness, name } = room;
  const activeCount = lights.filter(l => l.cardState === "on").length + switches.filter(s => s.isOn).length;
  const totalCount  = lights.length + switches.length;

  const [openLightId, setOpenLightId] = useState<string | null>(null);
  const openLight = lights.find((l) => l.id === openLightId) ?? null;

  // Same real-service fan-out as before the restyle — each entity rides its
  // own independent pending → confirmed cycle.
  const allOn  = () => {
    lights.forEach((l) => { if (l.cardState !== "error") onLightToggle(l.id, true); });
    switches.forEach((s) => { if (s.status !== "error") onSwitchToggle(s.id, true); });
  };
  const allOff = () => {
    lights.forEach((l) => { if (l.cardState !== "error") onLightToggle(l.id, false); });
    switches.forEach((s) => { if (s.status !== "error") onSwitchToggle(s.id, false); });
  };

  // Same local-state + 400ms debounce pattern as before — without it,
  // dragging this slider would flood every light in the room with a service
  // call per pixel.
  const [localBrightness, setLocalBrightness] = useState<number | null>(null);
  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (brightnessTimer.current) clearTimeout(brightnessTimer.current); }, []);
  const displayBrightness = localBrightness ?? roomBrightness;
  const handleRoomBrightness = (v: number) => {
    setLocalBrightness(v);
    if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
    brightnessTimer.current = setTimeout(() => {
      lights.forEach((l) => { if (l.cardState === "on") onLightBrightness(l.id, v); });
      setLocalBrightness(null);
    }, COMMIT_DELAY);
  };

  const tempSensor  = sensors.find((s): s is typeof sensors[number] & { data: TempSensor } => s.data.kind === "temp");
  const humidSensor = sensors.find((s): s is typeof sensors[number] & { data: HumidSensor } => s.data.kind === "humidity");
  const co2Sensor   = sensors.find((s): s is typeof sensors[number] & { data: CO2Sensor } => s.data.kind === "co2");
  const pm25Sensor  = sensors.find((s): s is typeof sensors[number] & { data: PM25Sensor } => s.data.kind === "pm25");
  const hasAir = tempSensor || humidSensor || co2Sensor || pm25Sensor;

  return (
    <div className="min-h-screen" style={{ background: "var(--tactus-bg-base)" }}>
      <div className="p-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center justify-center size-[36px] rounded-full cursor-pointer hover:opacity-80 transition-opacity shrink-0" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
              <div className="size-[18px]"><ChevronLeft /></div>
            </button>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 13, color: "var(--tactus-text-muted)" }}>My Home /</span>
                <h1 style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 20, fontWeight: 500, color: "var(--tactus-text-primary)" }}>{name}</h1>
              </div>
              <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 13, color: "var(--tactus-text-muted)" }}>{activeCount} of {totalCount} active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={allOff} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)", fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)", fontSize: 13, fontWeight: 600 }}>All Off</button>
            <button onClick={allOn} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: withAlpha("#FFF9E5", 0.1), border: `1px solid ${withAlpha("#FFF9E5", 0.2)}`, fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-warm-white)", fontSize: 13, fontWeight: 600 }}>All On</button>
          </div>
        </div>

        {/* Room brightness — a slim bar, lights only */}
        {lights.length > 0 && (
          <div className="flex items-center gap-4 rounded-tactus-xl px-5 py-4" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
            <p style={eyebrow}>Room</p>
            <div className="flex-1"><BrightnessSlider value={displayBrightness} onChange={handleRoomBrightness} accent="var(--tactus-warm-white)" /></div>
            <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 15, color: "var(--tactus-text-primary)", minWidth: 36, textAlign: "right" }}>{displayBrightness}%</p>
          </div>
        )}

        {/* Air — full width, at the top */}
        {hasAir && (
          <div>
            <p style={{ ...eyebrow, marginBottom: 10 }}>Air</p>
            <div className="rounded-tactus-xl overflow-hidden flex divide-x" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)", borderColor: "var(--tactus-border-subtle)" }}>
              {tempSensor && <AirColumn label="Temp" value={tempSensor.data.tempC.toFixed(1)} unit="°" color={tempColor(tempSensor.data.tempC)} />}
              {humidSensor && <AirColumn label="Humidity" value={humidSensor.data.humidity.toFixed(0)} unit="%" color={humidColor(humidSensor.data.humidity)} />}
              {co2Sensor && <AirColumn label="CO₂" value={co2Sensor.data.co2.toFixed(0)} unit=" ppm" color={co2Label(co2Sensor.data.co2).color} />}
              {pm25Sensor && <AirColumn label="PM2.5" value={pm25Sensor.data.pm25.toFixed(0)} unit=" µg" color={pm25Label(pm25Sensor.data.pm25).color} />}
            </div>
          </div>
        )}

        {/* Lights & plugs (left) + Climate (right, when present) — rooms
            without climate stay single-column, since Air already covers the
            full width above. */}
        <div className={climate.length > 0 ? "grid gap-6" : "flex flex-col gap-6"} style={climate.length > 0 ? { gridTemplateColumns: "1.15fr 1fr", alignItems: "start" } : undefined}>
          {(lights.length > 0 || switches.length > 0) && (
            <div>
              <p style={{ ...eyebrow, marginBottom: 10 }}>Lights & plugs · tap a light for colour & brightness</p>
              <div className="rounded-tactus-xl overflow-hidden" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
                {lights.map((l, i) => {
                  const isOn = l.cardState === "on", isPending = l.cardState === "pending", isError = l.cardState === "error";
                  // withAlpha() needs a real hex value — swatchHex is always
                  // one (used for the toggle pill/glow); the dot itself uses
                  // a token for the true "off" grey since that's a UI
                  // colour, not a physical light colour.
                  const swatchHex = isError ? "#EF4444" : isOn || isPending ? (l.colorMode === "rgb" ? l.selectedColor.hex : "#FFF9E5") : "#475569";
                  const swatchDot = isOn || isPending || isError ? swatchHex : "var(--tactus-border-default)";
                  const isLast = i === lights.length - 1 && switches.length === 0;
                  return (
                    <div key={l.id} className="flex items-center gap-3 w-full cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ padding: "14px 20px", borderBottom: isLast ? "none" : "1px solid var(--tactus-border-subtle)" }}
                      onClick={() => setOpenLightId(l.id)}>
                      <div className="rounded-full shrink-0" style={{ width: 12, height: 12, background: swatchDot, boxShadow: isOn ? `0 0 8px 0 ${withAlpha(swatchHex, 0.5)}` : "none", animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined }} />
                      <p className="flex-1" style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 14, fontWeight: 500, color: isOn ? "var(--tactus-text-primary)" : "var(--tactus-text-secondary)" }}>{l.device}</p>
                      {isOn && <p style={{ fontFamily: "var(--tactus-font-mono)", fontSize: 12, color: "var(--tactus-text-muted)" }}>{l.brightness}%</p>}
                      {/* Sliding toggle stays independent of the row's
                          tap-to-open — stopPropagation so it fires
                          onLightToggle directly rather than also opening
                          the LightSheet. */}
                      <button onClick={(e) => { e.stopPropagation(); onLightToggle(l.id, !isOn); }} disabled={isError}
                        className="relative shrink-0 cursor-pointer disabled:cursor-default transition-colors"
                        style={{ width: 40, height: 24, borderRadius: 9999, background: isError ? withAlpha("#EF4444", 0.25) : isOn ? withAlpha(swatchHex, 0.9) : "var(--tactus-border-default)" }}>
                        <span className="absolute rounded-full" style={{
                          width: 18, height: 18, top: 3, left: isOn ? 19 : 3,
                          background: "#fff", transition: "left 0.18s ease",
                          animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined,
                        }} />
                      </button>
                      <ChevronRight size={16} color="var(--tactus-text-faint)" />
                    </div>
                  );
                })}
                {switches.map((s, i) => {
                  const isLast = i === switches.length - 1;
                  return (
                    <div key={s.id} className="flex items-center gap-3 w-full" style={{ padding: "14px 20px", borderBottom: isLast ? "none" : "1px solid var(--tactus-border-subtle)" }}>
                      <Plug size={14} color={s.isOn ? "var(--tactus-green)" : "var(--tactus-text-muted)"} />
                      <p className="flex-1" style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 14, fontWeight: 500, color: s.isOn ? "var(--tactus-text-primary)" : "var(--tactus-text-secondary)" }}>{s.device}</p>
                      <button onClick={() => onSwitchToggle(s.id, !s.isOn)} disabled={s.status === "error"}
                        className="flex items-center px-[10px] py-[4px] rounded-full cursor-pointer disabled:cursor-default"
                        style={{ background: withAlpha("#22C55E", s.isOn ? 0.13 : 0.06) }}>
                        <p className="text-[10px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: s.isOn ? "var(--tactus-green)" : "var(--tactus-text-muted)" }}>{s.status === "error" ? "ERR" : s.isOn ? "ON" : "OFF"}</p>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {climate.map((c) => (
            <ClimateCard key={c.id} state={c} embedded
              onTogglePower={(on) => onClimatePower(c.id, on)}
              onSetMode={(mode) => onClimateMode(c.id, mode)}
              onSetTemp={(t) => onClimateTemp(c.id, t)}
              onSetFan={(f) => onClimateFan(c.id, f)}
            />
          ))}
        </div>
      </div>

      {openLight && (
        <LightSheet state={openLight} room={name}
          onToggle={(on) => onLightToggle(openLight.id, on)}
          onBrightness={(v) => onLightBrightness(openLight.id, v)}
          onColor={(c) => onLightColor(openLight.id, c)}
          onColorTemp={(k) => onLightColorTemp(openLight.id, k)}
          onClose={() => setOpenLightId(null)}
        />
      )}
    </div>
  );
}
