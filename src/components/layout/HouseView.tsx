import { useState } from "react";
import { COLORS } from "@/types";
import type { Room, SolarState, PowerwallState, GridState, TeslaState, OutdoorState, Color } from "@/types";
import { withAlpha } from "@/lib/helpers";
import { RoomControls } from "@/components/controls/RoomControls";
import { EnvironmentBar } from "@/components/layout/EnvironmentBar";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { SolarCard } from "@/components/cards/SolarCard";
import { PowerwallCard } from "@/components/cards/PowerwallCard";
import { TeslaCard } from "@/components/cards/TeslaCard";
import { RoomCard } from "@/components/cards/RoomCard";

type ControlStatus = "idle" | "pending" | "error";

export function HouseView({ rooms, solar, powerwall, grid, tesla, outdoor, onNavigate, onUpdateRoom, teslaControl, onToggleTeslaClimate, onToggleTeslaLock, onRoomColor, onRoomColorTemp, onRoomToggle, onRoomBrightness }: {
  rooms: Room[]; solar: SolarState; powerwall: PowerwallState; grid: GridState; tesla: TeslaState; outdoor: OutdoorState;
  onNavigate: (id: string) => void;
  onUpdateRoom: (id: string, p: Partial<Room>) => void;
  teslaControl: { climate: ControlStatus; lock: ControlStatus };
  onToggleTeslaClimate: () => void;
  onToggleTeslaLock: () => void;
  onRoomColor: (room: Room, c: Color) => void;
  onRoomColorTemp: (room: Room, kelvin: number) => void;
  onRoomToggle: (room: Room, on: boolean) => void;
  onRoomBrightness: (room: Room, v: number) => void;
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
  return (
    <div className="min-h-screen" style={{ background: "var(--tactus-bg-base)" }}>
      <div className="sticky top-0 z-10" style={{ background: "var(--tactus-bg-blur)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--tactus-bg-overlay)" }}>
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-[28px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>My Home</h1>
            <p className="text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{totalActive} of {totalDevices} devices active</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setAllLights(false)} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: "var(--tactus-bg-overlay)", border: "1px solid var(--tactus-border-overlay)", fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)", fontSize: 13, fontWeight: 600 }}>All Off</button>
            <button onClick={() => setAllLights(true)} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: withAlpha("#FFF9E5", 0.1), border: `1px solid ${withAlpha("#FFF9E5", 0.2)}`, fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-warm-white)", fontSize: 13, fontWeight: 600 }}>All On</button>
          </div>
        </div>
        <RoomControls roomBrightness={houseBrightness} roomColor={houseColor} onBrightnessChange={handleHouseBrightness} onColorChange={handleHouseColor} label="All Lights" />
      </div>

      <div className="p-8 flex flex-col gap-10">
        <EnvironmentBar rooms={rooms} outdoor={outdoor} />

        <div>
          <SectionHeading label="Energy" />
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            <SolarCard solar={solar} />
            <PowerwallCard powerwall={powerwall} grid={grid} />
            <TeslaCard tesla={tesla} climateControl={teslaControl.climate} lockControl={teslaControl.lock} onToggleClimate={onToggleTeslaClimate} onToggleLock={onToggleTeslaLock} />
          </div>
        </div>

        <div>
          <SectionHeading label="Rooms" count={rooms.length} />
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room}
                onNavigate={() => onNavigate(room.id)}
                onToggleAll={(on) => onRoomToggle(room, on)}
                onBrightnessChange={(v) => onRoomBrightness(room, v)}
                onColorChange={(c) => onRoomColor(room, c)}
                onColorTempChange={(k) => onRoomColorTemp(room, k)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
