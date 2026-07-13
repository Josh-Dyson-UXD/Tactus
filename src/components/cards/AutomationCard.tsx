import { useRef, useState, useEffect } from "react";
import { Zap, Play, Check } from "lucide-react";
import type { AutomationState } from "@/types";
import { withAlpha, relativeTime } from "@/lib/helpers";

const AMBER = "#F59E0B";
const RED = "#EF4444";
const RUN_PULSE_DURATION = 900;

export function AutomationCard({ automation, onToggle, onRun }: {
  automation: AutomationState;
  onToggle: (enable: boolean) => void;
  onRun: () => void;
}) {
  const { name, state, lastTriggered, status } = automation;
  const isOn = state === "on";
  const isUnavailable = state === "unavailable";
  const isPending = status === "pending";
  const isError = status === "error";

  // "Run now" has no HA confirmation to wait on (fire-and-forget), so the
  // only feedback is a brief local pulse, cleared automatically — mirrors
  // SceneCard's pattern, not lifted to app state.
  const [runPulsing, setRunPulsing] = useState(false);
  const runTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (runTimerRef.current) clearTimeout(runTimerRef.current); }, []);

  const handleRun = () => {
    onRun();
    setRunPulsing(true);
    if (runTimerRef.current) clearTimeout(runTimerRef.current);
    runTimerRef.current = setTimeout(() => setRunPulsing(false), RUN_PULSE_DURATION);
  };

  // isUnavailable (real HA device/integration failure) and isError (this
  // card's own toggle command timing out) are different failure modes but
  // read the same way to the user — both get the red/unreachable treatment.
  const unreachable = isUnavailable || isError;
  const accent = unreachable ? RED : isOn ? AMBER : "#475569";
  const accentLight = (isOn || isPending) && !unreachable ? withAlpha(accent, 0.13) : "var(--tactus-bg-hairline)";

  return (
    <div className="relative flex flex-col p-6 rounded-tactus-2xl w-full" style={{ background: isOn ? "var(--tactus-bg-raised)" : "var(--tactus-bg-base)", border: unreachable ? `1px solid ${withAlpha(RED, 0.4)}` : "1px solid var(--tactus-border-default)", minHeight: 180 }}>
      {/* Header */}
      <div className="flex items-start justify-between w-full mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center rounded-tactus-md size-[40px] shrink-0" style={{ background: accentLight, animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined }}>
            <Zap size={18} color={unreachable ? "var(--tactus-red)" : isOn ? accent : "var(--tactus-text-muted)"} />
          </div>
          <div className="flex flex-col gap-[2px] min-w-0">
            <p className="text-[16px] font-semibold leading-tight truncate" style={{ fontFamily: "var(--tactus-font-sans)", color: isOn ? "var(--tactus-text-primary)" : "var(--tactus-text-secondary)" }}>{name}</p>
            {unreachable && <p className="text-[11px] font-bold uppercase leading-none" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-red)" }}>Unreachable</p>}
          </div>
        </div>

        {/* Pill toggle */}
        <button onClick={() => onToggle(!isOn)} disabled={isPending || isUnavailable}
          className="relative shrink-0 cursor-pointer disabled:cursor-default"
          style={{ width: 44, height: 24, borderRadius: 9999, background: unreachable ? withAlpha(RED, 0.15) : isOn ? withAlpha(AMBER, 0.9) : "var(--tactus-bg-track)", transition: "background 0.2s ease", animation: isPending ? "tactus-pulse var(--tactus-motion-pending-pulse)" : undefined }}>
          <div style={{ position: "absolute", top: 3, left: isOn && !unreachable ? 23 : 3, width: 18, height: 18, borderRadius: 9999, background: "var(--tactus-text-primary)", transition: "left 0.2s ease", boxShadow: "0 1px 3px 0 rgba(0,0,0,0.4)" }} />
        </button>
      </div>

      {/* Last triggered */}
      <p className="text-[11px] uppercase font-semibold tracking-wider mb-1" style={{ fontFamily: "var(--tactus-font-sans)", color: "var(--tactus-text-faint)" }}>Last run</p>
      <p className="mb-4" style={{ fontFamily: "var(--tactus-font-mono)", color: "var(--tactus-text-secondary)", fontSize: 15, fontWeight: 600 }}>{relativeTime(lastTriggered)}</p>

      {/* Run now */}
      <button onClick={handleRun} disabled={isUnavailable}
        className="flex items-center justify-center gap-1.5 px-4 h-[36px] rounded-full cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-default disabled:opacity-40 mt-auto"
        style={{ background: runPulsing ? withAlpha(AMBER, 0.15) : "var(--tactus-bg-overlay)", border: `1px solid ${runPulsing ? withAlpha(AMBER, 0.4) : "var(--tactus-border-overlay)"}`, transition: "background 0.3s ease, border 0.3s ease", boxShadow: runPulsing ? `0 0 16px 0 ${withAlpha(AMBER, 0.2)}` : "none" }}>
        {runPulsing ? <Check size={13} color={AMBER} /> : <Play size={13} color="var(--tactus-text-secondary)" />}
        <p className="text-[12px] font-semibold" style={{ fontFamily: "var(--tactus-font-sans)", color: runPulsing ? AMBER : "var(--tactus-text-secondary)" }}>{runPulsing ? "Running" : "Run now"}</p>
      </button>
    </div>
  );
}
