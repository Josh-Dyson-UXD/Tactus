import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { COLORS } from "@/types";
import type { LightState, Color } from "@/types";
import { withAlpha, kelvinToHex } from "@/lib/helpers";
import { LightbulbIcon, AlertIcon } from "@/components/icons";
import { BrightnessSlider } from "@/components/controls/BrightnessSlider";
import { ColorTempSlider } from "@/components/controls/ColorTempSlider";

const COMMIT_DELAY = 400;

const eyebrow: React.CSSProperties = {
  fontFamily: "var(--tactus-font-sans)", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--tactus-text-faint)",
};

// Deep light control (redesign Phase 2) — a focused centred overlay opened
// from a RoomView light row. Capability-aware off LightState.colorMode,
// mirroring LightCard's logic exactly (this is the same device data, just a
// different presentation): "rgb" gets the COLORS swatch row, "temp" gets
// ColorTempSlider built from the device's own min/max_color_temp_kelvin,
// "brightness" gets neither.
export function LightSheet({ state, room, onToggle, onBrightness, onColor, onColorTemp, onClose }: {
  state: LightState; room: string;
  onToggle: (on: boolean) => void;
  onBrightness: (v: number) => void;
  onColor: (c: Color) => void;
  onColorTemp: (kelvin: number) => void;
  onClose: () => void;
}) {
  const { device, cardState, brightness, selectedColor, colorMode, colorTempKelvin, colorTempRange } = state;
  const isOn = cardState === "on", isPending = cardState === "pending", isError = cardState === "error";
  const accent = isError ? "#EF4444" : (isOn || isPending) ? (colorMode === "temp" && colorTempKelvin ? kelvinToHex(colorTempKelvin) : selectedColor.hex) : "#475569";
  const pulse = isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined;

  // Local optimistic values + debounce — same pattern as LightCard/RoomCard:
  // the slider updates instantly, the real service call fires once,
  // COMMIT_DELAY after the last move, so a drag doesn't flood HA with a
  // call per pixel.
  const [localBrightness, setLocalBrightness] = useState<number | null>(null);
  const [localKelvin, setLocalKelvin] = useState<number | null>(null);
  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kelvinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
    if (kelvinTimer.current) clearTimeout(kelvinTimer.current);
  }, []);

  const displayBrightness = localBrightness ?? brightness;
  const displayKelvin = localKelvin ?? colorTempKelvin ?? colorTempRange?.min ?? 3000;

  const handleBrightness = (v: number) => {
    setLocalBrightness(v);
    if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
    brightnessTimer.current = setTimeout(() => { onBrightness(v); setLocalBrightness(null); }, COMMIT_DELAY);
  };

  const handleColorTemp = (kelvin: number) => {
    setLocalKelvin(kelvin);
    if (kelvinTimer.current) clearTimeout(kelvinTimer.current);
    kelvinTimer.current = setTimeout(() => { onColorTemp(kelvin); setLocalKelvin(null); }, COMMIT_DELAY);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="flex flex-col gap-6 rounded-tactus-2xl p-6" style={{ width: 380, background: "var(--tactus-bg-raised)", border: isError ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--tactus-border-default)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-tactus-md size-[40px] shrink-0" style={{ background: withAlpha(accent, 0.13), animation: pulse }}>
              {isError
                ? <div className="size-[18px]"><AlertIcon stroke="var(--tactus-red)" /></div>
                : <div className="size-[20px]"><LightbulbIcon stroke={isOn ? accent : "var(--tactus-text-muted)"} /></div>}
            </div>
            <div className="flex flex-col gap-[2px]">
              <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 15, fontWeight: 600, color: "var(--tactus-text-primary)", lineHeight: 1 }}>{device}</p>
              <p style={{ fontFamily: "var(--tactus-font-sans)", fontSize: 12, color: "var(--tactus-text-muted)" }}>{room}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onToggle(!isOn)} disabled={isError || isPending}
              className="flex items-center px-[10px] py-[4px] rounded-full relative cursor-pointer disabled:cursor-default"
              style={{ background: withAlpha(accent, isOn ? 0.13 : 0.06), animation: pulse }}>
              <p className="text-[11px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOn ? accent : "var(--tactus-text-muted)" }}>
                {isError ? "ERROR" : isPending ? "SYNCING" : isOn ? "ON" : "OFF"}
              </p>
            </button>
            <button onClick={onClose} className="flex items-center justify-center rounded-full cursor-pointer hover:opacity-80 transition-opacity" style={{ width: 32, height: 32, background: "var(--tactus-bg-base)", border: "1px solid var(--tactus-border-default)" }}>
              <X size={14} color="var(--tactus-text-secondary)" />
            </button>
          </div>
        </div>

        {/* Brightness — always shown */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p style={eyebrow}>Brightness</p>
            <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 22, color: "var(--tactus-text-primary)" }}>{displayBrightness}<span style={{ fontSize: 13, color: "var(--tactus-text-muted)" }}>%</span></p>
          </div>
          <BrightnessSlider value={displayBrightness} onChange={handleBrightness} accent={accent} />
        </div>

        {/* Colour — rgb-capable lights only */}
        {colorMode === "rgb" && (
          <div className="flex flex-col gap-3">
            <p style={eyebrow}>Colour</p>
            <div className="flex gap-3 items-center">
              {COLORS.map((c) => (
                <button key={c.id} className="relative shrink-0 size-[32px] rounded-full cursor-pointer" onClick={() => onColor(c as Color)}>
                  <svg viewBox="0 0 32 32" fill="none" className="size-full">
                    {c.id === selectedColor.id && <rect x="1" y="1" width="30" height="30" rx="15" stroke={c.hex} strokeWidth="2" />}
                    <circle cx="16" cy="16" r="12" fill={c.hex} />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Warmth — colour-temp-only lights */}
        {colorMode === "temp" && colorTempRange && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p style={eyebrow}>Warmth</p>
              <p style={{ fontFamily: "var(--tactus-font-mono)", fontWeight: 300, fontSize: 16, color: "var(--tactus-text-primary)" }}>{displayKelvin}<span style={{ fontSize: 12, color: "var(--tactus-text-muted)" }}>K</span></p>
            </div>
            <ColorTempSlider value={displayKelvin} min={colorTempRange.min} max={colorTempRange.max} onChange={handleColorTemp} />
          </div>
        )}
      </div>
    </div>
  );
}
