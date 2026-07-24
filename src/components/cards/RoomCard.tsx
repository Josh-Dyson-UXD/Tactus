import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Room, HvacMode } from "@/types";
import { withAlpha, dominantColor } from "@/lib/helpers";
import { SunIcon } from "@/components/icons";
import { BrightnessSlider } from "@/components/controls/BrightnessSlider";

type Panel = "summary" | "brightness";

const COMMIT_DELAY = 400;

// Status readout only, not a control — mirrors ClimateCard's mode colours
// (this card never lets you change climate state, only navigate to it).
const CLIMATE_MODE_COLOR: Record<HvacMode, string> = {
  heat: "var(--tactus-amber)",
  cool: "var(--tactus-blue)",
  dry: "var(--tactus-blue-light)",
  fan_only: "var(--tactus-text-secondary)",
  heat_cool: "var(--tactus-green)",
  off: "var(--tactus-text-muted)",
};
const CLIMATE_MODE_LABEL: Record<HvacMode, string> = {
  heat: "Heat", cool: "Cool", dry: "Dry", fan_only: "Fan", heat_cool: "Auto", off: "Off",
};

// Brightness + on/off only — colour selection only ever exists at the
// individual LightCard level. Different bulbs in a room can support
// different colour modes (or none at all), so a single "room colour" was
// never physically accurate. The small per-light dots below are still
// each light's real current colour — status indicators, not a control.
export function RoomCard({ room, onNavigate, onToggleAll, onBrightnessChange }: {
  room: Room; onNavigate: () => void; onToggleAll: (on: boolean) => void;
  onBrightnessChange: (v: number) => void;
}) {
  const { name, lights, switches, sensors, climate, roomBrightness } = room;
  const [panel, setPanel] = useState<Panel>("summary");

  // Local optimistic value + debounce — dragging updates the numeral/thumb
  // instantly and smoothly, but onBrightnessChange (which fans out to a real
  // light.turn_on per light in the room) only fires once, 400ms after the
  // last movement. Same pattern as LightCard's handleBrightnessChange —
  // without it, one drag floods the Zigbee mesh with a service call per
  // pixel across every light in the room, and they miss the pending-confirm
  // window and land in error.
  const [localBrightness, setLocalBrightness] = useState<number | null>(null);
  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (brightnessTimer.current) clearTimeout(brightnessTimer.current); }, []);

  const activeLights   = lights.filter((l) => l.cardState === "on").length;
  const activeSwitches = switches.filter((s) => s.isOn).length;
  const hasError       = lights.some((l) => l.cardState === "error");
  const allOff         = activeLights === 0 && activeSwitches === 0;
  const dominant       = dominantColor(lights);
  const isAnyOn        = !allOff;
  const tempSensor     = sensors.find((s) => s.data.kind === "temp");
  const motionSensor   = sensors.find((s) => s.data.kind === "motion");
  const climateUnit    = climate[0];

  const displayBrightness = localBrightness ?? roomBrightness;

  const handleBrightnessChange = (v: number) => {
    setLocalBrightness(v);
    if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
    // Clear the local shadow value once committed, so the display goes back
    // to tracking the real (confirmed) roomBrightness prop afterward — without
    // this, the room card would stay frozen at whatever was last dragged and
    // never reflect subsequent real changes (individual lights, physical
    // switches, etc.).
    brightnessTimer.current = setTimeout(() => { onBrightnessChange(v); setLocalBrightness(null); }, COMMIT_DELAY);
  };

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl w-full" style={{ background: allOff ? "var(--tactus-bg-base)" : "var(--tactus-bg-raised)", border: hasError ? `1px solid ${withAlpha("#EF4444", 0.4)}` : "1px solid var(--tactus-border-default)", boxShadow: isAnyOn ? `0 16px 40px 0 ${withAlpha(dominant, 0.07)}` : "none" }}
      onClick={() => setPanel("summary")}>
      {/* Top row */}
      <button className="flex items-start justify-between w-full mb-5 text-left cursor-pointer hover:opacity-90 transition-opacity" onClick={(e) => { e.stopPropagation(); onNavigate(); }}>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[22px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: allOff ? "var(--tactus-text-dim)" : "var(--tactus-text-primary)" }}>{name}</h2>
          <div className="flex items-center gap-3">
            {activeLights > 0 && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{activeLights} light{activeLights > 1 ? "s" : ""}</p>}
            {activeSwitches > 0 && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{activeSwitches} plug{activeSwitches > 1 ? "s" : ""}</p>}
            {allOff && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>All off</p>}
            {tempSensor && tempSensor.data.kind === "temp" && <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>{tempSensor.data.tempC.toFixed(1)}°C</p>}
            {climateUnit && (
              <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: climateUnit.mode === "off" ? "var(--tactus-text-muted)" : CLIMATE_MODE_COLOR[climateUnit.mode] }}>
                {climateUnit.mode === "off" ? "Off" : `${CLIMATE_MODE_LABEL[climateUnit.mode]} · ${climateUnit.targetTemp ?? "—"}°`}
              </p>
            )}
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

      {/* Light dots — status indicators of each light's real current colour, not a control */}
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

      {/* Bottom panel — mirrors LightCard's brightness-only summary (colorMode === "brightness") */}
      <div className="w-full shrink-0" style={{ height: 100 }} onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          {!isAnyOn ? (
            <motion.div key="off" className="flex items-start justify-center w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-[40px] items-center justify-center flex-1">
                <div className="size-[32px]"><SunIcon stroke="var(--tactus-border-default)" size={32} /></div>
              </div>
            </motion.div>
          ) : panel === "summary" ? (
            <motion.div key="sum" className="flex items-center justify-center w-full h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-[40px] items-center justify-center flex-1">
                <button className="flex flex-col items-center gap-[6px] w-[72px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setPanel("brightness")}>
                  <div className="size-[32px]"><SunIcon stroke="var(--tactus-text-secondary)" size={32} /></div>
                  <p className="text-[13px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{displayBrightness}%</p>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="br" className="flex flex-col gap-[12px] w-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <button className="flex items-center justify-between w-full cursor-pointer hover:opacity-75 transition-opacity" onClick={() => setPanel("summary")}>
                <div className="size-[16px]"><SunIcon stroke="var(--tactus-text-secondary)" size={16} /></div>
                <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)" }}>
                  <span style={{ fontSize: 24, fontWeight: 600 }}>{displayBrightness}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}> %</span>
                </p>
                <div className="size-[24px]"><SunIcon stroke={dominant} size={24} /></div>
              </button>
              <BrightnessSlider value={displayBrightness} onChange={handleBrightnessChange} accent={dominant} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button onClick={(e) => { e.stopPropagation(); onNavigate(); }} className="mt-3 flex items-center gap-1 self-end cursor-pointer hover:opacity-70 transition-opacity">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Manage</p>
        <svg viewBox="0 0 24 24" fill="none" className="size-[12px]"><path d="M9 18L15 12L9 6" stroke="var(--tactus-text-faint)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
      </button>
    </div>
  );
}
