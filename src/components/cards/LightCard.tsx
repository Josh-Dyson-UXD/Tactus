import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { COLORS } from "@/types";
import type { LightState, Color } from "@/types";
import { withAlpha } from "@/lib/helpers";
import { LightbulbIcon, AlertIcon, SunIcon, WifiOffIcon } from "@/components/icons";
import { BrightnessSlider } from "@/components/controls/BrightnessSlider";

const BRIGHTNESS_COMMIT_DELAY = 400;

export function LightCard({ state, onChange, onToggle, onCommitBrightness, onCommitColor, onRetry }: {
  state: LightState;
  onChange: (p: Partial<LightState>) => void;
  onToggle: (on: boolean) => void;
  onCommitBrightness: (v: number) => void;
  onCommitColor: (c: Color) => void;
  onRetry: () => void;
}) {
  const { cardState, panel, brightness, selectedColor, device } = state;
  const isOn = cardState === "on", isOff = cardState === "off", isPending = cardState === "pending", isError = cardState === "error";
  const accent = isError ? "#EF4444" : (isOn || isPending) ? selectedColor.hex : "#475569";
  const accentLight = (isOn || isPending) ? withAlpha(accent, 0.13) : "var(--tactus-bg-hairline)";
  const pulse = isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined;

  // Local visual value updates instantly while dragging; the actual
  // light.turn_on call only fires once the drag settles, so we're not
  // flooding HA with a service call per pixel of movement.
  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (brightnessTimer.current) clearTimeout(brightnessTimer.current); }, []);
  const handleBrightnessChange = (v: number) => {
    onChange({ brightness: v });
    if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
    brightnessTimer.current = setTimeout(() => onCommitBrightness(v), BRIGHTNESS_COMMIT_DELAY);
  };

  const handleColorPick = (c: Color) => {
    onChange({ selectedColor: c });
    onCommitColor(c);
  };

  return (
    <motion.div className="relative flex flex-col items-start justify-between p-[24px] rounded-tactus-3xl w-full"
      style={{ minHeight: 480, background: isOff ? "var(--tactus-bg-base)" : "var(--tactus-bg-raised)", boxShadow: isError ? `0 0 28px 0 ${withAlpha("#EF4444", 0.12)}` : isOn ? `0 20px 30px 0 ${withAlpha(accent, 0.04)}` : "none" }}
      animate={{ background: isOff ? "var(--tactus-bg-base)" : "var(--tactus-bg-raised)" }} transition={{ duration: 0.4 }}
      onClick={() => onChange({ panel: "summary" })}>
      <div aria-hidden className="absolute inset-0 rounded-tactus-3xl pointer-events-none" style={{ border: isError ? "1px solid var(--tactus-red)" : "1px solid var(--tactus-border-default)" }} />

      {/* Header */}
      <div className="flex items-center justify-between w-full shrink-0">
        <div className="flex items-center gap-[12px]">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px] shrink-0" style={{ background: accentLight, animation: pulse }}>
            {isError
              ? <div className="size-[20px] overflow-clip relative"><div className="absolute top-[8.33%] bottom-[8.33%] left-1/4 right-1/4"><AlertIcon stroke="var(--tactus-red)" /></div></div>
              : <div className="size-[20px]"><LightbulbIcon stroke={isOff ? "var(--tactus-text-muted)" : accent} /></div>}
          </div>
          <div className="flex flex-col gap-[2px]">
            <p className="text-[18px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOff ? "var(--tactus-text-secondary)" : "var(--tactus-text-primary)" }}>{device}</p>
            {isError && <p className="text-[11px] font-bold uppercase leading-none mt-[2px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-red)" }}>UNREACHABLE</p>}
          </div>
        </div>
        <div className="flex items-center px-[10px] py-[4px] rounded-full relative shrink-0" style={{ background: accentLight, animation: pulse }}>
          <div aria-hidden className="absolute inset-0 rounded-full pointer-events-none" style={{ border: `1px solid ${withAlpha(accent, 0.25)}` }} />
          <p className="text-[11px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOff ? "var(--tactus-text-muted)" : accent }}>{isError ? "ERROR" : isPending ? "SYNCING" : isOn ? "ON" : "OFF"}</p>
        </div>
      </div>

      {/* Rocker */}
      <div className="flex items-center justify-center w-full shrink-0">
        <div className="relative flex flex-col items-center justify-center p-[8px] rounded-tactus-xl" style={{ width: 120, height: 180, background: "var(--tactus-bg-base)", border: "2px solid var(--tactus-border-default)" }}>
          <div className="flex flex-col gap-[2px] w-full flex-1 overflow-clip rounded-[18px]">
            <motion.button className="flex flex-1 flex-col items-center justify-center w-full cursor-pointer min-h-0" animate={{ background: isOn ? accent : "var(--tactus-border-default)" }} transition={{ duration: 0.25 }} whileTap={{ scale: 0.97 }}
              onClick={(e) => { e.stopPropagation(); if (!isError && !isPending) { onChange({ panel: "summary" }); onToggle(true); } }} disabled={isError || isPending}>
              <p className="text-[12px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOn ? "var(--tactus-bg-base)" : "var(--tactus-text-muted)" }}>ON</p>
            </motion.button>
            <motion.button className="flex flex-1 flex-col items-center justify-center w-full relative cursor-pointer min-h-0" style={{ background: "var(--tactus-border-default)" }} whileTap={{ scale: 0.97 }}
              onClick={(e) => { e.stopPropagation(); if (!isError && !isPending) { onChange({ panel: "summary" }); onToggle(false); } }} disabled={isError || isPending}>
              {isOn && <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "var(--tactus-inset-shadow)" }} />}
              <p className="text-[12px] font-bold uppercase leading-none relative" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>OFF</p>
            </motion.button>
            {!isOn && !isError && <div className="absolute left-[12px] right-[12px] top-1/2 -translate-y-1/2 h-px opacity-35 pointer-events-none" style={{ background: "var(--tactus-bg-track)" }} />}
            {isError && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="size-[22px]"><WifiOffIcon stroke="var(--tactus-red)" /></div></div>}
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="w-full shrink-0 pt-[16px]" style={{ height: 100 }} onClick={(e) => e.stopPropagation()}>
        <AnimatePresence mode="wait">
          {isError ? (
            <motion.div key="err" className="flex flex-col gap-[12px]" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <div className="flex flex-col gap-[6px]">
                <p className="text-[13px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-red)" }}>Device not responding</p>
                <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>Check connection and try again.</p>
              </div>
              <button onClick={onRetry} className="flex items-center justify-center px-[14px] h-[36px] rounded-full cursor-pointer" style={{ background: "var(--tactus-bg-base)", border: "1px solid var(--tactus-red)" }}>
                <p className="text-[12px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-red)" }}>RETRY</p>
              </button>
            </motion.div>
          ) : isOff ? (
            <motion.div key="off" className="flex items-start justify-center w-full h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-[40px] items-center justify-center flex-1">
                <div className="size-[32px]"><SunIcon stroke="var(--tactus-border-default)" size={32} /></div>
                <div className="size-[32px] rounded-full" style={{ background: "var(--tactus-border-default)" }} />
              </div>
            </motion.div>
          ) : panel === "summary" ? (
            <motion.div key="sum" className="flex items-center justify-center w-full h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-[40px] items-center justify-center flex-1">
                <button className="flex flex-col items-center gap-[6px] w-[72px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onChange({ panel: "brightness" })}>
                  <div className="size-[32px]"><SunIcon stroke="var(--tactus-text-secondary)" size={32} /></div>
                  <p className="text-[13px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{brightness}%</p>
                </button>
                <button className="flex flex-col items-center gap-[6px] w-[72px] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onChange({ panel: "color" })}>
                  <div className="size-[32px] rounded-full" style={{ background: selectedColor.hex }} />
                  <p className="text-[13px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{selectedColor.label.split(" ")[0]}</p>
                </button>
              </div>
            </motion.div>
          ) : panel === "brightness" ? (
            <motion.div key="br" className="flex flex-col gap-[12px] w-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <button className="flex items-center justify-between w-full cursor-pointer hover:opacity-75 transition-opacity" onClick={() => onChange({ panel: "summary" })}>
                <div className="size-[16px]"><SunIcon stroke="var(--tactus-text-secondary)" size={16} /></div>
                <p style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-primary)" }}>
                  <span style={{ fontSize: 24, fontWeight: 600 }}>{brightness}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}> %</span>
                </p>
                <div className="size-[24px]"><SunIcon stroke={accent} size={24} /></div>
              </button>
              <BrightnessSlider value={brightness} onChange={handleBrightnessChange} accent={accent} />
            </motion.div>
          ) : (
            <motion.div key="col" className="flex flex-col gap-[12px] w-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <div className="flex gap-[12px] items-center w-full">
                {COLORS.map((c) => (
                  <button key={c.id} className="relative shrink-0 size-[36px] rounded-full cursor-pointer" onClick={() => handleColorPick(c as Color)}>
                    <svg viewBox="0 0 36 36" fill="none" className="size-full">
                      {c.id === selectedColor.id && <rect x="1" y="1" width="34" height="34" rx="17" stroke={c.hex} strokeWidth="2" />}
                      <circle cx="18" cy="18" r="14" fill={c.hex} />
                    </svg>
                  </button>
                ))}
              </div>
              <p className="text-[13px] font-normal leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-primary)" }}>{selectedColor.label}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
