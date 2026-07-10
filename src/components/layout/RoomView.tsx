import type { Room, LightState, SwitchState } from "@/types";
import { withAlpha } from "@/lib/helpers";
import { ChevronLeft } from "@/components/icons";
import { RoomControls } from "@/components/controls/RoomControls";
import { SectionHeading } from "@/components/layout/SectionHeading";
import { LightCard } from "@/components/cards/LightCard";
import { SwitchCard } from "@/components/cards/SwitchCard";
import { SensorCard } from "@/components/cards/SensorCard";

export function RoomView({ room, onBack, onUpdateRoom }: { room: Room; onBack: () => void; onUpdateRoom: (p: Partial<Room>) => void }) {
  const { lights, switches, sensors, roomBrightness, roomColor, name } = room;
  const activeCount = lights.filter(l => l.cardState === "on").length + switches.filter(s => s.isOn).length;
  const totalCount  = lights.length + switches.length;

  const updateLight  = (id: string, p: Partial<LightState>)  => onUpdateRoom({ lights:   lights.map((l) => l.id === id ? { ...l, ...p } : l) });
  const updateSwitch = (id: string, p: Partial<SwitchState>) => onUpdateRoom({ switches: switches.map((s) => s.id === id ? { ...s, ...p } : s) });

  const allOn  = () => onUpdateRoom({ lights: lights.map((l) => l.cardState === "error" ? l : { ...l, cardState: "on",  panel: "summary" }), switches: switches.map((s) => ({ ...s, isOn: true,  wattsNow: s.wattsNow || 45 })) });
  const allOff = () => onUpdateRoom({ lights: lights.map((l) => l.cardState === "error" ? l : { ...l, cardState: "off", panel: "summary" }), switches: switches.map((s) => ({ ...s, isOn: false, wattsNow: 0 })) });

  const handleRoomBrightness = (v: number) => onUpdateRoom({ roomBrightness: v, lights: lights.map((l) => l.cardState !== "on" ? l : { ...l, brightness: v }) });
  const handleRoomColor = (c: typeof roomColor) => onUpdateRoom({ roomColor: c, lights: lights.map((l) => l.cardState !== "on" ? l : { ...l, selectedColor: c }) });

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
