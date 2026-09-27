import { DeviceRow } from "@/components/controls/DeviceRow";
import { useState, useRef, useEffect } from "react";
import { Plug, Lightbulb } from "lucide-react";
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
      <div className="tactus-page p-8 flex flex-col gap-8">
        {/* Header */}
        <div className="tactus-room-header flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button aria-label="Back to home" onClick={onBack} className="flex items-center justify-center size-[36px] rounded-full cursor-pointer hover:opacity-80 transition-opacity shrink-0" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
              <div className="size-[18px]"><ChevronLeft /></div>
            </button>
            <div className="flex flex-col gap-1">
              <div className="tactus-room-title-line flex items-center gap-2">
                <span style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 13, color: "var(--tactus-text-muted)" }}>My Home</span>
                <h1 style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 20, fontWeight: 500, color: "var(--tactus-text-primary)" }}>{name}</h1>
              </div>
              <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 13, color: "var(--tactus-text-muted)" }}>{totalCount > 0 ? `${activeCount} of ${totalCount} active` : sensors.length > 0 ? "Environment" : "Room overview"}</p>
            </div>
          </div>
          {totalCount > 0 && <div className="tactus-room-bulk flex items-center gap-3">
            <button onClick={allOff} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)", fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)", fontSize: 13, fontWeight: 600 }}>All Off</button>
            <button onClick={allOn} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: withAlpha("#FFF9E5", 0.1), border: `1px solid ${withAlpha("#FFF9E5", 0.2)}`, fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-warm-white)", fontSize: 13, fontWeight: 600 }}>All On</button>
          </div>}
        </div>

        {totalCount === 0 && climate.length === 0 && sensors.length === 0 && (
          <p className="rounded-tactus-xl px-5 py-4" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)", fontFamily: "var(--tactus-font-sans)", fontSize: 14, color: "var(--tactus-text-muted)" }}>
            No device readings available right now.
          </p>
        )}

        {/* Room brightness — a slim bar, lights only */}
        {lights.length > 0 && (
          <div className="flex items-center gap-4 rounded-tactus-xl px-5 py-4" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
            <p style={eyebrow}>Brightness</p>
            <div className="flex-1"><BrightnessSlider value={displayBrightness} onChange={handleRoomBrightness} accent="var(--tactus-warm-white)" /></div>
            <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 15, color: "var(--tactus-text-primary)", minWidth: 36, textAlign: "right" }}>{displayBrightness}%</p>
          </div>
        )}

        {/* Air — full width, at the top */}
        {hasAir && (
          <div>
            <p style={{ ...eyebrow, marginBottom: 10 }}>Air</p>
            <div className="tactus-air-grid rounded-tactus-xl overflow-hidden flex divide-x" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)", borderColor: "var(--tactus-border-subtle)" }}>
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
        <div className={climate.length > 0 ? "tactus-room-columns grid gap-6" : "flex flex-col gap-6"} style={climate.length > 0 ? { gridTemplateColumns: "1.15fr 1fr", alignItems: "start" } : undefined}>
          {(lights.length > 0 || switches.length > 0) && (
            <div>
              <p style={{ ...eyebrow, marginBottom: 10 }}>Lights & plugs</p>
              <div className="rounded-tactus-xl overflow-hidden" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
                {lights.map((l, i) => (
                  <DeviceRow key={l.id} name={l.device} detail={l.cardState === "on" ? `${l.brightness}% brightness` : "Off"}
                    icon={<Lightbulb size={18} color={l.cardState === "on" ? "var(--tactus-amber)" : "var(--tactus-text-secondary)"} />}
                    on={l.cardState === "on"} pending={l.cardState === "pending"} unavailable={l.cardState === "error"}
                    last={i === lights.length - 1 && switches.length === 0}
                    onOpen={() => setOpenLightId(l.id)} onToggle={() => onLightToggle(l.id, l.cardState !== "on")} />
                ))}
                {switches.map((s, i) => (
                  <DeviceRow key={s.id} name={s.device} detail={s.isOn ? "On" : "Off"}
                    icon={<Plug size={18} color={s.isOn ? "var(--tactus-amber)" : "var(--tactus-text-secondary)"} />}
                    on={s.isOn} pending={s.status === "pending"} unavailable={s.status === "error"}
                    last={i === switches.length - 1} onToggle={() => onSwitchToggle(s.id, !s.isOn)} />
                ))}
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
