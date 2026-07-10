import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { COLORS } from "@/types";
import type { Room, Color } from "@/types";
import { withAlpha, dominantColor, kelvinToHex } from "@/lib/helpers";
import { SunIcon } from "@/components/icons";
import { BrightnessSlider } from "@/components/controls/BrightnessSlider";
import { ColorTempSlider } from "@/components/controls/ColorTempSlider";

type Panel = "summary" | "brightness" | "color";

export function RoomCard({ room, onNavigate, onToggleAll, onBrightnessChange, onColorChange, onColorTempChange }: {
  room: Room; onNavigate: () => void; onToggleAll: (on: boolean) => void;
  onBrightnessChange: (v: number) => void;
  onColorChange: (c: Color) => void;
  onColorTempChange: (kelvin: number) => void;
}) {
  const { name, lights, switches, sensors, roomBrightness, roomColor } = room;
  const [panel, setPanel] = useState<Panel>("summary");

  const activeLights   = lights.filter((l) => l.cardState === "on").length;
  const activeSwitches = switches.filter((s) => s.isOn).length;
  const hasError       = lights.some((l) => l.cardState === "error");
  const allOff         = activeLights === 0 && activeSwitches === 0;
  const dominant       = dominantColor(lights);
  const isAnyOn        = !allOff;
  const tempSensor     = sensors.find((s) => s.data.kind === "temp");
  const motionSensor   = sensors.find((s) => s.data.kind === "motion");

  // Room-level colour capability, derived from the room's actual lights —
  // not assumed. Majority vote across colour-capable lights decides which
  // picker the room shows; rooms with no colour-capable lights get no
  // colour control at all. See CLAUDE.md and LightCard's own colorMode gating.
  const colorCapable = lights.filter((l) => l.colorMode !== "brightness");
  const rgbCount  = colorCapable.filter((l) => l.colorMode === "rgb").length;
  const tempLights = colorCapable.filter((l) => l.colorMode === "temp");
  const roomColorMode: "rgb" | "temp" | null =
    colorCapable.length === 0 ? null : rgbCount >= tempLights.length ? "rgb" : "temp";
  const roomTempRange = tempLights.find((l) => l.colorTempRange)?.colorTempRange;
  const onTempLights = tempLights.filter((l) => (l.cardState === "on" || l.cardState === "pending") && l.colorTempKelvin !== undefined);
  const roomColorTempKelvin = onTempLights.length
    ? Math.round(onTempLights.reduce((s, l) => s + (l.colorTempKelvin ?? 0), 0) / onTempLights.length)
    : roomTempRange ? Math.round((roomTempRange.min + roomTempRange.max) / 2) : undefined;
  const hasColorPanel = roomColorMode === "rgb" || (roomColorMode === "temp" && roomTempRange !== undefined);

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

      {/* Bottom panel — mirrors LightCard's summary → brightness/color state machine */}
      <div className="w-full shrink-0" style={{ height: 100 }} onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          {!isAnyOn ? (
            <motion.div key="off" className="flex items-start justify-center w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-[40px] items-center justify-center flex-1">
                <div className="size-[32px]"><SunIcon stroke="var(--tactus-border-default)" size={32} /></div>
                {hasColorPanel && <div className="size-[32px] rounded-full" style={{ background: "var(--tactus-border-default)" }} />}
              </div>
            </motion.div>
          ) : panel === "summary" ? (
            <motion.div key="sum" className="flex items-center justify-center w-full h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-[40px] items-center justify-center flex-1">
                <button className="flex flex-col items-center gap-[6px] w-[72px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setPanel("brightness")}>
                  <div className="size-[32px]"><SunIcon stroke="var(--tactus-text-secondary)" size={32} /></div>
                  <p className="text-[13px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{roomBrightness}%</p>
                </button>
                {hasColorPanel && (
                  <button className="flex flex-col items-center gap-[6px] w-[72px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setPanel("color")}>
                    <div className="size-[32px] rounded-full" style={{ background: roomColorMode === "temp" && roomColorTempKelvin ? kelvinToHex(roomColorTempKelvin) : roomColor.hex }} />
                    <p className="text-[13px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>
                      {roomColorMode === "temp" && roomColorTempKelvin ? `${Math.round(roomColorTempKelvin / 100) * 100}K` : roomColor.label.split(" ")[0]}
                    </p>
                  </button>
                )}
              </div>
            </motion.div>
          ) : panel === "brightness" ? (
            <motion.div key="br" className="flex flex-col gap-[12px] w-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <button className="flex items-center justify-between w-full cursor-pointer hover:opacity-75 transition-opacity" onClick={() => setPanel("summary")}>
                <div className="size-[16px]"><SunIcon stroke="var(--tactus-text-secondary)" size={16} /></div>
                <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)" }}>
                  <span style={{ fontSize: 24, fontWeight: 600 }}>{roomBrightness}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}> %</span>
                </p>
                <div className="size-[24px]"><SunIcon stroke={dominant} size={24} /></div>
              </button>
              <BrightnessSlider value={roomBrightness} onChange={onBrightnessChange} accent={dominant} />
            </motion.div>
          ) : panel === "color" && roomColorMode === "temp" && roomTempRange ? (
            <motion.div key="temp" className="flex flex-col gap-[12px] w-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <button className="flex items-center justify-between w-full cursor-pointer hover:opacity-75 transition-opacity" onClick={() => setPanel("summary")}>
                <div className="size-[16px] rounded-full" style={{ background: kelvinToHex(roomTempRange.min) }} />
                <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)" }}>
                  <span style={{ fontSize: 24, fontWeight: 600 }}>{roomColorTempKelvin ?? roomTempRange.min}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}> K</span>
                </p>
                <div className="size-[16px] rounded-full" style={{ background: kelvinToHex(roomTempRange.max) }} />
              </button>
              <ColorTempSlider value={roomColorTempKelvin ?? roomTempRange.min} min={roomTempRange.min} max={roomTempRange.max} onChange={onColorTempChange} />
            </motion.div>
          ) : panel === "color" && roomColorMode === "rgb" ? (
            <motion.div key="col" className="flex flex-col gap-[12px] w-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-[12px] items-center w-full">
                {COLORS.map((c) => (
                  <button key={c.id} className="relative shrink-0 size-[36px] rounded-full cursor-pointer" onClick={() => onColorChange(c as Color)}>
                    <svg viewBox="0 0 36 36" fill="none" className="size-full">
                      {c.id === roomColor.id && <rect x="1" y="1" width="34" height="34" rx="17" stroke={c.hex} strokeWidth="2" />}
                      <circle cx="18" cy="18" r="14" fill={c.hex} />
                    </svg>
                  </button>
                ))}
              </div>
              <p className="text-[13px] font-normal leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{roomColor.label}</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <button onClick={(e) => { e.stopPropagation(); onNavigate(); }} className="mt-3 flex items-center gap-1 self-end cursor-pointer hover:opacity-70 transition-opacity">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Manage</p>
        <svg viewBox="0 0 24 24" fill="none" className="size-[12px]"><path d="M9 18L15 12L9 6" stroke="var(--tactus-text-faint)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
      </button>
    </div>
  );
}
