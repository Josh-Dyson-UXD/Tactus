import { useState, useRef, useEffect } from "react";
import type { Room, LightState, SwitchState, Color } from "@/types";
import { withAlpha } from "@/lib/helpers";
import { ChevronLeft } from "@/components/icons";
import { RoomControls } from "@/components/controls/RoomControls";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { LightCard } from "@/components/cards/LightCard";
import { SwitchCard } from "@/components/cards/SwitchCard";
import { SensorCard } from "@/components/cards/SensorCard";

const COMMIT_DELAY = 400;

export function RoomView({ room, onBack, onUpdateRoom, onLightToggle, onLightBrightness, onLightColor, onLightColorTemp }: {
  room: Room; onBack: () => void; onUpdateRoom: (p: Partial<Room>) => void;
  onLightToggle: (entityId: string, on: boolean) => void;
  onLightBrightness: (entityId: string, v: number) => void;
  onLightColor: (entityId: string, c: Color) => void;
  onLightColorTemp: (entityId: string, kelvin: number) => void;
}) {
  const { lights, switches, sensors, roomBrightness, name } = room;
  const activeCount = lights.filter(l => l.cardState === "on").length + switches.filter(s => s.isOn).length;
  const totalCount  = lights.length + switches.length;

  const updateLight  = (id: string, p: Partial<LightState>)  => onUpdateRoom({ lights:   lights.map((l) => l.id === id ? { ...l, ...p } : l) });
  const updateSwitch = (id: string, p: Partial<SwitchState>) => onUpdateRoom({ switches: switches.map((s) => s.id === id ? { ...s, ...p } : s) });

  // This header's "All On/Off" and brightness bar previously only mutated
  // local state via onUpdateRoom, same gap as RoomCard/HouseView had — never
  // called real HA services. Fixed to reuse the real per-light
  // onLightToggle/onLightBrightness props already used by the LightCards on
  // this same page. Switches aren't touched (no real switch entities exist).
  const allOn  = () => lights.forEach((l) => { if (l.cardState !== "error") onLightToggle(l.id, true); });
  const allOff = () => lights.forEach((l) => { if (l.cardState !== "error") onLightToggle(l.id, false); });

  // Same local-state + 400ms debounce pattern as RoomCard/HouseView — without
  // it, dragging this slider would flood every light in the room with a
  // service call per pixel.
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

  return (
    <div className="min-h-screen" style={{ background: "var(--tactus-bg-base)" }}>
      <div className="sticky top-0 z-10" style={{ background: "var(--tactus-bg-blur)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--tactus-bg-overlay)" }}>
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center justify-center size-[36px] rounded-full cursor-pointer hover:opacity-80 transition-opacity shrink-0" style={{ background: "var(--tactus-bg-overlay)", border: "1px solid var(--tactus-border-overlay)" }}>
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
            <button onClick={allOff} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: "var(--tactus-bg-overlay)", border: "1px solid var(--tactus-border-overlay)", fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)", fontSize: 13, fontWeight: 600 }}>All Off</button>
            <button onClick={allOn} className="flex items-center justify-center px-5 h-[38px] rounded-full cursor-pointer transition-opacity hover:opacity-80" style={{ background: withAlpha("#FFF9E5", 0.1), border: `1px solid ${withAlpha("#FFF9E5", 0.2)}`, fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-warm-white)", fontSize: 13, fontWeight: 600 }}>All On</button>
          </div>
        </div>
        {lights.length > 0 && <RoomControls roomBrightness={displayBrightness} onBrightnessChange={handleRoomBrightness} />}
      </div>

      <div className="p-8 flex flex-col gap-10">
        {lights.length > 0 && (
          <div>
            <SectionHeading label="Lights" count={lights.length} />
            <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", alignItems: "start" }}>
              {lights.map((l) => (
                <LightCard key={l.id} state={l}
                  onChange={(p) => updateLight(l.id, p)}
                  onToggle={(on) => onLightToggle(l.id, on)}
                  onCommitBrightness={(v) => onLightBrightness(l.id, v)}
                  onCommitColor={(c) => onLightColor(l.id, c)}
                  onCommitColorTemp={(k) => onLightColorTemp(l.id, k)}
                  onRetry={() => onLightToggle(l.id, true)}
                />
              ))}
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
