import { COLORS } from "@/types";
import type { Room, Color } from "@/types";
import { withAlpha, dominantColor } from "@/lib/helpers";
import { BrightnessSlider } from "@/components/controls/BrightnessSlider";

export function RoomCard({ room, onNavigate, onToggleAll, onBrightnessChange, onColorChange }: {
  room: Room; onNavigate: () => void; onToggleAll: (on: boolean) => void;
  onBrightnessChange: (v: number) => void; onColorChange: (c: Color) => void;
}) {
  const { name, lights, switches, sensors, roomBrightness, roomColor } = room;
  const activeLights   = lights.filter((l) => l.cardState === "on").length;
  const activeSwitches = switches.filter((s) => s.isOn).length;
  const hasError       = lights.some((l) => l.cardState === "error");
  const allOff         = activeLights === 0 && activeSwitches === 0;
  const dominant       = dominantColor(lights);
  const isAnyOn        = !allOff;
  const tempSensor     = sensors.find((s) => s.data.kind === "temp");
  const motionSensor   = sensors.find((s) => s.data.kind === "motion");

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl w-full" style={{ background: allOff ? "var(--tactus-bg-base)" : "var(--tactus-bg-raised)", border: hasError ? `1px solid ${withAlpha("#EF4444", 0.4)}` : "1px solid var(--tactus-border-default)", boxShadow: isAnyOn ? `0 16px 40px 0 ${withAlpha(dominant, 0.07)}` : "none" }}>
      {/* Top row */}
      <button className="flex items-start justify-between w-full mb-5 text-left cursor-pointer hover:opacity-90 transition-opacity" onClick={onNavigate}>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[22px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: allOff ? "var(--tactus-text-dim)" : "var(--tactus-text-primary)" }}>{name}</h2>
          <div className="flex items-center gap-3">
            {activeLights > 0 && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{activeLights} light{activeLights > 1 ? "s" : ""}</p>}
            {activeSwitches > 0 && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{activeSwitches} plug{activeSwitches > 1 ? "s" : ""}</p>}
            {allOff && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>All off</p>}
            {tempSensor && tempSensor.data.kind === "temp" && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{tempSensor.data.tempC.toFixed(1)}°C</p>}
            {motionSensor && motionSensor.data.kind === "motion" && motionSensor.data.motionDetected && (
              <div className="flex items-center gap-1"><div className="size-1.5 rounded-full" style={{ background: "var(--tactus-amber)" }} /><p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-amber)" }}>Motion</p></div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasError && <div className="flex items-center px-2.5 py-1 rounded-full" style={{ background: withAlpha("#EF4444", 0.08), border: `1px solid ${withAlpha("#EF4444", 0.2)}` }}><p className="text-[10px] font-bold uppercase" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-red)" }}>Error</p></div>}
          <div role="button" onClick={(e) => { e.stopPropagation(); onToggleAll(allOff); }} className="flex items-center justify-center size-[36px] rounded-full transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background: isAnyOn ? withAlpha(dominant, 0.15) : "var(--tactus-bg-overlay)", border: isAnyOn ? `1px solid ${withAlpha(dominant, 0.3)}` : "1px solid var(--tactus-border-overlay)" }}>
            <svg viewBox="0 0 24 24" fill="none" className="size-[16px]"><path d="M12 3v6M6.3 6.3a8 8 0 1 0 11.4 0" stroke={isAnyOn ? dominant : "var(--tactus-text-muted)"} strokeLinecap="round" strokeWidth="2" /></svg>
          </div>
        </div>
      </button>

      {/* Light dots */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {lights.map((l) => {
          const on = l.cardState === "on", err = l.cardState === "error", pending = l.cardState === "pending";
          const dc = err ? "var(--tactus-red)" : (on || pending) ? l.selectedColor.hex : "var(--tactus-border-subtle)";
          return <div key={l.id} className="rounded-full shrink-0" title={`${l.device}`} style={{ width: 10, height: 10, background: dc, boxShadow: on ? `0 0 8px 0 ${withAlpha(l.selectedColor.hex, 0.5)}` : "none", animation: pending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined }} />;
        })}
        {switches.map((s) => (
          <div key={s.id} className="rounded-sm shrink-0" title={`${s.device}`} style={{ width: 10, height: 10, background: s.isOn ? "var(--tactus-green)" : "var(--tactus-border-subtle)", boxShadow: s.isOn ? `0 0 8px 0 ${withAlpha("#22C55E", 0.5)}` : "none" }} />
        ))}
      </div>

      {/* Brightness */}
      <div className="w-full mb-4">
        <BrightnessSlider value={isAnyOn ? roomBrightness : 0} onChange={(v) => { if (isAnyOn) onBrightnessChange(v); }} accent={isAnyOn ? dominant : "var(--tactus-border-default)"} />
      </div>

      {/* Color swatches + manage */}
      <div className="flex items-center gap-2 w-full">
        {COLORS.map((c) => {
          const isActive = c.id === roomColor.id && isAnyOn;
          return (
            <button key={c.id} onClick={() => { if (isAnyOn) onColorChange(c); }} disabled={!isAnyOn} className="relative shrink-0 rounded-full" style={{ width: 24, height: 24, outline: "none", opacity: isAnyOn ? 1 : 0.2, cursor: isAnyOn ? "pointer" : "default" }}>
              <svg viewBox="0 0 36 36" fill="none" className="size-full">
                {isActive && <rect x="1" y="1" width="34" height="34" rx="17" stroke={c.hex} strokeWidth="2.5" />}
                <circle cx="18" cy="18" r={isActive ? 12 : 14} fill={c.hex} />
              </svg>
            </button>
          );
        })}
        <button onClick={onNavigate} className="ml-auto flex items-center gap-1 cursor-pointer hover:opacity-70 transition-opacity">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Manage</p>
          <svg viewBox="0 0 24 24" fill="none" className="size-[12px]"><path d="M9 18L15 12L9 6" stroke="var(--tactus-text-faint)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
        </button>
      </div>
    </div>
  );
}
