import { SunIcon } from "@/components/icons";
import { BrightnessSlider } from "@/components/controls/BrightnessSlider";

// Brightness only — colour selection only ever exists at the individual
// LightCard level. A shared aggregate "room colour"/"house colour" was
// never physically accurate across bulbs with different colour modes.
export function RoomControls({ roomBrightness, onBrightnessChange, label = "Room" }: {
  roomBrightness: number; onBrightnessChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div className="px-8 py-5 flex flex-col gap-5" style={{ borderBottom: "1px solid var(--tactus-bg-overlay)" }}>
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>{label}</p>
      <div className="flex items-center gap-4">
        <div className="size-[16px] shrink-0"><SunIcon stroke="var(--tactus-text-muted)" size={16} /></div>
        <div className="flex-1"><BrightnessSlider value={roomBrightness} onChange={onBrightnessChange} accent="var(--tactus-warm-white)" /></div>
        <div className="size-[20px] shrink-0"><SunIcon stroke="var(--tactus-warm-white)" size={24} /></div>
        <p className="w-[42px] text-right text-[13px] shrink-0" style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)", fontWeight: 600 }}>{roomBrightness}%</p>
      </div>
    </div>
  );
}
