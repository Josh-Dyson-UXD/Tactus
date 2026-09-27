import { DeviceRow } from "@/components/controls/DeviceRow";
import { compareRooms } from "@/lib/room-order";
import { useState } from "react";
import { Plug, Lightbulb, Flame, Snowflake, Droplet, Wind, Power, ArrowLeftRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Room, LightState, SwitchState, ClimateState, Color, HvacMode, TempSensor, HumidSensor, CO2Sensor, PM25Sensor } from "@/types";
import { withAlpha, co2Label } from "@/lib/helpers";
import { LightSheet } from "@/components/cards/LightSheet";
import { ClimateSheet } from "@/components/cards/ClimateSheet";

const round = (n: number) => Math.round(n);
const CO2_ELEVATED = 800; // matches EnvironmentBar/HomeView's co2Color amber threshold

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--tactus-font-sans)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--tactus-text-faint)",
};

const MODE_COLOR: Record<HvacMode, string> = {
  heat: "var(--tactus-amber)",
  cool: "var(--tactus-blue)",
  dry: "var(--tactus-blue-light)",
  fan_only: "var(--tactus-text-secondary)",
  heat_cool: "var(--tactus-green)",
  off: "var(--tactus-text-muted)",
};
const MODE_ICON: Record<Exclude<HvacMode, "off">, LucideIcon> = {
  heat: Flame, cool: Snowflake, dry: Droplet, fan_only: Wind, heat_cool: ArrowLeftRight,
};
const MODE_LABEL: Record<HvacMode, string> = {
  heat: "Heat", cool: "Cool", dry: "Dry", fan_only: "Fan", heat_cool: "Auto", off: "Off",
};

// A room counts as "active" — sorted first — if anything in it is actually
// drawing power/attention right now: a light or switch on, or climate
// running (anything other than its own "off" mode).
function isRoomActive(room: Room): boolean {
  return room.lights.some((l) => l.cardState === "on")
    || room.switches.some((s) => s.isOn)
    || room.climate.some((c) => c.mode !== "off");
}

type DeviceRow =
  | { kind: "climate"; data: ClimateState }
  | { kind: "light"; data: LightState }
  | { kind: "switch"; data: SwitchState };

// The Devices board (redesign Phase 3) — every device grouped into per-room
// blocks, directly controllable without leaving the tab. Reuses the Phase 2
// LightSheet and ClimateCard (via the new ClimateSheet wrapper) rather than
// forking their controls; the compact row markup itself is replicated from
// RoomView's light/switch rows since it's presentational only.
export function DevicesView({ rooms, onNavigateRoom, onLightToggle, onLightBrightness, onLightColor, onLightColorTemp, onSwitchToggle, onClimatePower, onClimateMode, onClimateTemp, onClimateFan }: {
  rooms: Room[];
  onNavigateRoom: (roomId: string) => void;
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
  const [openLightId, setOpenLightId] = useState<string | null>(null);
  const [openClimateId, setOpenClimateId] = useState<string | null>(null);

  let openLight: LightState | null = null;
  let openLightRoom = "";
  let openClimate: ClimateState | null = null;
  for (const room of rooms) {
    if (!openLight && openLightId) {
      const l = room.lights.find((l) => l.id === openLightId);
      if (l) { openLight = l; openLightRoom = room.name; }
    }
    if (!openClimate && openClimateId) {
      const c = room.climate.find((c) => c.id === openClimateId);
      if (c) openClimate = c;
    }
  }

  const sortedRooms = [...rooms].sort(compareRooms);

  return (
    <div className="min-h-screen" style={{ background: "var(--tactus-bg-base)" }}>
      <div className="tactus-page p-8 flex flex-col gap-6">
        <h1 style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 22, fontWeight: 500, color: "var(--tactus-text-primary)" }}><span className="tactus-desktop-only">Devices</span><span className="tactus-mobile-only">Rooms</span></h1>

        <div className="flex flex-col gap-5">
          {sortedRooms.map((room) => {
            const active = isRoomActive(room);
            const rows: DeviceRow[] = [
              ...room.climate.map((data): DeviceRow => ({ kind: "climate", data })),
              ...room.lights.map((data): DeviceRow => ({ kind: "light", data })),
              ...room.switches.map((data): DeviceRow => ({ kind: "switch", data })),
            ];

            const tempSensor  = room.sensors.find((s): s is typeof room.sensors[number] & { data: TempSensor } => s.data.kind === "temp");
            const humidSensor = room.sensors.find((s): s is typeof room.sensors[number] & { data: HumidSensor } => s.data.kind === "humidity");
            const co2Sensor   = room.sensors.find((s): s is typeof room.sensors[number] & { data: CO2Sensor } => s.data.kind === "co2");
            const pm25Sensor  = room.sensors.find((s): s is typeof room.sensors[number] & { data: PM25Sensor } => s.data.kind === "pm25");

            const airParts: { text: string; color: string }[] = [];
            if (tempSensor) airParts.push({ text: `${round(tempSensor.data.tempC)}°`, color: "var(--tactus-text-muted)" });
            if (humidSensor) airParts.push({ text: `${round(humidSensor.data.humidity)}%`, color: "var(--tactus-text-muted)" });
            if (co2Sensor) {
              const elevated = co2Sensor.data.co2 >= CO2_ELEVATED;
              airParts.push({ text: `CO₂ ${round(co2Sensor.data.co2)}`, color: elevated ? co2Label(co2Sensor.data.co2).color : "var(--tactus-text-muted)" });
            }
            if (pm25Sensor) airParts.push({ text: `PM2.5 ${round(pm25Sensor.data.pm25)}`, color: "var(--tactus-text-muted)" });

            return (
              <div key={room.id} className="rounded-tactus-xl overflow-hidden" style={{ background: "var(--tactus-bg-recessed)", border: "1px solid var(--tactus-border-subtle)" }}>
                <button onClick={() => onNavigateRoom(room.id)}
                  className="tactus-device-room-header flex items-center justify-between w-full text-left cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ padding: "14px 20px", borderBottom: rows.length > 0 ? "1px solid var(--tactus-border-subtle)" : "none" }}>
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: active ? "var(--tactus-amber)" : "var(--tactus-border-default)",
                      boxShadow: active ? `0 0 8px 0 ${withAlpha("#F59E0B", 0.5)}` : "none",
                    }} />
                    <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 15, fontWeight: 600, color: "var(--tactus-text-primary)" }}>{room.name}</p>
                  </div>
                  {airParts.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {airParts.map((p, idx) => (
                        <span key={idx} style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 12, color: p.color }}>
                          {p.text}{idx < airParts.length - 1 ? " ·" : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </button>

                {rows.map((row, i) => {
                  const last = i === rows.length - 1;
                  if (row.kind === "climate") {
                    const c = row.data;
                    const on = c.mode !== "off";
                    const Icon = on ? MODE_ICON[c.mode as Exclude<HvacMode, "off">] : Power;
                    return <DeviceRow key={c.id} name={c.device} detail={on ? `${MODE_LABEL[c.mode]} · ${c.targetTemp ?? "—"}°` : "Off"}
                      icon={<Icon size={18} color={MODE_COLOR[c.mode]} />} on={on} pending={c.status === "pending"} unavailable={c.status === "error"}
                      last={last} onOpen={() => setOpenClimateId(c.id)} onToggle={() => onClimatePower(c.id, !on)} />;
                  }
                  if (row.kind === "light") {
                    const l = row.data;
                    const on = l.cardState === "on";
                    return <DeviceRow key={l.id} name={l.device} detail={on ? `${l.brightness}% brightness` : "Off"}
                      icon={<Lightbulb size={18} color={on ? "var(--tactus-amber)" : "var(--tactus-text-secondary)"} />}
                      on={on} pending={l.cardState === "pending"} unavailable={l.cardState === "error"}
                      last={last} onOpen={() => setOpenLightId(l.id)} onToggle={() => onLightToggle(l.id, !on)} />;
                  }
                  const s = row.data;
                  return <DeviceRow key={s.id} name={s.device} detail={s.isOn ? "On" : "Off"}
                    icon={<Plug size={18} color={s.isOn ? "var(--tactus-amber)" : "var(--tactus-text-secondary)"} />}
                    on={s.isOn} pending={s.status === "pending"} unavailable={s.status === "error"}
                    last={last} onToggle={() => onSwitchToggle(s.id, !s.isOn)} />;
                })}
              </div>
            );
          })}
        </div>
      </div>

      {openLight && (
        <LightSheet state={openLight} room={openLightRoom}
          onToggle={(on) => onLightToggle(openLight!.id, on)}
          onBrightness={(v) => onLightBrightness(openLight!.id, v)}
          onColor={(c) => onLightColor(openLight!.id, c)}
          onColorTemp={(k) => onLightColorTemp(openLight!.id, k)}
          onClose={() => setOpenLightId(null)}
        />
      )}

      {openClimate && (
        <ClimateSheet state={openClimate}
          onTogglePower={(on) => onClimatePower(openClimate!.id, on)}
          onSetMode={(mode) => onClimateMode(openClimate!.id, mode)}
          onSetTemp={(t) => onClimateTemp(openClimate!.id, t)}
          onSetFan={(f) => onClimateFan(openClimate!.id, f)}
          onClose={() => setOpenClimateId(null)}
        />
      )}
    </div>
  );
}
