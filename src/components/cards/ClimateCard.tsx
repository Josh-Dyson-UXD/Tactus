import { useState, useRef, useEffect } from "react";
import { Flame, Snowflake, Droplet, Wind, Power, ArrowLeftRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ClimateState, HvacMode } from "@/types";
import { withAlpha } from "@/lib/helpers";
import { AlertIcon } from "@/components/icons";

const COMMIT_DELAY = 400;

const MODE_COLOR: Record<HvacMode, string> = {
  heat: "var(--tactus-amber)",
  cool: "var(--tactus-blue)",
  dry: "var(--tactus-blue-light)",
  fan_only: "var(--tactus-text-secondary)",
  heat_cool: "var(--tactus-green)",
  off: "var(--tactus-text-muted)",
};

// withAlpha() needs a real hex value (it parses r/g/b out of the string),
// not a CSS var() — mirrors the hex-const-for-withAlpha pattern already used
// in SwitchCard/RoomCard. Values match theme.css's --tactus-* tokens above.
const MODE_HEX: Record<HvacMode, string> = {
  heat: "#F59E0B",
  cool: "#3B82F6",
  dry: "#93C5FD",
  fan_only: "#94a3b8",
  heat_cool: "#22C55E",
  off: "#475569",
};
const RED_HEX = "#EF4444";

const MODE_ICON: Record<Exclude<HvacMode, "off">, LucideIcon> = {
  heat: Flame,
  cool: Snowflake,
  dry: Droplet,
  fan_only: Wind,
  heat_cool: ArrowLeftRight, // implies heat↔cool
};

const MODE_LABEL: Record<Exclude<HvacMode, "off">, string> = {
  heat: "Heat",
  cool: "Cool",
  dry: "Dry",
  fan_only: "Fan",
  heat_cool: "Auto",
};

const ACTION_LABEL: Record<HvacMode, string> = {
  heat: "HEATING",
  cool: "COOLING",
  dry: "DRYING",
  fan_only: "FAN",
  heat_cool: "AUTO",
  off: "OFF",
};

const FAN_LABEL: Record<string, string> = {
  quiet: "Quiet", low: "Low", medium: "Medium", high: "High", auto: "Auto",
};

export function ClimateCard({ state, onTogglePower, onSetMode, onSetTemp, onSetFan }: {
  state: ClimateState;
  onTogglePower: (on: boolean) => void;
  onSetMode: (mode: HvacMode) => void;
  onSetTemp: (temp: number) => void;
  onSetFan: (fan: string) => void;
}) {
  const { device, mode, hvacModes, currentTemp, targetTemp, currentHumidity, minTemp, maxTemp, step, fanMode, fanModes, status } = state;
  const isOff = mode === "off";
  const isPending = status === "pending";
  const isError = status === "error";
  const accent = isError ? "var(--tactus-red)" : MODE_COLOR[mode];
  const accentHex = isError ? RED_HEX : MODE_HEX[mode];
  const pulse = isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined;

  // Local optimistic target temp + debounce, same pattern as RoomCard's
  // brightness — the stepper updates the numeral instantly on every tap, but
  // only calls onSetTemp once, COMMIT_DELAY after the last tap, so a fast
  // run of taps doesn't flood Sensibo with a set_temperature call each.
  const [localTemp, setLocalTemp] = useState<number | null>(null);
  const tempTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (tempTimer.current) clearTimeout(tempTimer.current); }, []);
  // Clear the local shadow once the real targetTemp prop confirms a value
  // that matches — otherwise a stale optimistic value could linger.
  useEffect(() => { if (localTemp !== null && targetTemp === localTemp) setLocalTemp(null); }, [targetTemp, localTemp]);

  const displayTemp = localTemp ?? targetTemp;

  const step_ = (delta: number) => {
    if (displayTemp === null) return;
    const next = Math.max(minTemp, Math.min(maxTemp, displayTemp + delta));
    setLocalTemp(next);
    if (tempTimer.current) clearTimeout(tempTimer.current);
    tempTimer.current = setTimeout(() => onSetTemp(next), COMMIT_DELAY);
  };

  const disabled = isOff || isPending || isError;

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl w-full" style={{
      background: isOff ? "var(--tactus-bg-base)" : "var(--tactus-bg-raised)",
      border: isError ? `1px solid ${withAlpha(RED_HEX, 0.4)}` : isOff ? "1px solid var(--tactus-border-default)" : `1px solid ${withAlpha(accentHex, 0.25)}`,
      boxShadow: !isOff && !isError ? `0 16px 40px 0 ${withAlpha(accentHex, 0.08)}` : "none",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between w-full mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px]" style={{ background: withAlpha(accentHex, isOff ? 0.06 : 0.13), animation: pulse }}>
            {isError
              ? <div className="size-[18px]"><AlertIcon stroke="var(--tactus-red)" /></div>
              : isOff
                ? <Power size={18} color="var(--tactus-text-muted)" />
                : (() => { const Icon = MODE_ICON[mode as Exclude<HvacMode, "off">]; return <Icon size={18} color={accent} />; })()}
          </div>
          <div className="flex flex-col gap-[2px]">
            <p className="text-[16px] font-semibold leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOff ? "var(--tactus-text-secondary)" : "var(--tactus-text-primary)" }}>{device}</p>
            <p className="text-[12px] leading-none mt-[2px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>Living Room</p>
          </div>
        </div>
        <button className="flex items-center px-[10px] py-[4px] rounded-full relative cursor-pointer disabled:cursor-default" style={{ background: withAlpha(accentHex, isOff ? 0.06 : 0.13), animation: pulse }}
          disabled={isPending} onClick={() => onTogglePower(isOff)}>
          <div aria-hidden className="absolute inset-0 rounded-full pointer-events-none" style={{ border: `1px solid ${withAlpha(accentHex, 0.25)}` }} />
          <p className="text-[11px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: isOff ? "var(--tactus-text-muted)" : accent }}>
            {isError ? "ERROR" : isPending ? "SYNCING" : ACTION_LABEL[mode]}
          </p>
        </button>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-6 mb-6" style={{ opacity: isOff ? 0.4 : 1, pointerEvents: isOff ? "none" : "auto" }}>
        <button className="flex items-center justify-center rounded-full cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-default" style={{ width: 52, height: 52, background: "var(--tactus-bg-base)", border: "1px solid var(--tactus-border-default)" }}
          disabled={disabled} onClick={() => step_(-step)}>
          <svg viewBox="0 0 24 24" fill="none" className="size-[20px]"><path d="M5 12h14" stroke="var(--tactus-text-secondary)" strokeLinecap="round" strokeWidth="2" /></svg>
        </button>

        <div className="flex flex-col items-center" style={{ minWidth: 96 }}>
          <p style={{ fontFamily: "var(--tactus-font-mono)", color: accent, fontSize: 56, fontWeight: 600, lineHeight: 1, textAlign: "center", minWidth: 96 }}>
            {displayTemp !== null ? displayTemp : "—"}
          </p>
          <p className="mt-1" style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-muted)", fontSize: 13 }}>
            {currentTemp !== null ? `${currentTemp}°` : "—"}
          </p>
        </div>

        <button className="flex items-center justify-center rounded-full cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-default" style={{ width: 52, height: 52, background: "var(--tactus-bg-base)", border: "1px solid var(--tactus-border-default)" }}
          disabled={disabled} onClick={() => step_(step)}>
          <svg viewBox="0 0 24 24" fill="none" className="size-[20px]"><path d="M12 5v14M5 12h14" stroke="var(--tactus-text-secondary)" strokeLinecap="round" strokeWidth="2" /></svg>
        </button>
      </div>

      {/* Mode row */}
      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${hvacModes.length}, 1fr)`, opacity: isOff ? 0.4 : 1, pointerEvents: isOff ? "none" : "auto" }}>
        {hvacModes.map((m) => {
          const active = m === mode;
          const Icon = MODE_ICON[m];
          const color = MODE_COLOR[m];
          const colorHex = MODE_HEX[m];
          return (
            <button key={m} disabled={disabled} onClick={() => onSetMode(m)}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-tactus-md cursor-pointer hover:opacity-90 transition-opacity disabled:cursor-default"
              style={{ background: active ? withAlpha(colorHex, 0.13) : "var(--tactus-bg-base)", border: active ? `1px solid ${withAlpha(colorHex, 0.3)}` : "1px solid var(--tactus-border-default)" }}>
              <Icon size={16} color={active ? color : "var(--tactus-text-muted)"} />
              <p className="text-[10px] font-semibold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: active ? color : "var(--tactus-text-muted)" }}>{MODE_LABEL[m]}</p>
            </button>
          );
        })}
      </div>

      {/* Fan row — a segmented control, deliberately different shape from the mode tiles above */}
      {fanModes.length > 0 && (
        <div className="flex items-center gap-3 mb-6" style={{ opacity: isOff ? 0.4 : 1, pointerEvents: isOff ? "none" : "auto" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Fan</p>
          <div className="flex items-center flex-1 p-[3px] rounded-full" style={{ background: "var(--tactus-bg-base)", border: "1px solid var(--tactus-border-default)" }}>
            {fanModes.map((f) => {
              const active = f === fanMode;
              return (
                <button key={f} disabled={disabled} onClick={() => onSetFan(f)}
                  className="flex-1 flex items-center justify-center py-[6px] rounded-full cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-default"
                  style={{ background: active ? accent : "transparent" }}>
                  <p className="text-[10px] font-semibold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: active ? "var(--tactus-bg-base)" : "var(--tactus-text-muted)" }}>{FAN_LABEL[f] ?? f}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-end pt-4" style={{ borderTop: "1px solid var(--tactus-border-default)" }}>
        <p className="text-[12px]" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-muted)" }}>
          {currentHumidity !== null ? `${currentHumidity}% humidity` : "—"}
        </p>
      </div>
    </div>
  );
}
