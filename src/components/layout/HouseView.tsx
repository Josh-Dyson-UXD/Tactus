import { useState, useRef, useEffect } from "react";
import { Zap } from "lucide-react";
import type { Room, SolarState, PowerwallState, GridState, TeslaState, OutdoorState, HomeLoadState, IndoorState, ControlStatus, TeslaControlKey, TeslaActions } from "@/types";
import { withAlpha } from "@/lib/helpers";
import { computeRoomBrightness } from "@/lib/ha-types";
import { RoomControls } from "@/components/controls/RoomControls";
import { EnvironmentBar } from "@/components/layout/EnvironmentBar";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { SolarCard } from "@/components/cards/SolarCard";
import { PowerwallCard } from "@/components/cards/PowerwallCard";
import { TeslaCard } from "@/components/cards/TeslaCard";
import { EnergyFlowCard } from "@/components/cards/EnergyFlowCard";
import { RoomCard } from "@/components/cards/RoomCard";

const COMMIT_DELAY = 400;

export function HouseView({ rooms, solar, powerwall, grid, tesla, outdoor, homeLoad, indoor, onNavigate, onOpenAutomations, teslaControl, teslaActions, onRoomToggle, onRoomBrightness, onHouseToggle, onHouseBrightness }: {
  rooms: Room[]; solar: SolarState; powerwall: PowerwallState; grid: GridState; tesla: TeslaState; outdoor: OutdoorState; homeLoad: HomeLoadState; indoor: IndoorState;
  onNavigate: (id: string) => void;
  onOpenAutomations: () => void;
  teslaControl: Record<TeslaControlKey, ControlStatus>;
  teslaActions: TeslaActions;
  onRoomToggle: (room: Room, on: boolean) => void;
  onRoomBrightness: (room: Room, v: number) => void;
  onHouseToggle: (on: boolean) => void;
  onHouseBrightness: (v: number) => void;
}) {
  // Idle display is the true live average across every room's on lights —
  // recomputed on every render from the real rooms prop, not a stale local
  // default. Same local-state + debounce pattern as LightCard/RoomCard: a
  // local override takes over only during an active drag/settle window,
  // then clears so the slider goes back to tracking the real average. This
  // fans out to every light in every room (potentially 15+ at once), so
  // it's even more flood-prone than the room-level case.
  const [localHouseBrightness, setLocalHouseBrightness] = useState<number | null>(null);
  const houseBrightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (houseBrightnessTimer.current) clearTimeout(houseBrightnessTimer.current); }, []);

  const totalActive = rooms.reduce((s, r) => s + r.lights.filter(l => l.cardState === "on").length + r.switches.filter(s => s.isOn).length, 0);
  const totalDevices = rooms.reduce((s, r) => s + r.lights.length + r.switches.length, 0);

  const liveHouseBrightness = computeRoomBrightness(rooms.flatMap((r) => r.lights));
  const displayHouseBrightness = localHouseBrightness ?? liveHouseBrightness;

  const handleHouseBrightnessChange = (v: number) => {
    setLocalHouseBrightness(v);
    if (houseBrightnessTimer.current) clearTimeout(houseBrightnessTimer.current);
    houseBrightnessTimer.current = setTimeout(() => { onHouseBrightness(v); setLocalHouseBrightness(null); }, COMMIT_DELAY);
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
            <button onClick={onOpenAutomations} title="Automations & Scenes" className="flex items-center justify-center size-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: "var(--tactus-bg-overlay)", border: "1px solid var(--tactus-border-overlay)" }}>
              <Zap size={16} color="var(--tactus-text-secondary)" />
            </button>
            <button onClick={() => onHouseToggle(false)} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: "var(--tactus-bg-overlay)", border: "1px solid var(--tactus-border-overlay)", fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)", fontSize: 13, fontWeight: 600 }}>All Off</button>
            <button onClick={() => onHouseToggle(true)} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: withAlpha("#FFF9E5", 0.1), border: `1px solid ${withAlpha("#FFF9E5", 0.2)}`, fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-warm-white)", fontSize: 13, fontWeight: 600 }}>All On</button>
          </div>
        </div>
        <RoomControls roomBrightness={displayHouseBrightness} onBrightnessChange={handleHouseBrightnessChange} label="All Lights" />
      </div>

      <div className="p-8 flex flex-col gap-10">
        <EnvironmentBar rooms={rooms} indoor={indoor} outdoor={outdoor} />

        <div>
          <SectionHeading label="Energy" />
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            <SolarCard solar={solar} />
            <PowerwallCard powerwall={powerwall} grid={grid} />
            <TeslaCard tesla={tesla} control={teslaControl} actions={teslaActions} />
          </div>
          <div className="mt-4">
            <EnergyFlowCard solar={solar} powerwall={powerwall} grid={grid} homeLoad={homeLoad} tesla={tesla} />
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
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
