import { COLORS } from "@/types";
import type { Color } from "@/types";
import { SunIcon } from "@/components/icons";
import { BrightnessSlider } from "@/components/controls/BrightnessSlider";

export function RoomControls({ roomBrightness, roomColor, onBrightnessChange, onColorChange, label = "Room" }: {
  roomBrightness: number; roomColor: Color;
  onBrightnessChange: (v: number) => void; onColorChange: (c: Color) => void;
  label?: string;
}) {
  return (
    <div className="px-8 py-5 flex flex-col gap-5" style={{ borderBottom: "1px solid var(--tactus-bg-overlay)" }}>
      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>{label}</p>
      <div className="flex items-center gap-4">
        <div className="size-[16px] shrink-0"><SunIcon stroke="var(--tactus-text-muted)" size={16} /></div>
        <div className="flex-1"><BrightnessSlider value={roomBrightness} onChange={onBrightnessChange} accent={roomColor.hex} /></div>
        <div className="size-[20px] shrink-0"><SunIcon stroke={roomColor.hex} size={24} /></div>
        <p className="w-[42px] text-right text-[13px] shrink-0" style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)", fontWeight: 600 }}>{roomBrightness}%</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-[16px] h-[16px] shrink-0 rounded-full" style={{ background: roomColor.hex }} />
        <div className="flex gap-[10px] items-center flex-1">
          {COLORS.map((c) => {
            const isActive = c.id === roomColor.id;
            return (
              <button key={c.id} onClick={() => onColorChange(c)} className="relative shrink-0 cursor-pointer transition-transform hover:scale-110" style={{ width: 28, height: 28, outline: "none" }}>
                <svg viewBox="0 0 36 36" fill="none" className="size-full">
                  {isActive && <rect x="1" y="1" width="34" height="34" rx="17" stroke={c.hex} strokeWidth="2.5" />}
                  <circle cx="18" cy="18" r={isActive ? 12 : 14} fill={c.hex} />
                </svg>
              </button>
            );
          })}
        </div>
        <p className="text-[13px] font-normal shrink-0 w-[80px] text-right" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-secondary)" }}>{roomColor.label}</p>
      </div>
    </div>
  );
}
