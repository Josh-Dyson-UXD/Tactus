import { useState } from "react";
import { Plug, ChevronRight, Flame, Snowflake, Droplet, Wind, Power, ArrowLeftRight } from "lucide-react";
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

  const sortedRooms = [...rooms].sort((a, b) => Number(isRoomActive(b)) - Number(isRoomActive(a)));

  return (
    <div className="min-h-screen" style={{ background: "var(--tactus-bg-base)" }}>
      <div className="p-8 flex flex-col gap-6">
        <h1 style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 22, fontWeight: 500, color: "var(--tactus-text-primary)" }}>Devices</h1>

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
                  className="flex items-center justify-between w-full text-left cursor-pointer hover:opacity-90 transition-opacity"
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
                  const isLast = i === rows.length - 1;
                  const border = { borderBottom: isLast ? "none" : "1px solid var(--tactus-border-subtle)" };

                  if (row.kind === "climate") {
                    const c = row.data;
                    const isOff = c.mode === "off";
                    const isPending = c.status === "pending";
                    const isError = c.status === "error";
                    const accent = isError ? "var(--tactus-red)" : MODE_COLOR[c.mode];
                    const Icon = isOff ? Power : MODE_ICON[c.mode as Exclude<HvacMode, "off">];
                    return (
                      <div key={c.id} className="flex items-center gap-3 w-full cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ padding: "14px 20px", ...border }} onClick={() => setOpenClimateId(c.id)}>
                        <Icon size={14} color={isOff ? "var(--tactus-text-muted)" : accent} />
                        <p className="flex-1" style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 14, fontWeight: 500, color: isOff ? "var(--tactus-text-secondary)" : "var(--tactus-text-primary)" }}>{c.device}</p>
                        <p style={{ fontFamily: "var(--tactus-font-mono)", fontSize: 12, color: isError ? "var(--tactus-red)" : isOff ? "var(--tactus-text-muted)" : accent }}>
                          {isError ? "ERROR" : isOff ? "Off" : `${MODE_LABEL[c.mode]} ${c.targetTemp ?? "—"}°`}
                        </p>
                        <button onClick={(e) => { e.stopPropagation(); onClimatePower(c.id, isOff); }} disabled={isError}
                          className="relative shrink-0 cursor-pointer disabled:cursor-default transition-colors"
                          style={{ width: 40, height: 24, borderRadius: 9999, background: isError ? withAlpha("#EF4444", 0.25) : !isOff ? withAlpha("#F59E0B", 0.3) : "var(--tactus-border-default)" }}>
                          <span className="absolute rounded-full" style={{
                            width: 18, height: 18, top: 3, left: !isOff ? 19 : 3,
                            background: "#fff", transition: "left 0.18s ease",
                            animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined,
                          }} />
                        </button>
                        <ChevronRight size={16} color="var(--tactus-text-faint)" />
                      </div>
                    );
                  }

                  if (row.kind === "light") {
                    const l = row.data;
                    const isOn = l.cardState === "on", isPending = l.cardState === "pending", isError = l.cardState === "error";
                    const swatchHex = isError ? "#EF4444" : isOn || isPending ? (l.colorMode === "rgb" ? l.selectedColor.hex : "#FFF9E5") : "#475569";
                    const swatchDot = isOn || isPending || isError ? swatchHex : "var(--tactus-border-default)";
                    return (
                      <div key={l.id} className="flex items-center gap-3 w-full cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ padding: "14px 20px", ...border }} onClick={() => setOpenLightId(l.id)}>
                        <div className="rounded-full shrink-0" style={{ width: 12, height: 12, background: swatchDot, boxShadow: isOn ? `0 0 8px 0 ${withAlpha(swatchHex, 0.5)}` : "none", animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined }} />
                        <p className="flex-1" style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 14, fontWeight: 500, color: isOn ? "var(--tactus-text-primary)" : "var(--tactus-text-secondary)" }}>{l.device}</p>
                        {isOn && <p style={{ fontFamily: "var(--tactus-font-mono)", fontSize: 12, color: "var(--tactus-text-muted)" }}>{l.brightness}%</p>}
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
                  }

                  const s = row.data;
                  return (
                    <div key={s.id} className="flex items-center gap-3 w-full" style={{ padding: "14px 20px", ...border }}>
                      <Plug size={14} color={s.isOn ? "var(--tactus-green)" : "var(--tactus-text-muted)"} />
                      <p className="flex-1" style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 14, fontWeight: 500, color: s.isOn ? "var(--tactus-text-primary)" : "var(--tactus-text-secondary)" }}>{s.device}</p>
                      <button onClick={() => onSwitchToggle(s.id, !s.isOn)} disabled={s.status === "error"}
                        className="relative shrink-0 cursor-pointer disabled:cursor-default transition-colors"
                        style={{ width: 40, height: 24, borderRadius: 9999, background: s.status === "error" ? withAlpha("#EF4444", 0.25) : s.isOn ? withAlpha("#22C55E", 0.5) : "var(--tactus-border-default)" }}>
                        <span className="absolute rounded-full" style={{
                          width: 18, height: 18, top: 3, left: s.isOn ? 19 : 3,
                          background: "#fff", transition: "left 0.18s ease",
                          animation: s.status === "pending" ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined,
                        }} />
                      </button>
                    </div>
                  );
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
